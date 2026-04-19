# Verification: chicago-museum MVP

Covers FR-01 … FR-07, NFR-01 … NFR-05 for `apps/chicago-museum/`.

## Prerequisites
- Node.js installed (`npx` available) — only used to serve static files.
- Modern browser: latest Chrome, Firefox, Safari, or Edge.

## 1. Start local static server

### Windows (Command Prompt / PowerShell / Git Bash)
```cmd
npx --yes serve apps/chicago-museum
```

### Linux / macOS
```bash
npx --yes serve apps/chicago-museum
```

The server prints a URL — typically `http://localhost:3000` (or the next free port).

> **Note**: `apps/chicago-museum/serve.json` disables `cleanUrls` so that `.html` suffixes and query strings (e.g., `?q=monet`) survive without being redirect-stripped. If you use a different server, verify `/search.html?q=monet` responds 200 directly (no 301 → `/search`).

## 2. One-line smoke test (no browser)

Verifies that static files are reachable and Art Institute API is accessible from this machine.

### Windows (Git Bash / WSL)
```bash
curl -sf "http://localhost:3000/index.html" >/dev/null && echo "OK: index.html" && curl -sf "https://api.artic.edu/api/v1/artworks?limit=1" >/dev/null && echo "OK: artic API reachable"
```

### Linux / macOS
```bash
curl -sf "http://localhost:3000/index.html" >/dev/null && echo "OK: index.html" && curl -sf "https://api.artic.edu/api/v1/artworks?limit=1" >/dev/null && echo "OK: artic API reachable"
```

Both lines must print `OK: ...`.

## 3. Manual test checklist

Open the printed URL in a browser and verify each item:

### Home (FR-01, FR-03)
- [ ] Main page shows title, tagline, big search input.
- [ ] Random gallery renders **at least 8 cards with images** after the skeleton clears.
- [ ] Typing `monet` + Enter navigates to `search.html?q=monet`.

### Search (FR-01, FR-02)
- [ ] Results page shows a grid of cards for the keyword.
- [ ] Filter panel is visible on desktop (≥ 1024 px) and collapsible on mobile.
- [ ] Selecting an artist radio narrows the grid immediately after "Apply".
- [ ] Entering Period From/To and clicking "Apply" narrows the grid.
- [ ] Department dropdown narrows the grid.
- [ ] "Clear" resets all filters.
- [ ] URL query string updates as filters change (shareable).
- [ ] "Load more" appears when more results exist and loads the next page.

### Artwork detail (FR-04, FR-05)
- [ ] Clicking a card opens `artwork.html?id=<id>`.
- [ ] Image loads in the left column (or placeholder if no image).
- [ ] Right column shows title, artist, and at least one of: date, medium, dimensions, place, department, credit.
- [ ] `Related artworks` section appears with up to 6 cards — OR is hidden if none.
- [ ] Bogus id (e.g., `?id=9999999999`) shows "Artwork not found."

### IIIF deep-zoom (FR-06)
- [ ] Clicking "View in high-res" opens a fullscreen black modal.
- [ ] Pan by drag, zoom by scroll / pinch works.
- [ ] `✕` closes the modal.
- [ ] `Escape` key also closes the modal.
- [ ] Body is non-scrollable while the modal is open.

### Favorites (FR-07)
- [ ] Click ♥ on a card — icon fills and turns red.
- [ ] Reload the page — heart state persists.
- [ ] Click the header "♥ Favorites" link — saved items appear as a grid with "added Xm/h/d ago".
- [ ] Clicking ♥ on a saved card removes it; grid re-renders without reload.
- [ ] Empty state shows when no favorites, with a link back to home.

### Accessibility (NFR-03)
- [ ] Tab cycles through interactive elements (search input, buttons, cards, filter controls).
- [ ] Focus outline is visible on every focused element.
- [ ] `Escape` closes the IIIF modal (verified above).
- [ ] ♥ button has `aria-pressed="true"` when favorited, `"false"` otherwise (inspect in DevTools).

### Responsive (NFR-04)
- [ ] Resize to 375 px wide — layout stacks; filter panel becomes a collapsible `<details>`.
- [ ] At ≥ 1024 px — sidebar sits beside the grid.

### Static / no-backend (NFR-01)
```bash
# From repo root. All files under the app must be static types:
find apps/chicago-museum -type f | grep -vE '\.(html|css|js|md|svg|png|jpg|ico)$' || echo "OK: only static assets"
```
Expected: `OK: only static assets`.

### Performance (NFR-02) — spot check
- DevTools → Network → reload. `index.html` + JS + CSS total ≤ ~150 KB gzipped (excluding Tailwind CDN which is cached).
- OpenSeadragon script appears in the network only AFTER clicking "View in high-res", not on initial load.

## 4. Troubleshooting

- **Gallery empty / "We couldn't load"**: Art Institute API may be rate-limiting or the random page number hit a gap. Refresh.
- **IIIF modal blank**: Check the artwork actually has an `image_id`; some records have none.
- **Favorites don't persist**: `localStorage` might be disabled (private mode). The ♥ button tooltip explains this.

## Pass criteria

All manual checklist items are `[x]`. The smoke test prints both `OK:` lines. The static-file check reports `OK: only static assets`.
