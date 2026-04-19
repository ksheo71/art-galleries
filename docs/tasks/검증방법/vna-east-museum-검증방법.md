# Verification: V&A East Museum App

Covers FR-11 — the fourth museum app. Assumes the hub and the other
three museum apps pass their own verifications.

## Prerequisites
- Node.js installed (`npx` available).
- Modern browser.

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
BASE=http://localhost:5173; ID=O132743; \
curl -sf $BASE/ >/dev/null                                                 && echo "OK: hub"          && \
curl -sf $BASE/vna-east-museum/ >/dev/null                                 && echo "OK: vna home"     && \
curl -sf "$BASE/vna-east-museum/search.html?q=monet" >/dev/null            && echo "OK: search url"   && \
curl -sf "$BASE/vna-east-museum/artwork.html?id=$ID" >/dev/null            && echo "OK: artwork url"  && \
curl -sf $BASE/vna-east-museum/favorites.html >/dev/null                   && echo "OK: favorites"    && \
curl -sf $BASE/vna-east-museum/js/api.js >/dev/null                        && echo "OK: api.js"
```

### PowerShell
```powershell
$base = "http://localhost:5173"
@(
  "/", "/vna-east-museum/",
  "/vna-east-museum/search.html?q=monet",
  "/vna-east-museum/artwork.html?id=O132743",
  "/vna-east-museum/favorites.html",
  "/vna-east-museum/js/api.js"
) | ForEach-Object {
  try { $r = Invoke-WebRequest -UseBasicParsing "$base$_" -TimeoutSec 3; "$($r.StatusCode) $_" }
  catch { "FAIL $_" }
}
```

## 3. External API reachability

```bash
curl -sf "https://api.vam.ac.uk/v2/objects/search?q=monet&images_exist=true&page_size=1" >/dev/null && echo "OK: vna api"
curl -sf "https://framemark.vam.ac.uk/collections/2015HK9614/info.json" >/dev/null && echo "OK: vna iiif"
```

## 4. JS syntax self-check

```bash
cd apps/vna-east-museum && for f in $(find js -name '*.js'); do node --check "$f" && echo "OK $f" || echo "FAIL $f"; done
```

## 5. Manual test checklist

Open `http://localhost:5173/` and:

### Hub (FR-08 regression with 4 cards)
- [ ] Four distinct museum cards render (red / slate / emerald / amber).
- [ ] Grid reflows: 1 col mobile, 2 cols at md, 4 cols at xl.
- [ ] The V&A card links to `/vna-east-museum/`.

### V&A East app (FR-11)
- [ ] Main page shows ~12 objects from the random IIIF-backed preview + a big search bar.
- [ ] Typing `monet` + Enter navigates to `.../search.html?q=monet` and renders results (some hits will be posters / models / photographs since V&A has broad object types).
- [ ] "Load more" fetches the next page.
- [ ] Filter sidebar populates maker + object type from the loaded pool.
- [ ] Period filter (From 1850 / To 1920) narrows the grid.
- [ ] Clicking a card → detail page with title, maker, date, medium (materialsAndTechniques), classification (objectType), dimensions (formatted from the array), place of origin, credit, and a description section (summaryDescription) when present.
- [ ] "View in high-res" opens a pan/zoom viewer powered by IIIF tiles via `info.json`.
- [ ] Escape closes the viewer.
- [ ] Favoriting an object persists under the key `vna-east-museum.favorites` and does not leak into the other three museums' favorites.

### Cross-app favorite isolation (4-way)
- [ ] Favorite one object in each of the four museums and confirm each `/favorites.html` page lists only its own items.

## Pass criteria

- All HTTP smoke tests return 200.
- V&A API and IIIF `info.json` are reachable.
- All JS modules pass `node --check`.
- Manual checklist is fully green, including IIIF deep-zoom.
