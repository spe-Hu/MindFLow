/**
 * Journey 16 – 真实后端：自动同步触发与数据一致性
 * 验证: push dirty → Supabase 真实入库 → 另一前端 pull 后正确展示
 */

import { test, expect, type Page } from '@playwright/test'
import {
  ensureTestUser,
  cleanupUserCloudData,
  injectRealSession,
  clearBrowserData,
  assertDbHasRecord,
  triggerSync,
  waitForSyncStatus,
  getLocalTasks,
  getPendingChangeCount,
  createLocalProjectViaAPI,
} from './supabase-helper'

let testUser: Awaited<ReturnType<typeof ensureTestUser>>

function makeUniqueProjectName(testName: string) {
  return `J16-${testName}-${Date.now()}`
}

test.beforeAll(async () => {
  testUser = await ensureTestUser()
  if (!testUser) {
    test.skip(true, 'Skipping backend integration tests: no test user available')
  }
})

test.beforeEach(async ({ page }) => {
  if (!testUser) return
  await cleanupUserCloudData(testUser.user.id)
  await clearBrowserData(page)
})

test.describe('Journey 16 – Real Backend Auto Sync', () => {
  test('J16-1: 浏览器A创建数据后真实入库到 Supabase', async ({ page }) => {
    const projectName = makeUniqueProjectName('A-create')

    // 1. 注入真实 session，触发前端认证
    await page.goto('/')
    await injectRealSession(page, testUser!.session)
    await page.goto('/app')
    await page.waitForTimeout(2000)

    // 触发 initSession 使 authStore 状态刷新
    const authReady = await page.evaluate(async () => {
      const store = (window as any).__authStore
      await store?.getState?.().initSession?.()
      return !!store?.getState?.().user
    })
    expect(authReady).toBe(true)

    // 2. 直接通过 API 在 IndexedDB 创建项目 + 任务（绕过 UI，更可靠）
    const projectId = await createLocalProjectViaAPI(page, projectName, [
      'J16真实同步任务',
    ])

    // 3. 手动触发同步
    await triggerSync(page)
    await page.waitForTimeout(3000)

    // 5. 轮询：用 supabase-js 直接查 DB 确认数据已真实入库
    let dbProject: any[] = []
    let dbMindmap: any[] = []
    let dbTask: any[] = []

    for (let i = 0; i < 20; i++) {
      try {
        dbProject = await assertDbHasRecord('projects', { name: projectName })
        break
      } catch {
        await page.waitForTimeout(500)
      }
    }
    expect(dbProject.length).toBeGreaterThan(0)
    const dbProjectId = dbProject[0].id

    for (let i = 0; i < 20; i++) {
      try {
        dbMindmap = await assertDbHasRecord('mindmaps', { project_id: dbProjectId })
        break
      } catch {
        await page.waitForTimeout(500)
      }
    }
    expect(dbMindmap.length).toBeGreaterThan(0)

    for (let i = 0; i < 20; i++) {
      try {
        dbTask = await assertDbHasRecord('tasks', { project_id: projectId })
        break
      } catch {
        await page.waitForTimeout(500)
      }
    }
    expect(dbTask.length).toBeGreaterThan(0)
    expect(dbTask[0].title).toBe('J16真实同步任务')
  })

  test('J16-2: 浏览器B打开后自动 pull 云端数据并展示', async ({ browser }) => {
    const projectName = makeUniqueProjectName('B-pull')

    // ---- Phase 1: 浏览器A 创建 + 同步 ----
    const contextA = await browser.newContext()
    const pageA = await contextA.newPage()

    await clearBrowserData(pageA)
    await pageA.goto('/')
    await injectRealSession(pageA, testUser!.session)
    await pageA.goto('/app')
    await pageA.waitForTimeout(2000)

    await pageA.evaluate(async () => {
      const store = (window as any).__authStore
      await store?.getState?.().initSession?.()
    })

    // 直接通过 API 创建项目 + 任务
    await createLocalProjectViaAPI(pageA, projectName, ['跨设备任务'])

    await triggerSync(pageA)
    await pageA.waitForTimeout(3000)

    // 确认云端有数据
    const dbTasks = await assertDbHasRecord('tasks', { title: '跨设备任务' })
    expect(dbTasks.length).toBeGreaterThan(0)

    await contextA.close()

    // ---- Phase 2: 浏览器B 全新上下文，注入同一 session，验证数据展示 ----
    const contextB = await browser.newContext()
    const pageB = await contextB.newPage()

    await clearBrowserData(pageB)
    await pageB.goto('/')
    await injectRealSession(pageB, testUser!.session)
    await pageB.goto('/app')
    await pageB.waitForTimeout(2000)

    await pageB.evaluate(async () => {
      const store = (window as any).__authStore
      await store?.getState?.().initSession?.()
    })

    // 触发一次 pull
    await pageB.evaluate(() => {
      ;(window as any).__resetSyncState?.()
    })
    await triggerSync(pageB)
    await pageB.waitForTimeout(3000)

    // 验证本地 IndexedDB 中已有数据
    const localTasks = await getLocalTasks(pageB)
    const found = localTasks.some((t) => t.title === '跨设备任务')
    expect(found).toBe(true)

    // 验证 UI 侧边栏显示项目名
    await pageB.goto('/')
    await pageB.waitForTimeout(1500)
    const bodyText = await pageB.locator('body').innerText()
    expect(bodyText).toContain(projectName)

    await contextB.close()
  })
})
