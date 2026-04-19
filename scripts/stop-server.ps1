#
# Stops the static file server started by start-server.ps1.
#
# Reads .server-pid at the repo root, kills that process tree, and
# removes the PID file. If the PID file is missing, tries to find any
# process listening on the recorded port (best effort).
#
# Usage:
#   .\scripts\stop-server.ps1

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$pidFile  = Join-Path $repoRoot ".server-pid"

if (-not (Test-Path $pidFile)) {
    Write-Host "No .server-pid file found. Server may not be running." -ForegroundColor Yellow
    exit 0
}

$line = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
if (-not $line) {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host "Empty PID file. Removed." -ForegroundColor Yellow
    exit 0
}

$parts = $line -split ','
$serverPid = [int]$parts[0]
$port = if ($parts.Length -gt 1) { [int]$parts[1] } else { $null }

Write-Host "Stopping server (recorded PID $serverPid, port $port)..." -ForegroundColor Cyan

# Kill the recorded process and any children (npx spawns node). Walk CIM.
function Stop-ProcessTree {
    param([int]$RootPid)
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$RootPid" -ErrorAction SilentlyContinue
    foreach ($c in $children) { Stop-ProcessTree -RootPid $c.ProcessId }
    try {
        Stop-Process -Id $RootPid -Force -ErrorAction SilentlyContinue
    } catch {}
}

if (Get-Process -Id $serverPid -ErrorAction SilentlyContinue) {
    Stop-ProcessTree -RootPid $serverPid
}

# Belt-and-suspenders: if the port is still bound to some node.exe, kill those too.
if ($port) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($c in $conns) {
            if (Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue) {
                Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {}
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
Write-Host "Server stopped." -ForegroundColor Green
