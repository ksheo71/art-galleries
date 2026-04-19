# FR-07 Favorites (localStorage)

## Summary
Users can mark artworks as favorites and review them later, without any account or backend.

## Description
A ♥ button appears on every artwork card and on the artwork detail page. Clicking it toggles the favorite state. The list is stored in the browser's `localStorage` and is viewable on `favorites.html`.

## Acceptance Criteria
- Storage key: `chicago-museum.favorites`.
- Storage value: JSON array of `{ id, title, artist, imageId, addedAt }`, where `addedAt` is an ISO 8601 timestamp.
- Toggling: adding sets the outline-♥ to filled; removing reverts it. The button state is derived from the array at render time (never duplicated in state).
- `favorites.html` reads the array and renders the items as a card grid, sorted by `addedAt` descending.
- Empty favorites page shows a friendly empty state with a link back to the main page.
- Favorites survive page reloads and browser restarts.
- If `localStorage` is unavailable (e.g., private browsing with storage disabled), the ♥ button shows a tooltip explaining that favorites cannot be saved; it does not throw.
- Removing an item from `favorites.html` updates the grid immediately without a page refresh.

## Out of Scope (MVP)
- Sync across devices / accounts.
- Collections / folders within favorites.
- Export / import JSON.

## Related
- See `docs/specs/spec-favorites-storage.md` for schema.
