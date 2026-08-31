import { defineConfig } from '@playwright/test'

/**
 * Backend-Integrated E2E 配置
 * 使用真实 Supabase 后端验证 sync 完整链路
 *
 * 环境变量（至少需要一个测试账户）:
 *   TEST_USER_EMAIL      测试账户邮箱（可选，默认自动创建临时用户）
 *   TEST_USER_PASSWORD   测试账户密码（可选）
 *   SUPABASE_URL         默认从 apps/web/.env 继承
 *   SUPABASE_ANON_KEY    默认从 apps/web/.env 继承
 */

export default defineConfig({
  testDir: '.',
  timeout: 180000,
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env.MF_BASE_URL || 'http://localhost:5173',
    viewport: { width: 1366, height: 900 },
    headless: true,
    actionTimeout: 15000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-backend' }]],
})
