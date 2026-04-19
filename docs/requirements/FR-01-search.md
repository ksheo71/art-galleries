# FR-01 Keyword Search

## Summary
Users can search artworks in the Art Institute of Chicago collection by typing a keyword.

## Description
The main page provides a large, prominent search input. On submit, the user is taken to the search results page with the keyword applied. The search queries the `/artworks/search` endpoint of the Art Institute of Chicago API.

## Acceptance Criteria
- Main page displays a search input with a clear call-to-action label (e.g., "Search the collection").
- Pressing Enter or clicking the submit button navigates to `search.html?q=<keyword>`.
- Empty queries are ignored (no navigation).
- The search input is also present in the common header on every page for subsequent searches.
- The search results page reads the `q` query parameter and calls the API on load.
- The current keyword is preserved in the header search input on the results page.

## Out of Scope (MVP)
- Auto-complete / suggestions.
- Search history.
- Voice search.

## Related
- Uses the API defined in `docs/specs/spec-api-client.md`
- Wireframes: `docs/wireframe/wireframe-home.md`, `docs/wireframe/wireframe-search.md`
