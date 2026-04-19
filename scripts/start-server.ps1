#
# Starts the static file server for the Art Gallery app.
# Serves apps/ so the hub (apps/index.html) and each museum are
# available under one origin.
#
# Usage:
#   .\scripts\start-server.ps1              # default port 5173
#   .\scripts\start-server.ps1 -Port 8080   # custom port
#
# The PID and port of the spawned process are written to
# .server-pid at the repo root so stop-server.ps1 can find it.

[CmdletBinding()]
param(
    [int]$Port = 5173
)

$ErrorActionPreference = "Stop"

# Resolve repo root (script lives in <repo>/scripts/)
$repoRoot = Split-Path -Parent $PSScriptRoot
$appsDir  = Join-Path $repoRoot "apps"
$pidFile  = Join-Path $repoRoot ".server-pid"

if (-not (Test-Path $appsDir)) {
    Write-Error "apps/ directory not found at $appsDir"
    exit 1
}

# If a previous PID file exists and that process is still alive, refuse to start.
if (Test-Path $pidFile) {
    $existing = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($existing) {
        $parts = $existing -split ','
        $oldPid = [int]$parts[0]
        if (Get-Process -Id $oldPid -ErrorAction SilentlyContinue) {
            Write-Host "Server already running (PID $oldPid). Stop it first with .\scripts\stop-server.ps1" -ForegroundColor Yellow
            exit 1
        } else {
            Remove-Item $pidFile -Force
        }
    }
}

# Check npx is available
$npx = Get-Command npx -ErrorAction SilentlyContinue
if (-not $npx) {
    Write-Error "npx not found. Install Node.js first (https://nodejs.org)."
    exit 1
}

Write-Host "Starting static server on port $Port..." -ForegroundColor Cyan
Write-Host "Root:  $appsDir"
Write-Host "URL:   http://localhost:$Port/"

# Launch `npx --yes serve apps -l <port>` detached. Redirect output to a log
# so the parent shell returns immediately.
$logFile = Join-Path $repoRoot ".server-log.txt"
$proc = Start-Process `
    -FilePath "npx.cmd" `
    -ArgumentList @("--yes", "serve", $appsDir, "-l", $Port) `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $logFile `
    -RedirectStandardError  "$logFile.err" `
    -PassThru

"$($proc.Id),$Port" | Out-File -FilePath $pidFile -Encoding ascii

# Wait briefly for server to be ready.
$maxAttempts = 15
for ($i = 1; $i -le $maxAttempts; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$Port/" -TimeoutSec 2
        if ($r.StatusCode -eq 200) {
            Write-Host "Server ready. PID $($proc.Id). Open http://localhost:$Port/" -ForegroundColor Green
            exit 0
        }
    } catch {
        # not yet
    }
}

Write-Host "Server process started (PID $($proc.Id)) but did not respond on http://localhost:$Port/ within $($maxAttempts * 0.5) seconds." -ForegroundColor Yellow
Write-Host "Check $logFile for details."
exit 0
