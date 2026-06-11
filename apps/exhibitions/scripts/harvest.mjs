#!/usr/bin/env node
// 전국 전시 정보 수집 (KCISA 문화포털 공연·전시 API_CCA_145, 의존성 0, Node 18+)
//
// 매일 야간 배치(맥미니 launchd)로 실행 → 진행중·예정 미술 전시를 모아
// apps/exhibitions/data/exhibitions.json 생성. 키는 .env(EXHIBITIONS_API_KEY)에서만 읽고
// 브라우저엔 절대 안 나간다(정적 JSON 만 서빙).
//
// 주의(스키마 실측 기반):
//   - GENRE 필드는 미술 장르가 아니라 상태값(과거/현재/예정전시)이다 → 장르는 제목·설명으로 분류.
//   - 기간은 PERIOD 또는 EVENT_PERIOD(둘 중 하나) 자유텍스트 → 날짜 2개를 정규식으로 추출.
//   - 이미지(IMAGE_OBJECT)는 약 절반만 존재, 대부분 https(http 는 https 로 승격).
//   - URL(원문 링크)은 거의 항상 존재 → 포스터 재호스팅 없이 "원문 보기" 링크아웃.
//
// 환경변수: EXHIBITIONS_API_KEY(필수), PAGE_UNIT(기본 500), DELAY_MS(기본 120)

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const KEY = process.env.EXHIBITIONS_API_KEY;
if (!KEY) {
  console.error("[harvest] EXHIBITIONS_API_KEY 미설정 — .env 확인");
  process.exit(1);
}
const BASE = "https://api.kcisa.kr/openapi/API_CCA_145/request";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = `${__dirname}/../data/exhibitions.json`;
const PAGE_UNIT = Number(process.env.PAGE_UNIT || 500);
const DELAY_MS = Number(process.env.DELAY_MS || 120);
const PAST_DAYS = Number(process.env.PAST_DAYS || 180); // 지난 전시: 최근 N일 이내 종료분만 포함

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- XML 헬퍼 ---
function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : "";
}
function items(xml) {
  const out = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}
async function getText(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/xml" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (i === 3) throw e;
      await sleep(600 * (i + 1));
    }
  }
}

// HTML/이중 이스케이프 → 평문 한 줄
function clean(s) {
  if (!s) return "";
  let t = s;
  for (let i = 0; i < 2; i++) {
    t = t
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&middot;/g, "·")
      .replace(/&nbsp;/g, " ");
  }
  return t.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

// XML 엔티티 디코드(특히 URL 의 &amp; → & — 안 하면 쿼리 파라미터가 깨져 404/400).
const decodeEnt = (s) =>
  (s || "").replace(/&amp;/g, "&").replace(/&#0*38;/g, "&").replace(/&#x0*26;/gi, "&");

const httpsImg = (u) => (u ? decodeEnt(u).trim().replace(/^http:\/\//i, "https://") : "");

// DESCRIPTION(이중 이스케이프 HTML) 안의 첫 <img src> 추출 — IMAGE_OBJECT 가 없을 때 폴백.
function imgFromDesc(raw) {
  if (!raw) return "";
  let t = raw;
  for (let i = 0; i < 2; i++) {
    t = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
  }
  const m = t.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
  return m ? m[1].trim() : "";
}

// 기간 자유텍스트 → {start,end} (YYYY-MM-DD). 날짜 2개 추출(시작/종료).
function parseDates(...texts) {
  for (const s of texts) {
    if (!s) continue;
    const ds = [...s.matchAll(/(\d{4})[-.\/]\s*(\d{1,2})[-.\/]\s*(\d{1,2})/g)].map(
      (m) => `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`
    );
    if (ds.length) return { start: ds[0], end: ds[ds.length - 1] };
  }
  return null;
}

// --- 장르 버킷(제목+설명 키워드, 위에서부터 우선) ---
const GENRES = [
  { key: "photo-media", label: "사진·미디어", kw: /사진|포토|영상|미디어|비디오|뉴미디어|디지털아트|실감|VR|AR/ },
  { key: "craft-design", label: "공예·디자인", kw: /공예|도자|도예|자기|청자|백자|분청|금속공예|목공|유리|섬유|칠기|디자인|가구|건축/ },
  { key: "calligraphy", label: "서예·서화", kw: /서예|서화|캘리그라|문인화|전각|서첩|한글서/ },
  { key: "sculpture", label: "조각·설치", kw: /조각|설치미술|조형|입체|오브제|키네틱/ },
  { key: "painting", label: "회화·드로잉", kw: /회화|그림|드로잉|페인팅|수채|유화|한국화|민화|초상화|산수|채색|판화/ },
  { key: "history", label: "역사·유물", kw: /유물|문화재|국보|보물|발굴|고고|왕실|고분|불교미술|복식|민속|역사|기증품/ },
];
const GENRE_ETC = { key: "etc", label: "현대·기획·기타" };
const ALL_GENRES = [...GENRES, GENRE_ETC];

function classifyGenre(title, desc) {
  const hay = `${title} ${desc}`;
  for (const g of GENRES) if (g.kw.test(hay)) return g.key;
  return "etc";
}

// --- 지역(기관명 기반) ---
const REGIONS = [
  ["제주", /제주/], ["부산", /부산/], ["대구", /대구/], ["광주", /광주|아시아문화전당/],
  ["대전", /대전/], ["인천", /인천/], ["울산", /울산/], ["세종", /세종/],
  ["경북", /경주|경북|안동|상주|포항/], ["경남", /진주|경남|창원|김해|통영/],
  ["전북", /전주|전북|익산|군산/], ["전남", /나주|전남|순천|목포|여수/],
  ["충북", /청주|충북|제천|충주/], ["충남", /공주|부여|충남|천안|서산/],
  ["강원", /춘천|강원|원주|강릉|속초/], ["경기", /수원|경기|과천|용인|성남|고양|안산/],
];
function regionOf(inst, site) {
  const s = `${inst || ""} ${site || ""}`;
  for (const [label, re] of REGIONS) if (re.test(s)) return label;
  return "서울"; // 국립중앙박물관·국립현대미술관·예술의전당·한글박물관 등 기본
}

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function main() {
  const now = new Date();
  const today = ymd(now);
  const pastCutoff = ymd(new Date(now.getTime() - PAST_DAYS * 86400000)); // 지난 전시 하한
  console.log(`[harvest] 기준일 ${today}, 지난전시 하한 ${pastCutoff}(${PAST_DAYS}일), pageUnit=${PAGE_UNIT}`);

  // 1페이지로 totalCount 파악
  const first = await getText(`${BASE}?serviceKey=${KEY}&numOfRows=${PAGE_UNIT}&pageNo=1`);
  const total = Number(tag(first, "totalCount") || 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_UNIT));
  console.log(`[harvest] 전체 ${total}건 / ${pages}페이지`);

  const raw = [...items(first)];
  for (let pg = 2; pg <= pages; pg++) {
    await sleep(DELAY_MS);
    try {
      raw.push(...items(await getText(`${BASE}?serviceKey=${KEY}&numOfRows=${PAGE_UNIT}&pageNo=${pg}`)));
    } catch (e) {
      console.warn(`[harvest] 페이지 ${pg} 실패: ${e.message}`);
    }
  }
  console.log(`[harvest] 수집 원본 ${raw.length}건`);

  const collected = [];
  const seen = new Set();
  for (const it of raw) {
    const title = clean(tag(it, "TITLE"));
    if (!title) continue;
    const inst = clean(tag(it, "CNTC_INSTT_NM"));
    const site = clean(tag(it, "EVENT_SITE"));
    const url = decodeEnt(tag(it, "URL")).trim();
    const statusRaw = tag(it, "GENRE").trim(); // 과거/현재/예정전시 등
    const dates = parseDates(tag(it, "PERIOD"), tag(it, "EVENT_PERIOD"), tag(it, "DESCRIPTION"));

    // 상태: 진행중/예정/지난(최근 PAST_DAYS 이내 종료분). 날짜 없으면 상태값으로 판단.
    let status;
    if (dates) {
      if (dates.end >= today) status = dates.start > today ? "upcoming" : "ongoing";
      else if (dates.end >= pastCutoff) status = "ended"; // 최근 종료분만 "지난"
      else continue; // 오래된 과거 전시 제외
    } else {
      if (/예정/.test(statusRaw)) status = "upcoming";
      else if (/현재/.test(statusRaw)) status = "ongoing";
      else continue; // 과거(날짜 없음)는 윈도우 판단 불가 → 제외
    }

    const rawDesc = tag(it, "DESCRIPTION");
    const desc = clean(rawDesc).slice(0, 400);
    // 이미지: IMAGE_OBJECT 우선, 없으면 DESCRIPTION 내 <img>. https 가 아니면(상대/프로토콜상대) 버림(mixed-content/깨짐 방지).
    const rawThumb = httpsImg(tag(it, "IMAGE_OBJECT")) || httpsImg(imgFromDesc(rawDesc));
    const thumb = /^https:\/\//.test(rawThumb) ? rawThumb : "";
    const key = `${title}|${inst}`;
    if (seen.has(key)) continue; // 중복 제거
    seen.add(key);

    collected.push({
      id: `${tag(it, "LOCAL_ID").trim() || seen.size}-${status}`,
      title,
      institution: inst,
      site,
      region: regionOf(inst, site),
      genre: classifyGenre(title, desc),
      genreLabel: ALL_GENRES.find((g) => g.key === classifyGenre(title, desc)).label,
      status, // ongoing | upcoming
      start: dates?.start || null,
      end: dates?.end || null,
      charge: clean(tag(it, "CHARGE")),
      thumb,
      url,
      desc,
    });
  }

  // 정렬: 진행중 → 예정 → 지난. 진행중·예정은 시작 임박순, 지난은 최근 종료순.
  const order = { ongoing: 0, upcoming: 1, ended: 2 };
  collected.sort((a, b) => {
    const s = order[a.status] - order[b.status];
    if (s !== 0) return s;
    if (a.status === "ended") return (a.end || "") < (b.end || "") ? 1 : -1; // 최근 종료 먼저
    return (a.start || "9999") < (b.start || "9999") ? -1 : 1;
  });

  const byGenre = {}, byRegion = {}, byStatus = { ongoing: 0, upcoming: 0, ended: 0 };
  for (const g of ALL_GENRES) byGenre[g.key] = 0;
  for (const c of collected) {
    byGenre[c.genre]++;
    byRegion[c.region] = (byRegion[c.region] || 0) + 1;
    byStatus[c.status]++;
  }

  const dataset = {
    source: "한국문화정보원 문화포털 공연·전시 정보 (KCISA API_CCA_145)",
    sourceUrl: "https://www.culture.go.kr/",
    license: "공공누리(출처표시) — 포스터/원문은 각 기관 소유, 링크아웃",
    generatedAt: new Date().toISOString(),
    today,
    genres: ALL_GENRES.map((g) => ({ key: g.key, label: g.label })),
    counts: { total: collected.length, byGenre, byRegion, byStatus },
    items: collected,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(dataset, null, 2), "utf8");
  console.log(`[harvest] 완료: 진행중+예정 ${collected.length}건 → ${OUT}`);
  console.log(`[harvest] 상태:`, byStatus);
  console.log(`[harvest] 장르:`, byGenre);
}

main().catch((e) => {
  console.error("[harvest] 치명적 오류:", e);
  process.exit(1);
});
