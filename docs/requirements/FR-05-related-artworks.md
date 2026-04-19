# FR-05 Related Artworks Section

## Summary
The artwork detail page suggests other artworks related to the current one to encourage deeper exploration.

## Description
A "Related artworks" section below the main detail area shows up to 6 artworks. The relation is computed client-side by re-querying the API using fields from the current artwork.

## Acceptance Criteria
- The section renders only after the main artwork loads successfully.
- Primary relation strategy: query `GET /artworks/search?query[term][artist_id]=<artist_id>&limit=6`, excluding the current artwork id.
- Fallback (no other works by the same artist): query by `department_title` instead.
- If both strategies return no items, the section is hidden entirely (no empty UI).
- Each related item is rendered as a card (shared `card.js`) and links to its own detail page.
- Loading state is a 6-card skeleton row.
- The section is independent of the main detail's loading: the detail can finish loading before related works arrive.

## Out of Scope (MVP)
- Relation by style, movement, or subject keywords.
- "More like this" infinite scroll.

## Related
- Depends on FR-04.
- Uses shared `card.js`.
