import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 120000,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1366, height: 900 },
    headless: true,
    actionTimeout: 15000,
    trace: 'on',
    screenshot: 'only-on-failure',
  },
  workers: 1, // 顺序执行，避免数据竞争
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  /* 自动起服务：本地复用已运行的 dev server，CI 从零启动。
     用 dev server 而非 preview 构建，避免 PWA service worker 干扰测试。 */
  webServer: {
    command: 'cd ../.. && npm run dev:web -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    timeout: 180000,
    reuseExistingServer: !process.env.CI,
  },
})
