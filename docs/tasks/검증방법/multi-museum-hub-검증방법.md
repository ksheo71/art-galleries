# Verification: Multi-museum Hub + Metropolitan App

Covers the changes from the multi-museum iteration:
- Chicago folder renamed `chicago-meseum` → `chicago-museum`.
- New hub page at `apps/index.html`.
- New Metropolitan Museum app at `apps/metropolitan-museum/`.
- PowerShell start/stop server scripts under `scripts/`.

## Prerequisites
- Node.js installed (`npx` available).
- Windows PowerShell 5+ (or PowerShell 7 on any platform).
- Modern browser: latest Chrome, Firefox, Safari, or Edge.

## 1. Start / stop the server (PowerShell)

### Start
```powershell
.\scripts\start-server.ps1              # default port 5173
.\scripts\start-server.ps1 -Port 8080   # custom port
```
The script launches `npx serve apps` in the background, writes the PID + port to `.server-pid`, and waits up to ~7.5 s for a 200 on the root URL.

### Stop
```powershell
.\scripts\stop-server.ps1
```
Reads `.server-pid`, kills the server process tree, and removes the PID file.

### Sanity one-liner (PowerShell, after start)
```powershell
$ports = @(5173,5174,5175,8080); foreach ($p in $ports) { try { $r=Invoke-WebRequest -UseBasicParsing "http://localhost:$p/" -TimeoutSec 1; if ($r.StatusCode -eq 200) { "OK: http://localhost:$p/" } } catch {} }
```

## 2. Static-file smoke test (cross-platform)

Once the server is up, pick the printed URL (e.g., `http://localhost:5173/`) and:

### Windows Git Bash / Linux / macOS
```bash
BASE=http://localhost:5173; \
curl -sf $BASE/ >/dev/null && echo "OK: hub" && \
curl -sf $BASE/chicago-museum/ >/dev/null && echo "OK: chicago" && \
curl -sf $BASE/chicago-museum/search.html?q=monet >/dev/null && echo "OK: chicago search url" && \
curl -sf $BASE/metropolitan-museum/ >/dev/null && echo "OK: metropolitan" && \
curl -sf $BASE/metropolitan-museum/search.html?q=monet >/dev/null && echo "OK: met search url"
```
All five lines must print `OK: ...`.

### PowerShell
```powershell
$base = "http://localhost:5173"
@("/", "/chicago-museum/", "/chicago-museum/search.html?q=monet", "/metropolitan-museum/", "/metropolitan-museum/search.html?q=monet") | ForEach-Object {
    try { $r = Invoke-WebRequest -UseBasicParsing "$base$_" -TimeoutSec 3; "$($r.StatusCode) $_" }
    catch { "FAIL $_" }
}
```
Expect `200 ...` for each line.

## 3. External API reachability

Both APIs must be reachable from the browser origin.

```bash
curl -sf "https://api.artic.edu/api/v1/artworks?limit=1" >/dev/null && echo "OK: chicago api"
curl -sf "https://collectionapi.metmuseum.org/public/collection/v1/search?q=monet&hasImages=true" >/dev/null && echo "OK: met api"
```

## 4. Manual test checklist

Open `http://localhost:5173/` and:

### Hub (FR-08)
- [ ] Two museum cards render — Chicago (red gradient) and Metropolitan (slate gradient).
- [ ] Clicking the Chicago card opens `/chicago-museum/`.
- [ ] Clicking the Met card opens `/metropolitan-museum/`.
- [ ] No console errors on hub load.

### Chicago app regression (FR-01 … FR-07)
- [ ] Main page shows random gallery + search bar.
- [ ] Typing `monet` + Enter goes to `/chicago-museum/search.html?q=monet` and renders results.
- [ ] Detail page + IIIF deep-zoom modal works.
- [ ] Favorites toggle persists (key `chicago-museum.favorites`).

### Metropolitan app (FR-09, mirrors FR-01 … FR-07)
- [ ] Main page shows ~12 highlight cards and a search bar.
- [ ] Typing `monet` + Enter → results grid populates (takes a few seconds due to per-ID fetches).
- [ ] Filters narrow the grid (artist / period / department).
- [ ] Click a card → detail page shows title, artist, date, medium, dimensions, department, credit.
- [ ] "View in high-res" opens a pan-and-zoom viewer; Escape closes it.
- [ ] Related artworks section shows when the artist has others.
- [ ] Favorites persist independently from Chicago (key `metropolitan-museum.favorites`).

### Cross-app favorite isolation
- [ ] Favorite one Chicago artwork and one Met artwork.
- [ ] Chicago's favorites page shows only the Chicago item; Met's favorites page shows only the Met item.

## 5. JS syntax self-check

```bash
# Git Bash / Linux / macOS
cd apps/metropolitan-museum && for f in $(find js -name '*.js'); do node --check "$f" && echo "OK $f" || echo "FAIL $f"; done
```
Every file should report `OK`.

## Pass criteria

- All PowerShell start/stop commands work.
- All smoke-test URLs return 200.
- External APIs respond.
- Manual checklist 100 % passes.
- JS syntax check passes for all Met modules.
