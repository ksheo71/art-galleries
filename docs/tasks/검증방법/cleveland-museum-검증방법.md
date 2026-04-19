# Verification: Cleveland Museum App

Covers FR-10 — the third museum app added to the hub. Assumes
`apps/index.html`, `apps/metropolitan-museum/`, and
`apps/chicago-museum/` already pass their own verifications.

## Prerequisites
- Node.js installed (`npx` available).
- Modern browser: latest Chrome, Firefox, Safari, or Edge.

## 1. Start / stop the server

### PowerShell (Windows)
```powershell
.\scripts\start-server.ps1 -Port 5173
# ... test ...
.\scripts\stop-server.ps1
```

### Cross-platform fallback
```bash
npx --yes serve apps -l 5173
```

## 2. Static-file smoke test

### Git Bash / Linux / macOS
```bash
BASE=http://localhost:5173; \
curl -sf $BASE/ >/dev/null                                                  && echo "OK: hub"          && \
curl -sf $BASE/cleveland-museum/ >/dev/null                                 && echo "OK: cleveland"    && \
curl -sf $BASE/cleveland-museum/search.html?q=monet >/dev/null              && echo "OK: search url"   && \
curl -sf $BASE/cleveland-museum/artwork.html?id=135382 >/dev/null           && echo "OK: artwork url"  && \
curl -sf $BASE/cleveland-museum/favorites.html >/dev/null                   && echo "OK: favorites"    && \
curl -sf $BASE/cleveland-museum/js/api.js >/dev/null                        && echo "OK: api.js"
```

### PowerShell
```powershell
$base = "http://localhost:5173"
@(
  "/", "/cleveland-museum/",
  "/cleveland-museum/search.html?q=monet",
  "/cleveland-museum/artwork.html?id=135382",
  "/cleveland-museum/favorites.html",
  "/cleveland-museum/js/api.js"
) | ForEach-Object {
  try { $r = Invoke-WebRequest -UseBasicParsing "$base$_" -TimeoutSec 3; "$($r.StatusCode) $_" }
  catch { "FAIL $_" }
}
```
Expect `200 ...` on every line.

## 3. External API reachability

```bash
curl -sf "https://openaccess-api.clevelandart.org/api/artworks/?q=monet&has_image=1&limit=1" >/dev/null && echo "OK: cleveland api"
```

## 4. JS syntax self-check

```bash
# From repo root, Git Bash / Linux / macOS
cd apps/cleveland-museum && for f in $(find js -name '*.js'); do node --check "$f" && echo "OK $f" || echo "FAIL $f"; done
```

## 5. Manual test checklist

Open `http://localhost:5173/` and:

### Hub (FR-08 regression with 3 cards)
- [ ] Three museum cards appear in a responsive grid (1 / 2 / 3 columns).
- [ ] Red (Chicago) / slate (Met) / emerald (Cleveland) gradients are distinct.
- [ ] Clicking the Cleveland card opens `/cleveland-museum/`.

### Cleveland app (FR-10)
- [ ] Main page shows ~12 random artworks with images + a search bar.
- [ ] Typing `monet` + Enter goes to `/cleveland-museum/search.html?q=monet` and renders results.
- [ ] "Load more" fetches the next page (API `skip` increases).
- [ ] Filter sidebar populates from aggregates (artist + department) after results load.
- [ ] Period filter (e.g., From 1860, To 1900) narrows the grid.
- [ ] Department dropdown narrows the grid.
- [ ] Card click → detail page with title, artist, date, medium (from `technique`), classification (from `type`), dimensions, place of origin (from culture), department, credit line.
- [ ] "View in high-res" opens a pan-and-zoom viewer using the `print` image. Escape closes it.
- [ ] Public-domain artworks show the "Public domain (CC0)" note.
- [ ] Related artworks row shows other works by the same artist (or same department as fallback).
- [ ] Favoriting persists and is isolated from Chicago and Met (key `cleveland-museum.favorites`).

### Cross-app favorite isolation (3-way)
- [ ] Favorite one artwork in each museum.
- [ ] Each museum's `/favorites.html` lists only its own item.

## Pass criteria

All HTTP smoke tests return 200, external Cleveland API is reachable,
JS modules pass syntax check, and the manual checklist is fully green.
