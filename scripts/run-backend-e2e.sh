#!/bin/bash
# scripts/run-backend-e2e.sh
# 本地运行真实后端 E2E 测试（建议在已连接 VPN 的环境中运行）

set -e

cd "$(dirname "$0")/.."

# 可选：设置代理
if [ -n "$HTTP_PROXY" ]; then
  echo "⚡ Using proxy: $HTTP_PROXY"
fi

echo "🔧 Checking dev server..."
DEV_PORT=5179
if ! curl -s "http://localhost:$DEV_PORT" > /dev/null 2>&1; then
  echo "❌ Dev server not running at http://localhost:$DEV_PORT"
  echo "   Start it first: npm run dev:web"
  exit 1
fi

echo "✅ Dev server running on port $DEV_PORT"
echo "🧪 Running backend-integration E2E tests..."
echo ""

npx playwright test tests/e2e/backend-integration \
  --config tests/e2e/backend-integration/backend-integration.config.ts \
  "$@"

echo ""
echo "📊 Report: playwright-report-backend/index.html"
