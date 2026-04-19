const API_BASE = "https://openaccess-api.clevelandart.org/api";

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
  const firstCreator = Array.isArray(raw.creators) && raw.creators.length > 0 ? raw.creators[0] : null;
  const artist = firstCreator?.description || "Unknown";
  const artistId = firstCreator?.id ?? null;
  const culture = Array.isArray(raw.culture) ? raw.culture.filter(Boolean).join(", ") : "";

  const images = raw.images || {};
  const thumbUrl = images.web?.url || null;
  const fullImageUrl = images.print?.url || images.web?.url || null;

  return {
    id: raw.id,
    title: raw.title || "Untitled",
    artist,
    artistId,
    date: raw.creation_date || "",
    dateStart: typeof raw.creation_date_earliest === "number" ? raw.creation_date_earliest : null,
    dateEnd: typeof raw.creation_date_latest === "number" ? raw.creation_date_latest : null,
    medium: raw.technique || "",
    classification: raw.type || "",
    dimensions: raw.measurements || "",
    placeOfOrigin: culture,
    creditLine: raw.creditline || "",
    department: raw.department || "",
    thumbUrl,
    fullImageUrl,
    isCC0: (raw.share_license_status || "").toUpperCase() === "CC0",
  };
}

export async function fetchArtwork(id) {
  const result = await request(`/artworks/${id}`);
  if (!result.ok) return result;
  const artwork = normalizeArtwork(result.raw.data);
  if (!artwork) return err("notFound", "Artwork not found");
  return ok(artwork);
}

/**
 * Cleveland's /artworks endpoint is one-step: it accepts q, has_image, limit,
 * skip, department, type and returns the full artwork payload. Unlike the Met,
 * no secondary per-id fetch is needed.
 */
export async function search({ q, page = 1, limit = 25 }) {
  const skip = (page - 1) * limit;
  const params = {
    has_image: 1,
    limit,
    skip,
  };
  if (q) params.q = q;

  const result = await request("/artworks/", params);
  if (!result.ok) return result;

  const items = (result.raw.data ?? [])
    .map(normalizeArtwork)
    .filter((a) => a && a.thumbUrl);
  const total = result.raw.info?.total ?? items.length;

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

export async function fetchRandomGallery({ count = 12 } = {}) {
  // Sample a random page deep in the catalog (Cleveland has ~60k CC0 works
  // with images). We over-request by a few to cover items without web
  // images and still return a full grid.
  const skip = Math.floor(Math.random() * 3000);
  const result = await request("/artworks/", {
    has_image: 1,
    limit: count + 6,
    skip,
  });
  if (!result.ok) return result;
  const items = (result.raw.data ?? [])
    .map(normalizeArtwork)
    .filter((a) => a && a.thumbUrl)
    .slice(0, count);
  return ok(items);
}

export async function fetchRelated({ artistId, department, excludeId, limit = 6 }) {
  // Prefer same-artist when available (Cleveland does not expose an
  // explicit artist_id filter, so fall back to re-searching the artist
  // description via `q`).
  if (artistId) {
    const byArtist = await request("/artworks/", {
      has_image: 1,
      limit: limit + 4,
      created_by: artistId,
    });
    if (byArtist.ok) {
      const items = (byArtist.raw.data ?? [])
        .map(normalizeArtwork)
        .filter((a) => a && a.id !== excludeId && a.thumbUrl)
        .slice(0, limit);
      if (items.length) return ok(items);
    }
  }

  if (department) {
    const byDept = await request("/artworks/", {
      has_image: 1,
      limit: limit + 6,
      department,
    });
    if (byDept.ok) {
      const items = (byDept.raw.data ?? [])
        .map(normalizeArtwork)
        .filter((a) => a && a.id !== excludeId && a.thumbUrl)
        .slice(0, limit);
      return ok(items);
    }
  }

  return ok([]);
}

// Cleveland does not expose a dedicated /departments endpoint.
// Departments are aggregated client-side from the loaded result pool.
export async function fetchDepartments() {
  return ok([]);
}
