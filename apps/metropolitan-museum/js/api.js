const API_BASE = "https://collectionapi.metmuseum.org/public/collection/v1";

// Curated set of Metropolitan highlights used to populate the home page
// random gallery (Met's /search requires a query and /objects returns the
// full 490k-id firehose, so a small curated pool is the pragmatic choice).
const HIGHLIGHT_IDS = [
  437122, 436532, 437133, 437117, 437392, 436535, 459027, 436535, 437854,
  436528, 438417, 437980, 436105, 437055, 437329, 436154, 435868, 435809,
  435888, 436121, 437984, 436947, 437127, 437881, 438722, 436524, 435844,
  436944, 335868, 437111, 436101, 436108, 459123, 436106, 436970, 438007,
  437878, 437430, 438008, 435882,
];

let departmentsCache = null;

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

function normalizeArtwork(raw) {
  if (!raw) return null;
  const primaryImage = raw.primaryImage || "";
  const primaryImageSmall = raw.primaryImageSmall || primaryImage;
  return {
    id: raw.objectID,
    title: raw.title || "Untitled",
    artist: raw.artistDisplayName || "Unknown",
    artistNationality: raw.artistNationality || "",
    date: raw.objectDate || "",
    dateStart: typeof raw.objectBeginDate === "number" ? raw.objectBeginDate : null,
    dateEnd: typeof raw.objectEndDate === "number" ? raw.objectEndDate : null,
    medium: raw.medium || "",
    dimensions: raw.dimensions || "",
    placeOfOrigin: raw.country || raw.city || raw.culture || "",
    creditLine: raw.creditLine || "",
    classification: raw.classification || "",
    department: raw.department || "",
    thumbUrl: primaryImageSmall || null,
    fullImageUrl: primaryImage || null,
    isPublicDomain: !!raw.isPublicDomain,
  };
}

export async function fetchArtwork(id) {
  const result = await request(`/objects/${id}`);
  if (!result.ok) return result;
  const artwork = normalizeArtwork(result.raw);
  if (!artwork) return err("notFound", "Artwork not found");
  return ok(artwork);
}

async function fetchManyByIds(ids, limit) {
  const picked = ids.slice(0, limit);
  const results = await Promise.all(picked.map((id) => fetchArtwork(id)));
  return results
    .filter((r) => r.ok && r.data && r.data.thumbUrl)
    .map((r) => r.data);
}

export async function fetchRandomGallery({ count = 12 } = {}) {
  const shuffled = [...HIGHLIGHT_IDS].sort(() => Math.random() - 0.5);
  const items = await fetchManyByIds(shuffled, count + 4);
  return ok(items.slice(0, count));
}

/**
 * Met search is a two-step process:
 *   1) GET /search?q=X&hasImages=true  → { total, objectIDs }
 *   2) For the requested page/limit window, GET /objects/{id} for each id
 * The caller sees a paginated-like API similar to chicago's search().
 */
export async function search({ q, page = 1, limit = 25 }) {
  const base = await request("/search", {
    q,
    hasImages: "true",
  });
  if (!base.ok) return base;

  const allIds = Array.isArray(base.raw.objectIDs) ? base.raw.objectIDs : [];
  const total = allIds.length;

  const start = (page - 1) * limit;
  const slice = allIds.slice(start, start + limit);
  const items = await fetchManyByIds(slice, limit);

  return {
    ok: true,
    data: { items },
    pagination: {
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function fetchRelated({ artist, department, excludeId, limit = 6 }) {
  const query = artist && artist !== "Unknown" ? artist : department;
  if (!query) return ok([]);

  const base = await request("/search", { q: query, hasImages: "true" });
  if (!base.ok) return base;

  const ids = (Array.isArray(base.raw.objectIDs) ? base.raw.objectIDs : [])
    .filter((id) => id !== excludeId)
    .slice(0, limit + 4);

  const items = await fetchManyByIds(ids, limit + 4);
  return ok(items.slice(0, limit));
}

export async function fetchDepartments() {
  if (departmentsCache) return ok(departmentsCache);
  const result = await request("/departments");
  if (!result.ok) return result;
  const list = (result.raw.departments ?? []).map((d) => ({
    id: d.departmentId,
    title: d.displayName,
  }));
  departmentsCache = list;
  return ok(list);
}
