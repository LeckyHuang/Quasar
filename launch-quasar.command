#!/bin/bash
# QUASAR — double-click to start
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3000

cd "$DIR"

# Kill any existing server on the port
lsof -ti tcp:$PORT | xargs kill -9 2>/dev/null || true

echo "Starting QUASAR on http://localhost:$PORT ..."
npm run dev &
SERVER_PID=$!

# Wait until port is open (max 30s)
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT | grep -q "200"; then
    break
  fi
  sleep 1
done

# Open browser
open "http://localhost:$PORT"

echo "QUASAR is running (PID $SERVER_PID). Close this window to stop the server."
wait $SERVER_PID
