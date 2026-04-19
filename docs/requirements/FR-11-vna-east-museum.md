# FR-11 V&A East Museum App

## Summary
A fourth museum app under `apps/vna-east-museum/` mirrors the feature set of the other museums against the Victoria and Albert Museum Collections API.

## Description
The V&A Collections API (`https://api.vam.ac.uk/v2/`) has several traits that shape this app:
- **String system numbers** instead of integer IDs (e.g. `O132743`). All per-artwork routing, card data attributes, and favorites keys must treat the id as an opaque string.
- **Search results are summaries** (`_primaryTitle`, `_primaryMaker`, `_primaryImageId`, `_primaryDate`, `_primaryPlace`, `objectType`). Detail fields (materials, dimensions, credit, description) only come back from the per-object endpoint.
- **Images are served via IIIF** at `https://framemark.vam.ac.uk/collections/{imageId}/`. Each image exposes a proper `info.json`, so deep-zoom uses OpenSeadragon's tiled IIIF Image API mode (same as Chicago).
- **No flat departments endpoint**. The filter "Object type" is populated by aggregating `objectType` values from the loaded result pool.
- **Maker diversity**: makers may be people, groups, or organisations (`artistMakerPerson`, `artistMakerPeople`, `artistMakerOrganisations`). Pick the first non-empty one for the display name.
- **No reliable numeric year on search results** — parse the first 3–4 digit number out of `_primaryDate` to drive the period filter. On the detail endpoint use `productionDates[0].date.earliest / latest`.

## Acceptance Criteria
- `apps/vna-east-museum/index.html` — main page with search bar and a random preview (random `page` across `/objects/search?images_exist=true`).
- `apps/vna-east-museum/search.html` — one-step keyword search via `/objects/search?q=…&images_exist=1&page_size=25&page=N`.
- `apps/vna-east-museum/artwork.html` — detail page with title, maker, date, medium (`materialsAndTechniques`), classification (`objectType`), dimensions (formatted from the `dimensions` array or `dimensionsNote`), place of origin (`placesOfOrigin[0].place.text`), credit line, and summary description.
- `apps/vna-east-museum/favorites.html` — localStorage-backed list under the key `vna-east-museum.favorites`.
- Filters narrow the grid client-side by Maker / Period / Object type.
- Related objects: re-query via `q=<maker>` (or `q=<objectType>` as fallback) and exclude the current `systemNumber`.
- Deep-zoom: OpenSeadragon `tileSources = iiifInfoJson(imageId)` against V&A's IIIF Image API. Escape closes.
- NFR-01 through NFR-05 hold.
- URL parameters use `encodeURIComponent` on the system number (colons and dashes appear in some ids).

## Out of Scope (MVP)
- `categories`, `styles`, `collectionCode`, or gallery-location filter facets.
- Multi-maker display (only the first maker is surfaced).
- Content warnings from `contentWarnings` on the detail record.

## Related
- Mirrors: FR-01, FR-02, FR-04, FR-05, FR-06, FR-07, FR-09, FR-10.
- API reference: `docs/references/api_info.md` (V&A East row).
