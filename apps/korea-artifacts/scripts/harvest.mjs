#!/usr/bin/env node
// 국가유산청(Korea Heritage Service) Open API 수집 스크립트 — 유물편 (의존성 0, Node 18+)
//
// 목적: 시대 × 유형별 "유물(동산문화유산)" 갤러리용 데이터셋 생성.
//   도자기·조각·조형물·회화·금속공예 등은 모두 상세 API 의 gcodeName="유물" 아래에 있다.
//   (자매 앱 korea-heritage 는 gcodeName="유적건조물" 만 모은다 — 건축·구조물 전용.)
//   - 목록 API(SearchKindOpenapiList)는 종목(ccbaKdcd)만 필터 가능하고 시대/분류/이미지는 주지 않는다.
//     따라서 목록으로 키만 모은 뒤 상세 API(SearchKindOpenapiDt)로 분류(g/b/m/scodeName)·
//     시대(ccceName)·대표이미지(imageUrl)를 얻고, gcodeName 이 "유물" 인 항목만 남긴다.
//   - 개별 이미지 다건/캡션은 CORS 가 허용되므로 프론트 상세페이지에서 실시간 호출한다.
//
// 산출물: apps/korea-artifacts/data/artifacts.json
//
// 환경변수(선택):
//   KINDS       수집할 지정종목코드 CSV (기본 "11,12" = 국보·보물 — 유물이 가장 많은 종목)
//   MAX_DETAILS 상세 호출 총량 상한 (기본 4000) — 보물 도자기/조각 후반부까지 커버
//   DELAY_MS    상세 호출 간 지연 ms (기본 70)
//   PAGE_UNIT   목록 페이지당 건수 (기본 300)

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://www.khs.go.kr/cha";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = `${__dirname}/../data/artifacts.json`;

const KINDS = (process.env.KINDS || "11,12").split(",").map((s) => s.trim()).filter(Boolean);
const MAX_DETAILS = Number(process.env.MAX_DETAILS || 4000);
const DELAY_MS = Number(process.env.DELAY_MS || 70);
const PAGE_UNIT = Number(process.env.PAGE_UNIT || 300);

const KIND_LABEL = { "11": "국보", "12": "보물", "13": "사적", "15": "명승" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- 작은 XML 헬퍼 (CDATA 인지, 통제된 응답이라 정규식으로 충분) ---
function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}>(?:\\s*<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>\\s*)?</${name}>`));
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}
function items(xml) {
  const out = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}

async function getText(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/xml" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(400 * (attempt + 1));
    }
  }
}

// --- 시대(ccceName 자유텍스트) → 시대 버킷 매핑 ---
// 표시 순서(고대→근대). key 는 안정 식별자, label 은 화면 표기.
const ERAS = [
  { key: "prehistoric", label: "선사" },
  { key: "three-kingdoms", label: "삼국" },
  { key: "unified-silla", label: "통일신라·발해" },
  { key: "goryeo", label: "고려" },
  { key: "joseon", label: "조선" },
  { key: "modern", label: "대한제국·근대" },
  { key: "unknown", label: "시대미상" },
];
const ERA_INDEX = Object.fromEntries(ERAS.map((e, i) => [e.key, i]));

function parseYear(s) {
  // "조선 고종 6년(1869)" → 1869, "기원전 57년" → -57
  const bc = /기원전\s*(\d{1,4})/.exec(s);
  if (bc) return -Number(bc[1]);
  const paren = /\((\d{3,4})\)/.exec(s);
  if (paren) return Number(paren[1]);
  const yr = /(\d{3,4})\s*년/.exec(s);
  if (yr) return Number(yr[1]);
  // 세기 표기: "15세기", "7c", "3C후반" → 해당 세기 중반 연도로 근사
  const cen = /(\d{1,2})\s*(?:세기|[cC])/.exec(s);
  if (cen) return (Number(cen[1]) - 1) * 100 + 50;
  // 단독 4자리 연도("1907")
  const bare = /\b(1\d{3})\b/.exec(s);
  if (bare) return Number(bare[1]);
  return null;
}

function classifyEra(ccceName) {
  const s = (ccceName || "").replace(/\s+/g, "");
  const year = parseYear(ccceName || "");
  // 키워드 우선 (부분문자열 충돌 주의: 통일신라 → 신라 전에, 대한제국·근대 → 조선 전에)
  if (/통일신라|남북국/.test(s)) return { key: "unified-silla", year };
  if (/발해/.test(s)) return { key: "unified-silla", year };
  if (/대한제국|광무|융희|일제강점|근대|대한민국|개항/.test(s)) return { key: "modern", year };
  if (/조선/.test(s)) return { key: "joseon", year };
  if (/고려/.test(s)) return { key: "goryeo", year };
  if (/고구려|백제|가야|삼한|삼국|신라|원삼국/.test(s)) return { key: "three-kingdoms", year };
  if (/청동|철기|구석기|신석기|선사|초기국가/.test(s)) return { key: "prehistoric", year };
  // 연도 폴백
  if (year != null) {
    if (year >= 1897) return { key: "modern", year };
    if (year >= 1392) return { key: "joseon", year };
    if (year >= 936) return { key: "goryeo", year };
    if (year >= 676) return { key: "unified-silla", year };
    if (year >= 1) return { key: "three-kingdoms", year };
    return { key: "prehistoric", year };
  }
  return { key: "unknown", year: null };
}

// --- 유형(분류 코드명 + 이름) → 유형 버킷 매핑 ---
// 표시 순서. key 는 안정 식별자, label 은 화면 표기.
const TYPES = [
  { key: "ceramics", label: "도자기·토기" },
  { key: "sculpture", label: "조각·조형" },
  { key: "painting", label: "회화·서화" },
  { key: "metalcraft", label: "금속·공예" },
  { key: "etc", label: "기타 유물" },
];
const TYPE_INDEX = Object.fromEntries(TYPES.map((t, i) => [t.key, i]));

function classifyType(d) {
  const b = d.bcodeName || ""; // 중분류: 불교조각/일반조각/생활공예/회화/서예 등
  const m = d.mcodeName || ""; // 소분류: 토도자공예/금속공예/목칠공예/금속조/석조 등
  const s = d.scodeName || "";
  const n = d.name || "";
  const meta = `${b} ${m} ${s}`;
  // 도자기·토기: 토도자공예 또는 청자/백자/분청/토기/도기 등 (코드 우선, 이름 보조)
  if (/토도자|도자|청자|백자|분청|토기|도기|옹기/.test(meta) || /청자|백자|분청사기|토기|도기|항아리|자기/.test(n))
    return "ceramics";
  // 조각·조형: 불교조각/일반조각, 또는 금속조/석조/목조/소조
  if (/조각/.test(b) || /금속조|석조|목조|소조|조소/.test(m) || /불상|보살|반가사유|석불|마애/.test(n))
    return "sculpture";
  // 회화·서화: 회화/서예
  if (/회화|서예|서화/.test(b) || /불화|초상|병풍|그림|글씨|첩/.test(n)) return "painting";
  // 금속·공예: 생활공예(도자 제외)/과학기술/금속공예/목칠공예 등
  if (/공예|과학|금속|목칠|칠기/.test(meta) || /범종|동종|향로|향완|정병|사리|운판|동경|동탁/.test(n))
    return "metalcraft";
  return "etc";
}

const httpsImg = (u) => (u ? u.replace(/^http:\/\//i, "https://") : "");

async function listKeys(kdcd) {
  const keys = [];
  let page = 1;
  for (;;) {
    const url = `${BASE}/SearchKindOpenapiList.do?ccbaKdcd=${kdcd}&pageUnit=${PAGE_UNIT}&pageIndex=${page}`;
    const xml = await getText(url);
    const total = Number(tag(xml, "totalCnt") || 0);
    const rows = items(xml);
    for (const it of rows) {
      keys.push({
        kdcd: tag(it, "ccbaKdcd"),
        ctcd: tag(it, "ccbaCtcd"),
        asno: tag(it, "ccbaAsno"),
      });
    }
    if (page * PAGE_UNIT >= total || rows.length === 0) break;
    page++;
    await sleep(DELAY_MS);
  }
  return keys;
}

async function fetchDetail(k) {
  const url = `${BASE}/SearchKindOpenapiDt.do?ccbaKdcd=${k.kdcd}&ccbaAsno=${k.asno}&ccbaCtcd=${k.ctcd}`;
  const xml = await getText(url);
  const it = items(xml)[0] || xml;
  return {
    gcodeName: tag(it, "gcodeName"),
    bcodeName: tag(it, "bcodeName"),
    mcodeName: tag(it, "mcodeName"),
    scodeName: tag(it, "scodeName"),
    name: tag(it, "ccbaMnm1"),
    hanja: tag(it, "ccbaMnm2"),
    ccceName: tag(it, "ccceName"),
    quantity: tag(it, "ccbaQuan"),
    location: tag(it, "ccbaLcad"),
    region: tag(it, "ccbaCtcdNm"),
    city: tag(it, "ccsiName"),
    imageUrl: httpsImg(tag(it, "imageUrl")),
    content: tag(it, "content"),
    lng: Number(tag(xml, "longitude")) || null,
    lat: Number(tag(xml, "latitude")) || null,
  };
}

async function main() {
  console.log(`[harvest] kinds=${KINDS.join(",")} maxDetails=${MAX_DETAILS} delay=${DELAY_MS}ms`);
  const collected = [];
  let detailCalls = 0;
  let kept = 0;

  outer: for (const kdcd of KINDS) {
    const keys = await listKeys(kdcd);
    console.log(`[harvest] 종목 ${KIND_LABEL[kdcd] || kdcd}(${kdcd}): 목록 ${keys.length}건`);
    for (const k of keys) {
      if (detailCalls >= MAX_DETAILS) {
        console.log(`[harvest] MAX_DETAILS(${MAX_DETAILS}) 도달 — 중단`);
        break outer;
      }
      let d;
      try {
        d = await fetchDetail(k);
      } catch (e) {
        console.warn(`[harvest] 상세 실패 ${k.kdcd}-${k.ctcd}-${k.asno}: ${e.message}`);
        detailCalls++;
        await sleep(DELAY_MS);
        continue;
      }
      detailCalls++;
      // 유물(동산문화유산: 도자기/조각/회화/공예 등)만 + 대표이미지 보유분
      if (d.gcodeName.includes("유물") && d.imageUrl) {
        const era = classifyEra(d.ccceName);
        const type = classifyType(d);
        collected.push({
          id: `${k.kdcd}-${k.ctcd}-${k.asno}`,
          kdcd: k.kdcd,
          ctcd: k.ctcd,
          asno: k.asno,
          kind: KIND_LABEL[k.kdcd] || k.kdcd,
          name: d.name,
          hanja: d.hanja,
          era: era.key,
          eraLabel: ERAS[ERA_INDEX[era.key]].label,
          eraRaw: d.ccceName,
          year: era.year,
          type,
          typeLabel: TYPES[TYPE_INDEX[type]].label,
          category: [d.gcodeName, d.bcodeName, d.mcodeName, d.scodeName].filter(Boolean).join(" > "),
          region: d.region,
          city: d.city,
          location: d.location,
          quantity: d.quantity,
          lat: d.lat,
          lng: d.lng,
          thumb: d.imageUrl,
          desc: d.content,
        });
        kept++;
      }
      if (detailCalls % 50 === 0) {
        console.log(`[harvest] 진행 ${detailCalls} 상세호출 / 유물 ${kept}건 수집`);
      }
      await sleep(DELAY_MS);
    }
  }

  // 시대순 → 유형 → 이름 정렬
  collected.sort((a, b) => {
    const ea = ERA_INDEX[a.era] - ERA_INDEX[b.era];
    if (ea !== 0) return ea;
    const ya = (a.year ?? 99999) - (b.year ?? 99999);
    if (ya !== 0) return ya;
    const ta = TYPE_INDEX[a.type] - TYPE_INDEX[b.type];
    if (ta !== 0) return ta;
    return a.name.localeCompare(b.name, "ko");
  });

  const byEra = {};
  for (const e of ERAS) byEra[e.key] = 0;
  const byType = {};
  for (const t of TYPES) byType[t.key] = 0;
  for (const c of collected) {
    byEra[c.era]++;
    byType[c.type]++;
  }

  const dataset = {
    source: "국가유산청(Korea Heritage Service) Open API",
    sourceUrl: "https://www.khs.go.kr/",
    license: "공공누리(항목별 유형 상이) — 출처표시 후 이용",
    generatedAt: new Date().toISOString(),
    eras: ERAS,
    types: TYPES,
    counts: { total: collected.length, byEra, byType },
    items: collected,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(dataset, null, 2), "utf8");
  console.log(`[harvest] 완료: 총 상세호출 ${detailCalls}, 유물 ${collected.length}건 → ${OUT}`);
  console.log(`[harvest] 시대분포:`, byEra);
  console.log(`[harvest] 유형분포:`, byType);
}

main().catch((e) => {
  console.error("[harvest] 치명적 오류:", e);
  process.exit(1);
});
