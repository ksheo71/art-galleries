# FR-10 Cleveland Museum App

## Summary
A third museum app under `apps/cleveland-museum/` mirrors the feature set of Chicago (FR-01 … FR-07) and Metropolitan (FR-09) using The Cleveland Museum of Art open-access API.

## Description
Cleveland's API (`https://openaccess-api.clevelandart.org/api/`) differs from the other two:
- **One-step search**: `/artworks/` returns full artwork payloads directly (no ID-then-detail round-trip like the Met).
- **No dedicated `/departments` endpoint** — department options are aggregated client-side from the loaded result pool.
- **CC0 default**: most images are public-domain, surfaced with a "Public domain (CC0)" note on the detail page when `share_license_status === "CC0"`.
- **Images**: `images.web.url` (thumbnail, ~900 px tall) and `images.print.url` (high-res JPEG) are exposed directly. Deep-zoom uses OpenSeadragon simple-image mode against the `print` URL.
- **Artist** comes from `creators[0].description` (e.g., "Claude Monet (French, 1840–1926)").
- **Period** uses `creation_date_earliest` / `creation_date_latest` (numeric) for the client-side period filter.

## Acceptance Criteria
- `apps/cleveland-museum/index.html` — main page with search bar and a random preview (random `skip` deep in the catalog, requesting `has_image=1`).
- `apps/cleveland-museum/search.html` — keyword search via `/artworks/?q=…&has_image=1&limit=25&skip=N`, paginated with "Load more".
- `apps/cleveland-museum/artwork.html` — detail with title, artist, date, technique (shown as Medium), classification (from `type`), dimensions (from `measurements`), culture (shown as Place of origin), department, credit line. Public-domain marker when applicable.
- `apps/cleveland-museum/favorites.html` — localStorage-backed list under the `cleveland-museum.favorites` key.
- Filters narrow the grid client-side (artist / period / department). Department options come from aggregates.
- Related works: re-query via `created_by=<artistId>`; fall back to `department=<dept>` when no sibling works.
- High-res viewer: OpenSeadragon `{ type: "image", url: images.print.url }`.
- All NFR-01 through NFR-05 hold.

## Out of Scope (MVP)
- Server-side classification (`type`) filter and culture filter facets.
- Exhibitions / provenance sections from the rich Cleveland payload.
- Cross-museum favorites.

## Related
- Mirrors: FR-01, FR-02, FR-04, FR-05, FR-06, FR-07, FR-09.
- API reference: `docs/references/api_info.md` (Cleveland row).
