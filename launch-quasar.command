#!/bin/bash
# QUASAR — double-click to start (production mode)
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3000

cd "$DIR"

# Kill any existing server on the port
lsof -ti tcp:$PORT | xargs kill -9 2>/dev/null || true

# Build if no production build exists yet
if [ ! -f ".next/BUILD_ID" ]; then
  echo "首次启动，正在构建 QUASAR（约 30-60s，之后每次秒开）..."
  npm run build
  echo "构建完成。"
fi

echo "启动 QUASAR → http://localhost:$PORT"
npm run start &
SERVER_PID=$!

# Wait until server is ready (max 15s, production starts in ~3-5s)
for i in $(seq 1 15); do
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" | grep -qE "^(200|304)"; then
    break
  fi
  sleep 1
done

open "http://localhost:$PORT"

echo "QUASAR 已运行 (PID $SERVER_PID)。关闭此窗口即停止服务。"
wait $SERVER_PID
