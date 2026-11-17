#!/usr/bin/env bash
# Starts the built app on $PORT (default 3177), replacing anything already there.
set -euo pipefail
PORT="${PORT:-3177}"
LOG="${LOG:-/tmp/ha-studio-server.log}"
if lsof -ti "tcp:$PORT" >/dev/null 2>&1; then
  lsof -ti "tcp:$PORT" | xargs kill -9
  sleep 1
fi
cd "$(dirname "$0")/../apps/web"
nohup node_modules/.bin/next start -p "$PORT" >"$LOG" 2>&1 &
until curl -sfS -o /dev/null "http://127.0.0.1:$PORT/" 2>/dev/null; do sleep 1; done
echo "listening on http://127.0.0.1:$PORT (log: $LOG)"
