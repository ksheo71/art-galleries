import { parseYear } from "./util.js";

// Yale LUX (Linked Art) API. 무키 + CORS. 검색은 객체 *참조*만 반환하므로
// 각 객체 JSON 을 추가로 fetch 해서 카드/상세를 구성한다(N+1, 병렬화로 완화).
const DATA_BASE = "https://lux.collections.yale.edu/data";
const SEARCH_BASE = "https://lux.collections.yale.edu/api/search/item";

// classified_as 개념 ID — 랜덤 갤러리를 "회화(Paintings)"로 한정해 화사한(색감 풍부한)
// 작품 위주로 보여준다(고고학 흑백사진 등 잡음 제거). 회화 ~8,000점.
const CONCEPT_PAINTINGS =
  "https://lux.collections.yale.edu/data/concept/6704e42b-3ee0-4bbe-a7d6-60696fb4817f";

// 그리드 한 페이지를 객체 N개 병렬 fetch 로 채우므로, 페이지 크기를 작게 유지한다.
const GRID_PAGE = 12;

function ok(data, pagination) {
  return pagination ? { ok: true, data, pagination } : { ok: true, data };
}
function err(kind, message, status) {
  return { ok: false, error: { kind, message, status } };
}

function uuidOf(uri) {
  if (!uri) return null;
  const m = String(uri).match(/\/data\/[a-z]+\/([0-9a-f-]+)/i);
  return m ? m[1] : String(uri).split("/").pop();
}

// LUX 검색 쿼리(JSON) 를 URL 로 만들어 GET. 실패 시 {ok:false} 반환.
async function searchRefs(queryObj, { page = 1, pageLength = GRID_PAGE } = {}) {
  const url = new URL(SEARCH_BASE);
  url.searchParams.set("q", JSON.stringify(queryObj));
  url.searchParams.set("page", page);
  url.searchParams.set("pageLength", pageLength);
  try {
    const resp = await fetch(url.toString());
    if (!resp.ok) return err("http", `HTTP ${resp.status}`, resp.status);
    const json = await resp.json();
    const refs = (json.orderedItems ?? []).map((i) => i.id).filter(Boolean);
    const total = json.partOf?.[0]?.totalItems ?? refs.length;
    return { ok: true, refs, total };
  } catch (e) {
    return err("network", e?.message ?? "Network error");
  }
}

// 단일 객체 JSON fetch. 개별 실패는 null 로(그리드 전체를 깨지 않는다).
async function fetchJson(uri) {
  try {
    const resp = await fetch(uri);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// ── 이미지/IIIF ──────────────────────────────────────────────────────────────
// 객체의 representation access_point 들 중 첫 이미지 URL.
function firstImageUrl(record) {
  for (const r of record.representation ?? []) {
    for (const ds of r.digitally_shown_by ?? []) {
      for (const ap of ds.access_point ?? []) {
        if (ap?.id) return ap.id;
      }
    }
  }
  return null;
}

// 이미지 URL 이 IIIF Image API 형태면 서비스 베이스(…/iiif/N/<id>) 를 돌려준다.
function iiifServiceFromUrl(url) {
  const m = String(url ?? "").match(/^(https?:\/\/.+?\/iiif\/\d+\/[^/]+)\/full\//);
  return m ? m[1] : null;
}

// 미디어 썸네일(…/thumbnail/<unit>/obj/<num>) → IIIF Presentation 매니페스트 URL.
function manifestUrlFromThumb(url) {
  if (!url || !url.includes("media.collections.yale.edu/thumbnail/")) return null;
  return url.replace(
    "media.collections.yale.edu/thumbnail/",
    "manifests.collections.yale.edu/"
  );
}

// viewer.js 가 호출: imageId 는 IIIF Image 서비스 베이스 URL. info.json 으로 딥줌.
export function iiifInfoJson(imageId) {
  if (!imageId) return null;
  return `${imageId}/info.json`;
}
export function iiifThumbUrl(imageId, width = 400) {
  if (!imageId) return null;
  return `${imageId}/full/!${width},${width}/0/default.jpg`;
}

// ── 레코드 정규화 ────────────────────────────────────────────────────────────
function statement(record, label) {
  for (const x of record.referred_to_by ?? []) {
    if ((x.classified_as ?? []).some((c) => c._label === label)) return x.content || "";
  }
  return "";
}

function primaryTitle(record) {
  for (const idf of record.identified_by ?? []) {
    if (
      idf.type === "Name" &&
      (idf.classified_as ?? []).some((c) => c._label === "Primary Title")
    ) {
      return idf.content || record._label || "Untitled";
    }
  }
  return record._label || "Untitled";
}

function primaryArtist(record) {
  const pb = record.produced_by || {};
  const parts = [pb, ...(pb.part ?? [])];
  for (const p of parts) {
    for (const c of p.carried_out_by ?? []) {
      const raw = c._label;
      if (typeof raw === "string" && raw.trim()) {
        // "Artist: Claude Monet (French, 1840–1926)" → "Claude Monet"
        return raw
          .replace(/^[^:]{1,30}:\s*/, "")
          .replace(/\s*\([^)]*\)\s*$/, "")
          .trim();
      }
    }
  }
  return "Unknown";
}

function objectClassification(record) {
  const skip = new Set(["Collection Item", "Visual Works", "Visual Work"]);
  const labels = (record.classified_as ?? []).map((c) => c._label).filter(Boolean);
  return labels.find((l) => !skip.has(l)) || labels[0] || "";
}

// 검색/랜덤 그리드용(이미지·기본 메타만). 매니페스트 fetch 없음.
function normalizeListRecord(record) {
  if (!record) return null;
  const img = firstImageUrl(record);
  if (!img) return null;
  const service = iiifServiceFromUrl(img);
  const thumbUrl = service ? iiifThumbUrl(service, 400) : img;
  const tsp = record.produced_by?.timespan || {};
  const dateStart = parseYear(tsp.begin_of_the_begin);
  const dateEnd = parseYear(tsp.end_of_the_end) ?? dateStart;
  const cls = objectClassification(record);
  return {
    id: uuidOf(record.id),
    title: primaryTitle(record),
    artist: primaryArtist(record),
    artistId: null,
    date: dateStart
      ? dateEnd && dateEnd !== dateStart
        ? `${dateStart}–${dateEnd}`
        : `${dateStart}`
      : statement(record, "Period"),
    dateStart,
    dateEnd,
    medium: statement(record, "Medium"),
    classification: cls,
    dimensions: statement(record, "Dimensions"),
    placeOfOrigin: statement(record, "Culture"),
    creditLine: statement(record, "Credit Line"),
    department: cls,
    thumbUrl,
    fullImageUrl: service ? iiifThumbUrl(service, 1400) : img,
    imageId: service, // IIIF 서비스 있으면 딥줌 가능
    _img: img,
  };
}

// 상세 페이지용: 그리드 매핑 + (필요 시) 매니페스트로 딥줌 IIIF 승격 + 설명.
async function normalizeDetailRecord(record) {
  const base = normalizeListRecord(record);
  if (!base) return null;
  base.description =
    (record.referred_to_by ?? [])
      .filter((x) => (x.classified_as ?? []).some((c) => c._label === "Description"))
      .map((x) => x.content)
      .find((t) => /[A-Za-z]/.test(t || "")) ||
    statement(record, "Provenance") ||
    "";

  // imageId 가 없고(미디어 썸네일) 매니페스트가 있으면 IIIF 이미지 서비스 추출 → 딥줌.
  if (!base.imageId) {
    const manifestUrl = manifestUrlFromThumb(base._img);
    if (manifestUrl) {
      const manifest = await fetchJson(manifestUrl);
      if (manifest) {
        const m = JSON.stringify(manifest).match(
          /(https?:\/\/[^"]*?\/iiif\/\d+\/[^"/]+)\/full\/(?:full|max|!?\d)/
        );
        if (m) {
          base.imageId = m[1];
          base.fullImageUrl = iiifThumbUrl(m[1], 1400);
        }
      }
    }
  }
  return base;
}

// ── 공개 API (어댑터 계약) ───────────────────────────────────────────────────
export async function fetchArtwork(id) {
  const record = await fetchJson(`${DATA_BASE}/object/${encodeURIComponent(id)}`);
  if (!record) return err("notFound", "Artwork not found");
  const artwork = await normalizeDetailRecord(record);
  if (!artwork) return err("notFound", "Artwork has no image");
  return ok(artwork);
}

export async function search({ q, page = 1, limit = GRID_PAGE }) {
  if (!q) return ok({ items: [] }, { total: 0, page, totalPages: 1 });
  const query = { AND: [{ text: q }, { hasDigitalImage: 1 }] };
  const refs = await searchRefs(query, { page, pageLength: limit });
  if (!refs.ok) return refs;

  const records = await Promise.all(refs.refs.map(fetchJson));
  const items = records.map(normalizeListRecord).filter(Boolean);
  const totalPages = Math.max(1, Math.ceil(refs.total / limit));
  return ok({ items }, { total: refs.total, page, totalPages });
}

export async function fetchRandomGallery({ count = GRID_PAGE } = {}) {
  // 회화 + 이미지 보유로 한정, 랜덤 페이지로 매번 다른 화사한 그리드.
  const query = {
    AND: [{ hasDigitalImage: 1 }, { classification: { id: CONCEPT_PAINTINGS } }],
  };
  const maxPage = 500; // 회화 ~8,000점 / 16 ≈ 500 페이지 (유효 범위 내)
  const page = Math.floor(Math.random() * maxPage) + 1;
  const refs = await searchRefs(query, { page, pageLength: count + 4 });
  if (!refs.ok) return refs;
  const records = await Promise.all(refs.refs.map(fetchJson));
  const items = records.map(normalizeListRecord).filter(Boolean).slice(0, count);
  return ok(items);
}

export async function fetchRelated({ artist, department, excludeId, limit = 6 }) {
  const term = artist && artist !== "Unknown" ? artist : department;
  if (!term) return ok([]);
  const query = { AND: [{ text: term }, { hasDigitalImage: 1 }] };
  const refs = await searchRefs(query, { page: 1, pageLength: limit + 6 });
  if (!refs.ok) return refs;
  const records = await Promise.all(refs.refs.map(fetchJson));
  const items = records
    .map(normalizeListRecord)
    .filter((a) => a && a.id !== excludeId)
    .slice(0, limit);
  return ok(items);
}

// LUX 는 평면 departments 엔드포인트가 없다. 필터의 부서 옵션은 결과 풀에서 집계.
export async function fetchDepartments() {
  return ok([]);
}
