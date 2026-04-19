const API_BASE = "https://api.artic.edu/api/v1";
const IIIF_BASE = "https://www.artic.edu/iiif/2";

const LIST_FIELDS =
  "id,title,artist_display,artist_id,date_display,date_start,date_end,image_id,department_title";

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
  return {
    id: raw.id,
    title: raw.title ?? "Untitled",
    artist: raw.artist_display ?? raw.artist_title ?? "Unknown",
    artistId: raw.artist_id ?? null,
    date: raw.date_display ?? "",
    dateStart: typeof raw.date_start === "number" ? raw.date_start : null,
    dateEnd: typeof raw.date_end === "number" ? raw.date_end : null,
    medium: raw.medium_display ?? "",
    dimensions: raw.dimensions ?? "",
    placeOfOrigin: raw.place_of_origin ?? "",
    creditLine: raw.credit_line ?? "",
    description: raw.description ?? "",
    imageId: raw.image_id ?? null,
    departmentTitle: raw.department_title ?? null,
  };
}

export function iiifThumbUrl(imageId, widthPx = 843) {
  if (!imageId) return null;
  return `${IIIF_BASE}/${imageId}/full/${widthPx},/0/default.jpg`;
}

export function iiifManifestUrl(artworkId) {
  return `${API_BASE}/artworks/${artworkId}/manifest.json`;
}

export async function search({ q, page = 1, limit = 25 }) {
  const result = await request("/artworks/search", {
    q,
    page,
    limit,
    fields: LIST_FIELDS,
  });
  if (!result.ok) return result;
  const items = (result.raw.data ?? []).map(normalizeArtwork).filter(Boolean);
  const pagination = result.raw.pagination ?? {};
  return {
    ok: true,
    data: { items },
    pagination: {
      total: pagination.total ?? items.length,
      page: pagination.current_page ?? page,
      totalPages: pagination.total_pages ?? 1,
    },
  };
}

export async function fetchRandomGallery({ count = 12 } = {}) {
  const page = Math.floor(Math.random() * 500) + 1;
  const result = await request("/artworks", {
    page,
    limit: count,
    fields: LIST_FIELDS,
  });
  if (!result.ok) return result;
  const items = (result.raw.data ?? [])
    .map(normalizeArtwork)
    .filter((a) => a && a.imageId);
  return ok(items);
}

export async function fetchArtwork(id) {
  const result = await request(`/artworks/${id}`);
  if (!result.ok) return result;
  const artwork = normalizeArtwork(result.raw.data);
  if (!artwork) return err("notFound", "Artwork not found");
  return ok(artwork);
}

export async function fetchRelated({ artistId, departmentTitle, excludeId, limit = 6 }) {
  if (artistId) {
    const byArtist = await request("/artworks/search", {
      "query[term][artist_id]": artistId,
      limit: limit + 2,
      fields: LIST_FIELDS,
    });
    if (byArtist.ok && byArtist.raw.data?.length) {
      const items = byArtist.raw.data
        .map(normalizeArtwork)
        .filter((a) => a && a.id !== excludeId && a.imageId)
        .slice(0, limit);
      if (items.length) return ok(items);
    }
  }

  if (departmentTitle) {
    const byDept = await request("/artworks/search", {
      q: departmentTitle,
      limit: limit + 10,
      fields: LIST_FIELDS,
    });
    if (byDept.ok) {
      const items = (byDept.raw.data ?? [])
        .map(normalizeArtwork)
        .filter((a) => a && a.id !== excludeId && a.departmentTitle === departmentTitle && a.imageId)
        .slice(0, limit);
      return ok(items);
    }
  }

  return ok([]);
}

export async function fetchDepartments() {
  if (departmentsCache) return ok(departmentsCache);
  const result = await request("/departments", { limit: 100 });
  if (!result.ok) return result;
  const list = (result.raw.data ?? []).map((d) => ({ id: d.id, title: d.title }));
  departmentsCache = list;
  return ok(list);
}
