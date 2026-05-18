#!/bin/bash
# QUASAR — 重新构建（更新代码后运行此脚本）
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3000

cd "$DIR"

echo "正在重新构建 QUASAR..."
npm run build
echo "构建完成。"

# 询问是否立即启动
read -p "是否立即启动？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  lsof -ti tcp:$PORT | xargs kill -9 2>/dev/null || true
  echo "启动 QUASAR → http://localhost:$PORT"
  npm run start &
  SERVER_PID=$!
  for i in $(seq 1 15); do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" | grep -qE "^(200|304)"; then
      break
    fi
    sleep 1
  done
  open "http://localhost:$PORT"
  echo "QUASAR 已运行 (PID $SERVER_PID)。关闭此窗口即停止服务。"
  wait $SERVER_PID
fi
