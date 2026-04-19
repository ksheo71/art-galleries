# FR-06 IIIF Deep-Zoom Viewer

## Summary
Users can open a high-resolution zoomable viewer for any artwork that has an IIIF image.

## Description
The artwork detail page has a "View in high-res" button that opens a fullscreen modal with a pan-and-zoom image viewer powered by OpenSeadragon. The viewer loads the artwork's IIIF manifest from the Art Institute of Chicago API.

## Acceptance Criteria
- Button is disabled (or hidden) if the artwork has no `image_id`.
- Clicking the button opens a modal that covers the viewport.
- The modal initializes an OpenSeadragon viewer pointed at `https://api.artic.edu/api/v1/artworks/{id}/manifest.json` (IIIF Presentation 2.x compatible).
- Viewer controls: zoom in, zoom out, home (reset), fullscreen toggle.
- Close button (✕) in the top-right of the modal returns to the detail page.
- Pressing the `Escape` key also closes the modal.
- Body scroll is locked while the modal is open.
- OpenSeadragon is loaded from a CDN, not bundled.

## Out of Scope (MVP)
- Side-by-side compare mode.
- Downloading the high-res image.
- Annotations / overlays.

## Related
- Depends on FR-04.
- See `docs/specs/spec-iiif-viewer.md` for integration contract.
