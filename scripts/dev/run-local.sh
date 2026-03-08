#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @mvp/api dev &
API_PID=$!

pnpm --filter @mvp/worker dev &
WORKER_PID=$!

pnpm --filter @mvp/web-admin dev &
WEB_PID=$!

pnpm --filter @mvp/mobile dev:ios &
MOBILE_PID=$!

cleanup() {
  kill "$API_PID" "$WORKER_PID" "$WEB_PID" "$MOBILE_PID" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

set +e
wait -n "$API_PID" "$WORKER_PID" "$WEB_PID" "$MOBILE_PID"
STATUS=$?
set -e

exit "$STATUS"
