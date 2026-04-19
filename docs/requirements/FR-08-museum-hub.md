# FR-08 Museum Hub (Landing Page)

## Summary
The root of the site presents a grid of partner museums. Clicking a museum opens that museum's app.

## Description
A top-level landing page at `apps/index.html` lists each supported museum as a card. The visual language of each card reflects the museum's identity. Clicking a card navigates to the museum's home page.

## Acceptance Criteria
- Root URL (`/`) serves the hub page (not any museum's home).
- Each museum is represented by one card.
- Each card:
  - Shows the museum's name prominently.
  - Is a single clickable area linking to the museum's `./<slug>/` path.
  - Has a distinct visual treatment so the two museums are not easily confused.
- Supported museums:
  - **The Art Institute of Chicago** → `/chicago-museum/`
  - **The Metropolitan Museum of Art** → `/metropolitan-museum/`
  - **The Cleveland Museum of Art** → `/cleveland-museum/`
- Grid is responsive: 1 column on mobile, 2 columns from `md`, 3 columns from `lg`.
- Footer lists the upstream sources (artic.edu, metmuseum.org, clevelandart.org).

## Out of Scope (MVP)
- Cross-museum search.
- Aggregated favorites across museums.
- "Featured today" editorial modules on the hub.

## Related
- New museums can be added by creating `apps/<slug>/` and appending a card here and an entry in `docs/references/api_info.md`.
