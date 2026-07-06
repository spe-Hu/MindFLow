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
  webServer: {
    command: 'cd /Users/wentao.hu/Documents/HomePage/00-projects/00-doing/MindFlow/Mindflow-workbuddy/src/frontend && npx vite preview --port 5173 --host 0.0.0.0',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    timeout: 60000,
  },
})
