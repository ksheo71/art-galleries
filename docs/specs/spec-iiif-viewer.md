# Spec: IIIF Deep-Zoom Viewer

## Purpose
Define how the artwork detail page integrates OpenSeadragon to provide a pan-and-zoom high-resolution viewer powered by IIIF.

## Dependency

- **OpenSeadragon** loaded from CDN:
  - `https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/openseadragon.min.js`
- Loaded lazily on first "View in high-res" click, not on page load (see NFR-02).

## Integration Module (`js/iiif.js`)

```js
// Ensures OpenSeadragon is loaded, then opens the modal for the given artwork.
openDeepZoom(artworkId: number) => Promise<void>

// Closes the modal and destroys the viewer instance.
closeDeepZoom() => void
```

## Modal Structure

```html
<div id="iiif-modal" class="fixed inset-0 bg-black/90 z-50 hidden" role="dialog" aria-modal="true" aria-label="High resolution image viewer">
  <button class="absolute top-4 right-4 text-white ..." aria-label="Close">✕</button>
  <div id="iiif-viewer" class="w-full h-full"></div>
</div>
```

The modal is embedded in `artwork.html` as hidden markup. `iiif.js` toggles the `hidden` class and instantiates OpenSeadragon inside `#iiif-viewer`.

## OpenSeadragon Configuration

```js
OpenSeadragon({
  id: "iiif-viewer",
  prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
  tileSources: `https://api.artic.edu/api/v1/artworks/${artworkId}/manifest.json`,
  showNavigationControl: true,
  showFullPageControl: true,
  gestureSettingsTouch: { pinchToZoom: true },
});
```

The manifest endpoint returns IIIF Presentation 2.x; OpenSeadragon detects and consumes it directly.

## Lifecycle

1. User clicks "View in high-res".
2. If OpenSeadragon script is not yet loaded, inject `<script>` tag and await `load`.
3. Save current focus element.
4. Reveal modal (remove `hidden`).
5. Lock body scroll (`document.body.style.overflow = "hidden"`).
6. Instantiate viewer.
7. Trap focus inside the modal (see NFR-03).

On close (✕ click, or `Escape`):
1. `viewer.destroy()`.
2. Hide modal.
3. Unlock body scroll.
4. Restore saved focus.

## Error Handling

- Script load failure → show an inline error in the modal ("Could not load the image viewer") with a "Close" button.
- Manifest 404 → same inline message.
- Viewer init error → catch and log; show the message above.

## Out of Scope (MVP)

- Viewer state persistence (zoom level, pan position) across modal opens.
- Keyboard shortcuts beyond Escape to close.
- Downloading the source image.
