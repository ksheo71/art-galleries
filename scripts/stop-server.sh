#!/usr/bin/env bash
#
# Stops the static file server started by start-server.sh.
#
# Reads .server-pid at the repo root, kills that process, and
# removes the PID file. If the PID file is missing, tries to find any
# process listening on the recorded port (best effort).
#
# Usage:
#   ./scripts/stop-server.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$REPO_ROOT/.server-pid"

if [ ! -f "$PID_FILE" ]; then
    echo "No .server-pid file found. Server may not be running."
    exit 0
fi

LINE=$(cat "$PID_FILE" 2>/dev/null | head -1 | tr -d '[:space:]' || true)
if [ -z "$LINE" ]; then
    rm -f "$PID_FILE"
    echo "Empty PID file. Removed."
    exit 0
fi

SERVER_PID="${LINE%%,*}"
PORT="${LINE##*,}"
[ "$PORT" = "$SERVER_PID" ] && PORT=""

echo "Stopping server (recorded PID $SERVER_PID, port $PORT)..."

# Kill the recorded process and its entire process group.
if kill -0 "$SERVER_PID" 2>/dev/null; then
    # Kill child processes first (npx spawns node).
    pkill -P "$SERVER_PID" 2>/dev/null || true
    kill "$SERVER_PID" 2>/dev/null || true
fi

# Belt-and-suspenders: if the port is still bound, kill that process too.
if [ -n "$PORT" ]; then
    # macOS: lsof; Linux: ss or fuser
    if command -v lsof &>/dev/null; then
        BOUND_PID=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
        if [ -n "$BOUND_PID" ]; then
            kill $BOUND_PID 2>/dev/null || true
        fi
    elif command -v fuser &>/dev/null; then
        fuser -k "${PORT}/tcp" 2>/dev/null || true
    fi
fi

rm -f "$PID_FILE"
echo "Server stopped."
