#!/usr/bin/env node
// 국가유산청(Korea Heritage Service) Open API 수집 스크립트 (의존성 0, Node 18+)
//
// 목적: 시대별 "건축물(유적건조물)" 갤러리용 데이터셋 생성.
//   - 목록 API(SearchKindOpenapiList)는 종목(ccbaKdcd)·시도(ccbaCtcd)만 필터 가능하고
//     시대/분류/이미지는 주지 않는다. 따라서 목록으로 키만 모은 뒤 상세 API
//     (SearchKindOpenapiDt)로 시대(ccceName)·분류(gcodeName)·대표이미지(imageUrl)를 얻고,
//     gcodeName 이 "유적건조물" 인 항목만 남긴다.
//   - 개별 이미지 다건/캡션은 CORS 가 허용되므로 프론트 상세페이지에서 실시간 호출한다.
//
// 산출물: apps/korea-heritage/data/heritage.json
//
// 환경변수(선택):
//   KINDS       수집할 지정종목코드 CSV (기본 "11,13,12" = 국보·사적·보물 순)
//   MAX_DETAILS 상세 호출 총량 상한 (기본 1200) — API 과호출 방지
//   DELAY_MS    상세 호출 간 지연 ms (기본 70)
//   PAGE_UNIT   목록 페이지당 건수 (기본 300)

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://www.khs.go.kr/cha";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = `${__dirname}/../data/heritage.json`;

const KINDS = (process.env.KINDS || "11,13,12").split(",").map((s) => s.trim()).filter(Boolean);
const MAX_DETAILS = Number(process.env.MAX_DETAILS || 1200);
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
      // 유적건조물(건축·구조물: 건물/탑/성곽/비석/다리 등)만 + 대표이미지 보유분
      if (d.gcodeName.includes("건조물") && d.imageUrl) {
        const era = classifyEra(d.ccceName);
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
        console.log(`[harvest] 진행 ${detailCalls} 상세호출 / 건축물 ${kept}건 수집`);
      }
      await sleep(DELAY_MS);
    }
  }

  // 시대순 → 종목 → 이름 정렬
  collected.sort((a, b) => {
    const ea = ERA_INDEX[a.era] - ERA_INDEX[b.era];
    if (ea !== 0) return ea;
    const ya = (a.year ?? 99999) - (b.year ?? 99999);
    if (ya !== 0) return ya;
    return a.name.localeCompare(b.name, "ko");
  });

  const byEra = {};
  for (const e of ERAS) byEra[e.key] = 0;
  for (const c of collected) byEra[c.era]++;

  const dataset = {
    source: "국가유산청(Korea Heritage Service) Open API",
    sourceUrl: "https://www.khs.go.kr/",
    license: "공공누리(항목별 유형 상이) — 출처표시 후 이용",
    generatedAt: new Date().toISOString(),
    eras: ERAS,
    counts: { total: collected.length, byEra },
    items: collected,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(dataset, null, 2), "utf8");
  console.log(`[harvest] 완료: 총 상세호출 ${detailCalls}, 건축물 ${collected.length}건 → ${OUT}`);
  console.log(`[harvest] 시대분포:`, byEra);
}

main().catch((e) => {
  console.error("[harvest] 치명적 오류:", e);
  process.exit(1);
});
