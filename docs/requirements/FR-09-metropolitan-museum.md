# FR-09 Metropolitan Museum App

## Summary
A second museum app under `apps/metropolitan-museum/` mirrors the feature set of the Chicago app (FR-01 through FR-07) but sources data from The Metropolitan Museum of Art Collection API.

## Description
The Met Museum app is an independent static app that reuses the same UX conventions as the Chicago app (search → results → detail → favorites → deep-zoom). Differences:
- Data source: `https://collectionapi.metmuseum.org/public/collection/v1/`.
- Search is a two-step operation behind the scenes: `/search` returns only object IDs; each detail is fetched individually. The user-facing flow remains a single search input.
- Deep-zoom uses OpenSeadragon in "simple image" mode (the Met exposes full-size image URLs, not IIIF manifests).
- Favorites are stored under a separate localStorage key (`metropolitan-museum.favorites`) so they do not mix with Chicago's.

## Acceptance Criteria
- `apps/metropolitan-museum/index.html` — main page with search bar and a highlight preview (curated highlight IDs, since the Met does not provide a direct "random artwork" endpoint).
- `apps/metropolitan-museum/search.html` — results grid powered by `/search?q=…&hasImages=true` followed by parallel `/objects/{id}` fetches for the visible page.
- `apps/metropolitan-museum/artwork.html` — detail page with title, artist, date, medium, dimensions, place of origin, department, credit line, and a high-res viewer.
- `apps/metropolitan-museum/favorites.html` — localStorage-backed list, per the Met-specific key.
- Filters apply client-side over the loaded result pool, matching FR-02 behavior.
- Related works: re-query by artist name when available, fall back to department.
- High-res viewer: OpenSeadragon `{ type: "image", url: primaryImage }` tile source.
- All criteria from NFR-01 through NFR-05 hold.

## Out of Scope (MVP)
- `isHighlight`, `isOnView` filter facets on the Met.
- Cross-page search result caching beyond the current session.
- Met-only advanced fields (constituents array, gallery numbers, tags).

## Related
- Mirrors: FR-01, FR-02, FR-04, FR-05, FR-06, FR-07.
- API reference: `docs/references/api_info.md` (Metropolitan row).
