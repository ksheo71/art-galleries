# FR-02 Search Result Filters

## Summary
Users can narrow search results by artist, period (date range), and department.

## Description
On the search results page, a filter sidebar (or collapsible panel on mobile) lets users apply additional constraints on top of the keyword search.

## Acceptance Criteria
- **Artist filter**: a list of distinct artists aggregated from the current result set. Clicking an artist filters the grid to that artist. Multi-select is not required for MVP.
- **Period filter**: two numeric inputs (From year / To year) mapped to the API's `date_start` / `date_end` fields. Leaving one empty means open-ended.
- **Department filter**: a dropdown populated from `GET /departments`. Only departments present in the result set are enabled (others greyed or hidden).
- Applying or changing a filter updates the URL query string (e.g., `?q=monet&artist=Claude+Monet&dept=Painting+and+Sculpture`) so the state is shareable and restorable.
- A "Clear filters" button removes all applied filters and reloads results.
- Filter state survives browser back/forward within the same session.

## Out of Scope (MVP)
- Multi-select across any dimension.
- Style / movement filter.
- Sort options (sorted by API relevance only).

## Related
- Depends on FR-01.
- Uses `/departments` endpoint — see `docs/specs/spec-api-client.md`.
