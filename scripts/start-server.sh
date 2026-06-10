#!/usr/bin/env bash
#
# Starts the static file server for the Art Gallery app.
# Serves apps/ so the hub (apps/index.html) and each museum are
# available under one origin.
#
# Usage:
#   ./scripts/start-server.sh            # default port 5173
#   ./scripts/start-server.sh 8080       # custom port
#
# The PID and port of the spawned process are written to
# .server-pid at the repo root so stop-server.sh can find it.

set -euo pipefail

PORT="${1:-8010}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APPS_DIR="$REPO_ROOT/apps"
PID_FILE="$REPO_ROOT/.server-pid"
LOG_FILE="$REPO_ROOT/.server-log.txt"

if [ ! -d "$APPS_DIR" ]; then
    echo "Error: apps/ directory not found at $APPS_DIR" >&2
    exit 1
fi

# If a previous PID file exists and that process is still alive, refuse to start.
if [ -f "$PID_FILE" ]; then
    OLD_LINE=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$OLD_LINE" ]; then
        OLD_PID="${OLD_LINE%%,*}"
        if kill -0 "$OLD_PID" 2>/dev/null; then
            echo "Server already running (PID $OLD_PID). Stop it first with ./scripts/stop-server.sh"
            exit 1
        else
            rm -f "$PID_FILE"
        fi
    fi
fi

# Check npx is available
if ! command -v npx &>/dev/null; then
    echo "Error: npx not found. Install Node.js first (https://nodejs.org)." >&2
    exit 1
fi

echo "Starting static server on port $PORT..."
echo "Root:  $APPS_DIR"
echo "URL:   http://localhost:$PORT/"

# Launch serve in the background; capture output to log file.
npx --yes serve "$APPS_DIR" -l "$PORT" >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

echo "$SERVER_PID,$PORT" > "$PID_FILE"

# Wait for the server to become ready (up to 7.5 seconds).
MAX_ATTEMPTS=15
for ((i=1; i<=MAX_ATTEMPTS; i++)); do
    sleep 0.5
    if curl -sf --max-time 2 "http://localhost:$PORT/" -o /dev/null 2>/dev/null; then
        echo "Server ready. PID $SERVER_PID. Open http://localhost:$PORT/"
        exit 0
    fi
    # Bail early if the process already died.
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "Server process exited unexpectedly. Check $LOG_FILE for details."
        rm -f "$PID_FILE"
        exit 1
    fi
done

echo "Server process started (PID $SERVER_PID) but did not respond on http://localhost:$PORT/ within $((MAX_ATTEMPTS / 2)) seconds."
echo "Check $LOG_FILE for details."
exit 0
