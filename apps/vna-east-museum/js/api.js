import { parseYear } from "./util.js";

const API_BASE = "https://api.vam.ac.uk/v2";
const IIIF_BASE = "https://framemark.vam.ac.uk/collections";

// V&A 검색 API 는 Elasticsearch 기반으로 deep pagination 한계가 있다:
// offset(page * page_size) 가 10,000 을 넘는 요청은 CORS 헤더 없는 에러 응답을
// 반환해 브라우저 fetch 가 "TypeError: Failed to fetch" 로 실패한다.
const MAX_RESULT_WINDOW = 10000;

function ok(data, pagination) {
  return pagination ? { ok: true, data, pagination } : { ok: true, data };
}

function err(kind, message, status) {
  return { ok: false, error: { kind, message, status } };
}

async function request(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, v);
    }
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

export function iiifThumbUrl(imageId, width = 400) {
  if (!imageId) return null;
  return `${IIIF_BASE}/${imageId}/full/!${width},/0/default.jpg`;
}

export function iiifFullUrl(imageId, width = 2000) {
  if (!imageId) return null;
  return `${IIIF_BASE}/${imageId}/full/!${width},/0/default.jpg`;
}

export function iiifInfoJson(imageId) {
  if (!imageId) return null;
  return `${IIIF_BASE}/${imageId}/info.json`;
}

function normalizeSearchRecord(r) {
  if (!r) return null;
  const imageId = r._primaryImageId || null;
  const year = parseYear(r._primaryDate);
  return {
    id: r.systemNumber,
    title: r._primaryTitle || "Untitled",
    artist: r._primaryMaker?.name || "Unknown",
    artistId: null,
    date: r._primaryDate || "",
    dateStart: year,
    dateEnd: year,
    medium: "",
    classification: r.objectType || "",
    dimensions: "",
    placeOfOrigin: r._primaryPlace || "",
    creditLine: "",
    department: r.objectType || "",
    thumbUrl: iiifThumbUrl(imageId, 400),
    fullImageUrl: iiifFullUrl(imageId, 2000),
    imageId,
  };
}

function pickMakerName(record) {
  for (const key of ["artistMakerPerson", "artistMakerPeople", "artistMakerOrganisations"]) {
    const list = record[key];
    if (Array.isArray(list) && list.length > 0) {
      const first = list[0];
      const name = first?.name?.text || first?.name;
      if (typeof name === "string" && name.trim()) return name;
    }
  }
  return "Unknown";
}

function formatDimensions(dims, note) {
  if (!Array.isArray(dims) || dims.length === 0) return note || "";
  const parts = dims
    .filter((d) => d && d.value)
    .map((d) => {
      const label = d.dimension ? `${d.dimension}: ` : "";
      const unit = d.unit ? ` ${d.unit}` : "";
      return `${label}${d.value}${unit}`;
    });
  return parts.join(", ");
}

function normalizeDetailRecord(json) {
  if (!json || !json.record) return null;
  const r = json.record;
  const images = json.meta?.images || {};
  const imageId = extractImageId(images._iiif_image) || extractImageId(images._primary_thumbnail);
  const title = r.titles?.[0]?.title || "Untitled";
  const artist = pickMakerName(r);

  const prod = Array.isArray(r.productionDates) && r.productionDates.length > 0 ? r.productionDates[0] : null;
  const dateDisplay = prod?.date?.text || "";
  const earliestRaw = prod?.date?.earliest || "";
  const latestRaw = prod?.date?.latest || "";
  const dateStart = parseYear(earliestRaw) ?? parseYear(dateDisplay);
  const dateEnd = parseYear(latestRaw) ?? dateStart;

  const place = r.placesOfOrigin?.[0]?.place?.text || "";

  return {
    id: r.systemNumber,
    title,
    artist,
    artistId: null,
    date: dateDisplay,
    dateStart,
    dateEnd,
    medium: r.materialsAndTechniques || "",
    classification: r.objectType || "",
    dimensions: formatDimensions(r.dimensions, r.dimensionsNote),
    placeOfOrigin: place,
    creditLine: r.creditLine || "",
    department: r.objectType || "",
    description: r.summaryDescription || r.briefDescription || "",
    thumbUrl: iiifThumbUrl(imageId, 843),
    fullImageUrl: iiifFullUrl(imageId, 2000),
    imageId,
  };
}

function extractImageId(url) {
  if (!url) return null;
  const m = String(url).match(/\/collections\/([^/]+)\//);
  return m ? m[1] : null;
}

export async function fetchArtwork(id) {
  const result = await request(`/museumobject/${encodeURIComponent(id)}`);
  if (!result.ok) return result;
  const artwork = normalizeDetailRecord(result.raw);
  if (!artwork) return err("notFound", "Artwork not found");
  return ok(artwork);
}

export async function search({ q, page = 1, limit = 25 }) {
  const params = {
    images_exist: 1,
    page_size: limit,
    page,
  };
  if (q) params.q = q;

  const result = await request("/objects/search", params);
  if (!result.ok) return result;

  const items = (result.raw.records ?? [])
    .map(normalizeSearchRecord)
    .filter((a) => a && a.thumbUrl);
  const info = result.raw.info || {};
  const total = info.record_count ?? items.length;
  // V&A deep-pagination 한계(offset ≤ 10,000) 를 넘는 페이지는 API 가 실패하므로
  // 도달 가능한 페이지 수로 상한을 둔다(그 이상은 페이지네이션에서 제공하지 않음).
  const reachablePages = Math.max(1, Math.floor(MAX_RESULT_WINDOW / limit));
  const apiPages = info.pages ?? Math.max(1, Math.ceil(total / limit));
  const totalPages = Math.min(apiPages, reachablePages);

  return {
    ok: true,
    data: { items },
    pagination: { total, page, totalPages },
  };
}

export async function fetchRandomGallery({ count = 12 } = {}) {
  // Sample a random page across the catalog. V&A indexes ~1.3M records
  // with ~1.2M images; a random page produces a fresh grid each refresh.
  // page * page_size 가 MAX_RESULT_WINDOW 를 넘으면 API 가 실패하므로
  // 최대 페이지를 floor(10000 / page_size) 로 제한한다.
  const pageSize = count + 4;
  const maxPage = Math.max(1, Math.floor(MAX_RESULT_WINDOW / pageSize));
  const page = Math.floor(Math.random() * maxPage) + 1;
  const result = await request("/objects/search", {
    images_exist: 1,
    page_size: pageSize,
    page,
  });
  if (!result.ok) return result;
  const items = (result.raw.records ?? [])
    .map(normalizeSearchRecord)
    .filter((a) => a && a.thumbUrl)
    .slice(0, count);
  return ok(items);
}

export async function fetchRelated({ artist, department, excludeId, limit = 6 }) {
  const query = artist && artist !== "Unknown" ? artist : department;
  if (!query) return ok([]);

  const result = await request("/objects/search", {
    q: query,
    images_exist: 1,
    page_size: limit + 4,
  });
  if (!result.ok) return result;

  const items = (result.raw.records ?? [])
    .map(normalizeSearchRecord)
    .filter((a) => a && a.id !== excludeId && a.thumbUrl)
    .slice(0, limit);
  return ok(items);
}

// V&A does not expose a flat /departments endpoint. We surface the
// `objectType` as a proxy for department — options are aggregated
// client-side from the loaded result pool.
export async function fetchDepartments() {
  return ok([]);
}
