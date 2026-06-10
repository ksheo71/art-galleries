import { parseYear } from "./util.js";

// Harvard Art Museums API 어댑터.
// 키가 필요하지만 정적 프론트엔드에 키를 노출하지 않기 위해, 동일 출처의
// 키 프록시(/api/harvard/...)를 통해 호출한다. nginx 가 이를 키 프록시 컨테이너로
// proxy_pass 하고, 프록시가 서버측 .env 의 apikey 를 붙여 Harvard 로 포워딩한다.
const API_BASE = "/api/harvard";

// 목록/검색 응답을 가볍게 받기 위해 필요한 필드만 요청.
const FIELDS =
  "id,title,dated,datebegin,dateend,century,culture,medium,technique,dimensions,classification,division,creditline,description,people,primaryimageurl,images,url";

function ok(data, pagination) {
  return pagination ? { ok: true, data, pagination } : { ok: true, data };
}
function err(kind, message, status) {
  return { ok: false, error: { kind, message, status } };
}

async function request(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`, location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }
  try {
    const response = await fetch(url.toString());
    if (response.status === 404) return err("notFound", "Not found");
    if (!response.ok) return err("http", `HTTP ${response.status}`, response.status);
    const json = await response.json();
    return { ok: true, raw: json };
  } catch (e) {
    return err("network", e?.message ?? "Network error");
  }
}

// ── 이미지 ───────────────────────────────────────────────────────────────────
// Harvard 의 primaryimageurl(dynmc) 은 ?width=&height= 로 크기 조절(303→실제 JPEG).
// IIIF 식별자가 일관되지 않아 딥줌 대신 고해상 일반 이미지를 사용한다(imageId=null).
function sized(url, w, h) {
  if (!url) return null;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}width=${w}&height=${h}`;
}
function bestImageUrl(record) {
  if (record.primaryimageurl) return record.primaryimageurl;
  const img = (record.images || []).find((i) => i.baseimageurl);
  return img ? img.baseimageurl : null;
}

// viewer.js 가 import 하므로 존재해야 한다. Harvard 는 딥줌 미사용 → null.
export function iiifInfoJson() {
  return null;
}
export function iiifThumbUrl() {
  return null;
}

// ── 정규화 ───────────────────────────────────────────────────────────────────
const ARTIST_ROLES = ["Artist", "Painter", "Draftsman", "Printmaker", "Maker", "Designer", "Sculptor", "Photographer"];

function pickArtist(people) {
  if (!Array.isArray(people) || people.length === 0) return "Unknown";
  for (const role of ARTIST_ROLES) {
    const p = people.find((x) => x.role === role && x.name);
    if (p) return p.name;
  }
  return people[0].name || "Unknown";
}

function normalizeArtwork(raw) {
  if (!raw) return null;
  const img = bestImageUrl(raw);
  return {
    id: raw.id,
    title: raw.title || "Untitled",
    artist: pickArtist(raw.people),
    artistId: (raw.people && raw.people[0] && raw.people[0].personid) || null,
    date: raw.dated || raw.century || "",
    dateStart: typeof raw.datebegin === "number" && raw.datebegin !== 0 ? raw.datebegin : parseYear(raw.dated),
    dateEnd: typeof raw.dateend === "number" && raw.dateend !== 0 ? raw.dateend : parseYear(raw.dated),
    medium: raw.medium || raw.technique || "",
    classification: raw.classification || "",
    dimensions: raw.dimensions || "",
    placeOfOrigin: raw.culture || "",
    creditLine: raw.creditline || "",
    department: raw.division || "",
    description: raw.description || "",
    thumbUrl: sized(img, 400, 400),
    fullImageUrl: sized(img, 1200, 1200),
    imageId: null, // Harvard: 딥줌 미사용(일반 고해상 이미지)
  };
}

// ── 공개 API (어댑터 계약) ───────────────────────────────────────────────────
export async function fetchArtwork(id) {
  const result = await request(`/object/${encodeURIComponent(id)}`, { fields: FIELDS });
  if (!result.ok) return result;
  const artwork = normalizeArtwork(result.raw);
  if (!artwork) return err("notFound", "Artwork not found");
  return ok(artwork);
}

export async function search({ q, page = 1, limit = 25 }) {
  const result = await request("/object", {
    q,
    hasimage: 1,
    page,
    size: limit,
    fields: FIELDS,
  });
  if (!result.ok) return result;
  const items = (result.raw.records ?? [])
    .map(normalizeArtwork)
    .filter((a) => a && a.thumbUrl);
  const info = result.raw.info ?? {};
  return ok(
    { items },
    {
      total: info.totalrecords ?? items.length,
      page: info.page ?? page,
      totalPages: info.pages ?? Math.max(1, Math.ceil((info.totalrecords ?? items.length) / limit)),
    }
  );
}

export async function fetchRandomGallery({ count = 12 } = {}) {
  // 화사한 첫인상: 이미지 있는 "회화(Paintings)"에서 랜덤 페이지로 추출.
  // Harvard 회화는 다수가 저작권 제한(imagepermissionlevel)으로 primaryimageurl 이 null →
  // 표시 가능한 것만 남기므로 넉넉히 과요청 후 count 만큼 슬라이스한다.
  const page = Math.floor(Math.random() * 100) + 1;
  const result = await request("/object", {
    classification: "Paintings",
    hasimage: 1,
    page,
    size: count * 3,
    sort: "random",
    fields: FIELDS,
  });
  if (!result.ok) return result;
  const items = (result.raw.records ?? [])
    .map(normalizeArtwork)
    .filter((a) => a && a.thumbUrl)
    .slice(0, count);
  return ok(items);
}

export async function fetchRelated({ artist, department, excludeId, limit = 6 }) {
  const term = artist && artist !== "Unknown" ? artist : department;
  if (!term) return ok([]);
  const result = await request("/object", {
    q: term,
    hasimage: 1,
    size: limit + 6,
    fields: FIELDS,
  });
  if (!result.ok) return result;
  const items = (result.raw.records ?? [])
    .map(normalizeArtwork)
    .filter((a) => a && a.thumbUrl && a.id !== excludeId)
    .slice(0, limit);
  return ok(items);
}

// 필터의 부서 옵션은 결과 풀에서 집계(별도 평면 엔드포인트 사용 안 함).
export async function fetchDepartments() {
  return ok([]);
}
