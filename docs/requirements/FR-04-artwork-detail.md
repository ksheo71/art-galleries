# FR-04 Artwork Detail Page

## Summary
Each artwork has a dedicated detail page showing docent-quality metadata and a large image preview.

## Description
Clicking any card navigates to `artwork.html?id=<id>`. The page fetches `GET /artworks/{id}` and renders a two-column layout (image on one side, metadata on the other; stacks on mobile).

## Acceptance Criteria
- Page reads `id` from the URL query string and calls the API on load.
- Renders the following fields when present:
  - `title`
  - `artist_display`
  - `date_display`
  - `medium_display`
  - `dimensions`
  - `place_of_origin`
  - `credit_line`
  - `description` (HTML string from API — sanitized before rendering; see NFR-01 for static-only constraint)
- Image area uses the IIIF 843px URL as a default preview.
- Favorite ♥ button is visible in the page header (see FR-07).
- "View in high-res" button triggers the IIIF deep-zoom modal (see FR-06).
- If the artwork has no image, the image area shows a neutral placeholder explaining that no public image is available.
- Related works section appears below the main detail area (see FR-05).
- 404 / unknown id: show a clear "Artwork not found" message with a link back to the main page.

## Out of Scope (MVP)
- Sharing to social media.
- Print view / PDF export.
- User comments.

## Related
- FR-05 related works.
- FR-06 IIIF deep-zoom.
- FR-07 favorites.
