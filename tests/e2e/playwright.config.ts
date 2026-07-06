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
})
