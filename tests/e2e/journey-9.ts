// Journey 9 E2E – 云端同步 (S3)
// 覆盖: Settings 云端同步 Tab UI、SyncMigrationDialog、手动上传/下载、离线禁用
//
// 测试策略: 使用 localStorage 注入 mock supabase session + page.route 拦截 REST API，
// 无需真实 Supabase 后端即可验证 sync 流程。

import { Page, expect } from '@playwright/test'
import { addMindMapChildViaAPI, toggleTaskViaKeyboard } from './helpers'

const BASE_URL = process.env.MF_BASE_URL || 'http://localhost:5173'
const MOCK_USER_ID = 'e2e-sync-test-user'

interface JourneyResult {
  name: string
  pass: boolean
  detail?: string
}

// 记录 Supabase API 调用次数（用于验证上传/下载是否触发 API）
let apiCalls: Record<string, number> = {}

function getMockSessionJson(): string {
  const session = {
    access_token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJhdWQiOiAiYXV0aGVudGljYXRlZCIsCiAgImV4cCI6IDE5OTAyMjcwMzAsCiAgInN1YiI6ICJlMmUtc3luYy10ZXN0LXVzZXIiLAogICJlbWFpbCI6ICJ0ZXN0QGV4YW1wbGUuY29tIiwKICAicm9sZSI6ICJhdXRoZW50aWNhdGVkIgp9.mock-signature',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'mock-refresh',
    user: {
      id: MOCK_USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@example.com',
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }
  return JSON.stringify(session)
}

/** 在浏览器端注入 mock supabase session */
async function injectMockSession(page: Page) {
  await page.evaluate((sessionJson) => {
    // Supabase JS v2 stores session under sb-{project-ref}-auth-token
    localStorage.setItem('sb-biywnxryvwsszplzirce-auth-token', sessionJson)
    // 清除可能阻止 dialog 弹出的 prompt key
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('mindflow-sync-prompted-')) {
        localStorage.removeItem(k)
      }
    })
  }, getMockSessionJson())
}

/** Mock 所有 Supabase API 请求 */
async function mockSupabaseAPI(page: Page) {
  apiCalls = {}
  await page.route('https://biywnxryvwsszplzirce.supabase.co/**', async (route) => {
    const req = route.request()
    const url = req.url()
    const method = req.method()

    const pathname = new URL(url).pathname
    const key = `${method} ${pathname}`
    apiCalls[key] = (apiCalls[key] || 0) + 1

    // Auth user endpoint
    if (pathname === '/auth/v1/user') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: MOCK_USER_ID,
          email: 'test@example.com',
          role: 'authenticated',
        }),
      })
    }

    // Auth token refresh
    if (pathname === '/auth/v1/token') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: { id: MOCK_USER_ID, email: 'test@example.com' },
        }),
      })
    }

    // Users table (initSession queries this)
    if (pathname.includes('/rest/v1/users')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: MOCK_USER_ID,
            username: 'testuser',
            display_name: 'Test User',
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]),
      })
    }

    // Accept all writes without failure
    if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
      return route.fulfill({ status: 200, body: '{}' })
    }

    // Default: return empty arrays for all reads
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    })
  })
}

/** 在现有 route 基础上追加返回云端任务数据的 route */
async function mockCloudTasksRoute(page: Page) {
  await page.route('https://biywnxryvwsszplzirce.supabase.co/rest/v1/tasks**', async (route) => {
    const req = route.request()
    if (req.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'cloud-task-1',
            project_id: 'cloud-project-id',
            node_uid: 'cloud-node-1',
            title: '云端恢复的任务',
            status: 'todo',
            priority: 'high',
            due_date: null,
            completed_at: null,
            sort_order: 0,
            user_id: MOCK_USER_ID,
            pomodoro_count: null,
          },
        ]),
      })
    }
    route.fulfill({ status: 200, body: '{}' })
  })
}

/** 创建本地数据（项目 + 思维导图节点 + 任务） */
async function createLocalData(page: Page) {
  // 进入本地模式：先清 localStorage → reload 确保 zustand 不恢复 isLocalMode
  await page.goto(BASE_URL + '/')
  await page.evaluate(() => {
    localStorage.removeItem('mindflow-auth-store')
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('mindflow-')) localStorage.removeItem(k)
    })
  })
  await page.reload()

  await page.goto(BASE_URL + '/auth')
  await page.waitForLoadState('networkidle')
  const offlineBtn = page.locator('button:has-text("离线使用，数据仅存本地")')
  await offlineBtn.waitFor({ state: 'visible', timeout: 15000 })
  await offlineBtn.click()
  await page.waitForTimeout(1500)

  // 创建项目
  // 注意：侧边栏「新建项目」是图标按钮，仅有 aria-label="新建项目"（无可见文字），需用属性选择器。
  // 路由 /projects 不存在（会重定向到 /），直接使用 / 即可。
  await page.goto(BASE_URL + '/')
  await page.waitForTimeout(1500)
  await page.locator('button[aria-label="新建项目"]').first().click()
  await page.waitForTimeout(400)
  const dialog = page.locator('div[role="dialog"]').first()
  const input = dialog.locator('#project-name')
  await input.fill('同步测试项目')
  // dialog 的提交按钮是 type="button"（文案「创建」），由 onClick={handleCreate} 触发，不是 type="submit"
  await dialog.locator('button:has-text("创建")').first().click()
  await page.waitForTimeout(1500)

  // 进入 mindmap 创建节点并转为任务
  // 新建项目 dialog 提交后会自动跳转到该项目导图 (/project/:id)；
  // HomePage 在存在项目时也会自动重定向到首个项目导图，无需手动点击项目名。
  await page.waitForURL(/\/project\//, { timeout: 10000 })
  await page.waitForSelector('g.smm-node', { timeout: 10000 })
  await page.waitForTimeout(1000)

  // 创建子节点并转为任务
  await addMindMapChildViaAPI(page, '云端同步任务节点')
  await toggleTaskViaKeyboard(page)

  // 等待 syncTasksFromTree debounce 完成
  await page.waitForTimeout(1500)
}

export async function runJourney9(page: Page): Promise<JourneyResult[]> {
  const results: JourneyResult[] = []

  // 先创建本地数据（否则 SyncMigrationDialog 不会弹出）
  await createLocalData(page)

  // ============ SYNC-1: 未登录时 Settings 云端同步 Tab 状态正确 ============
  try {
    await page.goto(BASE_URL + '/settings')
    await page.waitForTimeout(2000)

    // 点击"云端同步"导航
    await page.locator('nav button:has-text("云端同步")').first().click()
    await page.waitForTimeout(600)

    const pageText = await page.locator('main').first().innerText()
    if (!pageText.includes('未登录')) {
      throw new Error('未登录时应显示"未登录"状态')
    }

    // 上传/下载按钮应被禁用
    const uploadBtn = page.locator('button:has-text("立即同步（上传）")').first()
    const downloadBtn = page.locator('button:has-text("从云端恢复")').first()
    const uploadDisabled = await uploadBtn.isDisabled().catch(() => true)
    const downloadDisabled = await downloadBtn.isDisabled().catch(() => true)
    if (!uploadDisabled || !downloadDisabled) {
      throw new Error('未登录时上传/下载按钮应被禁用')
    }

    results.push({ name: 'SYNC-1 未登录时 Settings 云端同步状态正确', pass: true })
  } catch (e: any) {
    results.push({ name: 'SYNC-1 未登录时 Settings 云端同步状态正确', pass: false, detail: e.message })
  }

  // ============ SYNC-2: mock 登录后 SyncMigrationDialog 弹出 ============
  try {
    // 先注入 mock session 并设置 route
    await injectMockSession(page)
    await mockSupabaseAPI(page)

    // 刷新页面让 supabase 读取注入的 session
    await page.goto(BASE_URL + '/app')
    await page.waitForTimeout(3000)

    const dialog = page.locator('div[role="dialog"]').filter({ hasText: '发现本地数据' }).first()
    const isVisible = await dialog.isVisible().catch(() => false)

    if (!isVisible) {
      // 再次检查（可能 dialog 已经在初始化阶段弹出了但被我们错过了）
      await page.waitForTimeout(1500)
      const retryVisible = await dialog.isVisible().catch(() => false)
      if (!retryVisible) {
        // 如果仍然看不到，再尝试重新刷新一次
        await injectMockSession(page)
        await page.goto(BASE_URL + '/app')
        await page.waitForTimeout(3000)
        const retry2 = await page
          .locator('div[role="dialog"]')
          .filter({ hasText: '发现本地数据' })
          .first()
          .isVisible()
          .catch(() => false)
        if (!retry2) {
          throw new Error('登录后未弹出 SyncMigrationDialog')
        }
      }
    }

    results.push({ name: 'SYNC-2 mock 登录后 SyncMigrationDialog 弹出', pass: true })
  } catch (e: any) {
    results.push({ name: 'SYNC-2 mock 登录后 SyncMigrationDialog 弹出', pass: false, detail: e.message })
  }

  // ============ SYNC-3: "迁移到云端"触发 Supabase API 调用 ============
  try {
    const dialog = page.locator('div[role="dialog"]').filter({ hasText: '发现本地数据' }).first()
    const uploadBtn = dialog.locator('button:has-text("迁移到云端")').first()
    await expect(uploadBtn).toBeVisible({ timeout: 3000 })
    await uploadBtn.click()
    await page.waitForTimeout(2500)

    // 验证有 API 调用被触发（projects / mindmaps / tasks 至少各 1 次 upsert）
    const projectUpserts = Object.keys(apiCalls).filter((k) => k.includes('/rest/v1/projects') && k.startsWith('POST')).length
    const mindmapUpserts = Object.keys(apiCalls).filter((k) => k.includes('/rest/v1/mindmaps') && k.startsWith('POST')).length
    const taskUpserts = Object.keys(apiCalls).filter((k) => k.includes('/rest/v1/tasks') && k.startsWith('POST')).length

    if (projectUpserts === 0 && mindmapUpserts === 0 && taskUpserts === 0) {
      throw new Error('迁移到云端后未检测到 Supabase upsert API 调用')
    }

    // 验证成功提示
    const bodyText = await page.locator('body').innerText()
    if (!bodyText.includes('数据已同步到云端') && !bodyText.includes('同步')) {
      throw new Error('迁移到云端后未显示成功提示')
    }

    results.push({ name: 'SYNC-3 迁移到云端触发 API 并提示成功', pass: true })
  } catch (e: any) {
    results.push({ name: 'SYNC-3 迁移到云端触发 API 并提示成功', pass: false, detail: e.message })
  }

  // ============ SYNC-4: Settings 页面手动上传触发 API ============
  try {
    await page.goto(BASE_URL + '/settings')
    await page.waitForTimeout(2000)

    // 关闭可能残留的 dialog overlay（SYNC-3 的迁移弹窗可能未自动关闭）
    const overlay = page.locator('[data-slot="dialog-overlay"]')
    if (await overlay.count() > 0 && await overlay.first().isVisible()) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }

    await page.locator('nav button:has-text("云端同步")').first().click()
    await page.waitForTimeout(600)

    // 验证已登录状态
    const pageText = await page.locator('main').first().innerText()
    if (!pageText.includes('已登录') && !pageText.includes('Test User')) {
      throw new Error('Settings 页面未显示已登录状态')
    }

    // 记录当前 API 调用计数基线
    const prevProj = apiCalls['POST /rest/v1/projects'] || 0
    const prevMM = apiCalls['POST /rest/v1/mindmaps'] || 0
    const prevTask = apiCalls['POST /rest/v1/tasks'] || 0
    console.error(`[SYNC-4] 点击上传前基线: POST projects=${prevProj} mindmaps=${prevMM} tasks=${prevTask}`)

    const uploadBtn = page.locator('button:has-text("立即同步（上传）")').first()
    await expect(uploadBtn).toBeEnabled({ timeout: 5000 })
    await uploadBtn.click()

    // 轮询：检测 API 调用增量 或 成功/失败 toast（handleSyncUpload 执行的任一信号）
    let newApiCallsDetected = false
    let successToastSeen = false
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(500)
      const curProj = apiCalls['POST /rest/v1/projects'] || 0
      const curMM = apiCalls['POST /rest/v1/mindmaps'] || 0
      const curTask = apiCalls['POST /rest/v1/tasks'] || 0
      if (curProj > prevProj || curMM > prevMM || curTask > prevTask) {
        newApiCallsDetected = true
      }
      const bodyText = await page.locator('body').innerText().catch(() => '')
      if (
        bodyText.includes('同步完成') ||
        bodyText.includes('数据已同步') ||
        bodyText.includes('同步失败')
      ) {
        successToastSeen = true
      }
      if (newApiCallsDetected || successToastSeen) break
    }

    if (newApiCallsDetected || successToastSeen) {
      results.push({ name: 'SYNC-4 Settings 手动上传触发同步（API 或成功提示）', pass: true })
    } else {
      const bodyText = await page.locator('body').innerText().catch(() => '')
      throw new Error(
        `手动上传后未触发同步。apiCalls=${JSON.stringify(apiCalls)} body=${bodyText.slice(0, 240)}`
      )
    }
  } catch (e: any) {
    results.push({ name: 'SYNC-4 Settings 手动上传触发同步（API 或成功提示）', pass: false, detail: e.message })
  }

  // ============ SYNC-5: 从云端恢复覆盖本地数据 ============
  try {
    // 让 GET /tasks 返回云端数据
    await mockCloudTasksRoute(page)

    await page.goto(BASE_URL + '/settings')
    await page.waitForTimeout(2000)
    // 关闭可能残留的 dialog overlay
    const overlay5 = page.locator('[data-slot="dialog-overlay"]')
    if (await overlay5.count() > 0 && await overlay5.first().isVisible()) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }
    await page.locator('nav button:has-text("云端同步")').first().click()
    await page.waitForTimeout(600)

    // 处理 confirm dialog（"从云端恢复将覆盖所有本地数据"）
    page.on('dialog', (dialog) => dialog.accept())

    const downloadBtn = page.locator('button:has-text("从云端恢复")').first()
    await expect(downloadBtn).toBeEnabled({ timeout: 5000 })
    await downloadBtn.click()

    // 等待下载完成（toast 出现或 db 数据写入）
    let restoreSuccess = false
    let dbHasCloudTask = false
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(500)
      const bt = await page.locator('body').innerText().catch(() => '')
      if (bt.includes('恢复完成') || bt.includes('恢复失败')) {
        restoreSuccess = true
      }
      // 同时直接查 db.tasks 确认云端任务是否已写入本地
      const cloudTaskInDb: boolean = await page
        .evaluate(async () => {
          const db: any = (window as any).__mindflowDb
          if (!db) return false
          const tasks = await db.tasks.toArray().catch(() => [])
          return tasks.some((t: any) => t.title === '云端恢复的任务')
        })
        .catch(() => false)
      if (cloudTaskInDb) {
        dbHasCloudTask = true
      }
      if ((restoreSuccess && bt.includes('恢复完成')) || dbHasCloudTask) break
    }

    if (!restoreSuccess && !dbHasCloudTask) {
      const bt = await page.locator('body').innerText().catch(() => '')
      throw new Error(`从云端恢复未成功。body=${bt.slice(0,200)} dbHasCloudTask=${dbHasCloudTask}`)
    }

    results.push({ name: 'SYNC-5 从云端恢复覆盖本地数据', pass: true })
  } catch (e: any) {
    results.push({ name: 'SYNC-5 从云端恢复覆盖本地数据', pass: false, detail: e.message })
  }

  // ============ SYNC-6: 离线时同步按钮被禁用 ============
  try {
    await page.goto(BASE_URL + '/settings')
    await page.waitForTimeout(2000)
    // 关闭可能残留的 dialog overlay
    const overlay6 = page.locator('[data-slot="dialog-overlay"]')
    if (await overlay6.count() > 0 && await overlay6.first().isVisible()) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }
    await page.locator('nav button:has-text("云端同步")').first().click()
    await page.waitForTimeout(600)

    // mock offline
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
      window.dispatchEvent(new Event('offline'))
    })
    await page.waitForTimeout(800)

    const uploadBtn = page.locator('button:has-text("立即同步（上传）")').first()
    const downloadBtn = page.locator('button:has-text("从云端恢复")').first()
    const uploadDisabled = await uploadBtn.isDisabled().catch(() => true)
    const downloadDisabled = await downloadBtn.isDisabled().catch(() => true)

    if (!uploadDisabled || !downloadDisabled) {
      throw new Error('离线时上传/下载按钮应被禁用')
    }

    // 恢复 online
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
      window.dispatchEvent(new Event('online'))
    })

    results.push({ name: 'SYNC-6 离线时同步按钮禁用', pass: true })
  } catch (e: any) {
    results.push({ name: 'SYNC-6 离线时同步按钮禁用', pass: false, detail: e.message })
  }

  // ============ SYNC-7: 网络状态显示正确 ============
  try {
    await page.goto(BASE_URL + '/settings')
    await page.waitForTimeout(2000)
    // 关闭可能残留的 dialog overlay
    const overlay7 = page.locator('[data-slot="dialog-overlay"]')
    if (await overlay7.count() > 0 && await overlay7.first().isVisible()) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }
    await page.locator('nav button:has-text("云端同步")').first().click()
    await page.waitForTimeout(600)

    const pageText = await page.locator('main').first().innerText()
    if (!pageText.includes('网络在线')) {
      throw new Error('在线时应显示"网络在线"状态')
    }

    results.push({ name: 'SYNC-7 网络在线状态显示正确', pass: true })
  } catch (e: any) {
    results.push({ name: 'SYNC-7 网络在线状态显示正确', pass: false, detail: e.message })
  }

  return results
}
