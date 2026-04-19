# Spec: API Client

## Purpose
Define the contract for `apps/chicago-museum/js/api.js` — the single module that encapsulates all calls to the Art Institute of Chicago API. Every page imports from this module; no raw `fetch` calls elsewhere.

## Base
- Base URL: `https://api.artic.edu/api/v1`
- IIIF image base: `https://www.artic.edu/iiif/2`
- No authentication. CORS enabled by the provider.

## Public Functions

```js
// Keyword search
search({ q, page = 1, limit = 25, filters = {} }) => Promise<Result>
//   filters: { artist, dateStart, dateEnd, departmentTitle }

// Main-page random gallery
fetchRandomGallery({ count = 12 }) => Promise<Result>

// Detail
fetchArtwork(id) => Promise<Result>

// Related
fetchRelated({ artistId, departmentTitle, excludeId, limit = 6 }) => Promise<Result>

// Departments list (cached in memory for the session)
fetchDepartments() => Promise<Result>

// IIIF thumbnail URL helper (pure)
iiifThumbUrl(imageId, widthPx = 843) => string

// IIIF manifest URL helper (pure)
iiifManifestUrl(artworkId) => string
```

## Result Shape

All async functions resolve with:

```js
{
  ok: true,
  data: <payload>,        // normalized artwork / array / whatever is applicable
  pagination?: { total, page, totalPages }
}
```

On failure:

```js
{
  ok: false,
  error: {
    kind: "network" | "http" | "notFound" | "empty",
    status?: number,
    message: string
  }
}
```

Functions never throw. Callers render based on `ok`.

## Normalization

Every API artwork is normalized to the internal shape:

```js
{
  id: number,
  title: string,
  artist: string,        // from artist_display
  artistId: number | null,
  date: string,          // from date_display
  dateStart: number | null,
  dateEnd: number | null,
  medium: string,
  dimensions: string,
  placeOfOrigin: string,
  creditLine: string,
  description: string,   // HTML string — callers must sanitize if injecting
  imageId: string | null,
  departmentTitle: string | null,
}
```

See `spec-data-model.md` for the full model.

## Field Selection

For list endpoints, always pass `fields=` to minimize payload:
- Search / gallery: `id,title,artist_display,artist_id,date_display,image_id,department_title`
- Detail: `fields=` omitted to fetch full record.

## Caching

- `fetchDepartments` result is held in a module-level variable for the lifetime of the page (simple in-memory cache).
- No cross-page cache in MVP; each page navigation refetches. (Browser HTTP cache still applies.)

## Error Handling

- `fetch` throws → `{ ok: false, error: { kind: "network", message } }`
- HTTP 404 → `{ kind: "notFound" }`
- Other HTTP non-2xx → `{ kind: "http", status }`
- Empty result array when one is expected → `{ kind: "empty" }` (callers may treat this as a valid empty state rather than an error)
