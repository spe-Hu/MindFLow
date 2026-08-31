/**
 * Journey 21 – 真实后端：自动同步触发器
 * 验证: 断网期间修改 task → Dexie hook 设 dirty → AppLayout 断网不 autoPush →
 *       恢复联网后 `online` 事件自动触发 scheduleAutoSync() → doAutoSync() →
 *       push dirty records → 云端真实更新（全程不手动 triggerSync）
 */

import { test, expect } from '@playwright/test'
import {
  ensureTestUser,
  cleanupUserCloudData,
  injectRealSession,
  clearBrowserData,
  assertDbHasRecord,
  triggerSync,
  createLocalProjectViaAPI,
  getFreshSession,
  setNavigatorOnLine,
  waitForSyncComplete,
} from './supabase-helper'

let testUser: Awaited<ReturnType<typeof ensureTestUser>>

function makeUniqueProjectName(suffix: string) {
  return `J21-${suffix}-${Date.now()}`
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

test.describe('Journey 21 – Real Backend Auto Sync Triggers', () => {
  test('J21-1: 断网修改后恢复联网，online 事件自动触发同步', async ({ browser }) => {
    const projectName = makeUniqueProjectName('auto-trigger')

    // =================== Phase 1: 浏览器 A 创建并 push ===================
    const ctxA = await browser.newContext()
    const pageA = await ctxA.newPage()

    await clearBrowserData(pageA)
    await pageA.goto('/')
    await injectRealSession(pageA, testUser!.session)
    await pageA.goto('/app')
    await pageA.waitForTimeout(2000)
    await pageA.evaluate(async () => {
      await (window as any).__authStore?.getState?.().initSession?.()
    })

    const projectId = await createLocalProjectViaAPI(pageA, projectName, [
      'J21自动同步任务',
    ])

    await triggerSync(pageA)
    await pageA.waitForTimeout(3000)

    // 确认云端有数据
    const initialTasks = await assertDbHasRecord('tasks', {
      title: 'J21自动同步任务',
    })
    expect(initialTasks.length).toBeGreaterThan(0)
    const taskId = initialTasks[0].id

    await ctxA.close()

    // =================== Phase 2: 浏览器 B 打开并 pull 初始数据 ===================
    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()

    await clearBrowserData(pageB)
    await pageB.goto('/')
    const freshSession = await getFreshSession()
    await injectRealSession(pageB, freshSession)
    await pageB.goto('/app')
    await pageB.waitForTimeout(2000)
    await pageB.evaluate(async () => {
      await (window as any).__authStore?.getState?.().initSession?.()
    })

    // 先 pull 一次让 B 本地有数据
    await pageB.evaluate(() => (window as any).__resetSyncState?.())
    await triggerSync(pageB)
    await pageB.waitForTimeout(3000)

    // 确认 B 本地有数据
    const titleBefore = await pageB.evaluate(async (tid) => {
      const db = (window as any).__mindflowDb
      if (!db) return null
      const t = await db.tasks.get(tid)
      return t?.title ?? null
    }, taskId)
    expect(titleBefore).toBe('J21自动同步任务')

    // 重置 sync 状态（避免 30 秒最小间隔限制）
    await pageB.evaluate(() => (window as any).__resetSyncState?.())

    // =================== Phase 3: B 断网 → 修改本地 task ===================
    await setNavigatorOnLine(pageB, false)
    await pageB.waitForTimeout(800)

    // 修改本地 task title（Dexie updating hook 会设 _localDirty = true）
    const newTitle = 'J21自动同步任务-已修改'
    await pageB.evaluate(async ({ taskId, newTitle }) => {
      const db = (window as any).__mindflowDb
      if (!db) throw new Error('__mindflowDb not exposed')
      await db.tasks.update(taskId, { title: newTitle })
    }, { taskId, newTitle })

    // 验证本地已修改
    const titleAfterOffline = await pageB.evaluate(async (tid) => {
      const db = (window as any).__mindflowDb
      const t = await db.tasks.get(tid)
      return t?.title ?? null
    }, taskId)
    expect(titleAfterOffline).toBe(newTitle)

    // 验证 dirty flag 已设置
    const isDirty = await pageB.evaluate(async (tid) => {
      const db = (window as any).__mindflowDb
      const t = await db.tasks.get(tid)
      return t?._localDirty ?? false
    }, taskId)
    expect(isDirty).toBe(true)

    // =================== Phase 4: 恢复联网 → 不手动 triggerSync ===================
    // 再次重置 sync 状态（因为 Phase 2 的 pull 更新了 lastSyncTimestamp）
    await pageB.evaluate(() => (window as any).__resetSyncState?.())

    await setNavigatorOnLine(pageB, true)

    // 等待 autoSync 执行（handleOnline → scheduleAutoSync → 500ms debounce + push+pull）
    await waitForSyncComplete(pageB, 20000)

    // =================== Phase 5: 验证云端已更新 ===================
    const cloudTasks = await assertDbHasRecord('tasks', { id: taskId })
    expect(cloudTasks[0].title).toBe(newTitle)

    // 验证本地 dirty 已清除
    const isDirtyAfter = await pageB.evaluate(async (tid) => {
      const db = (window as any).__mindflowDb
      const t = await db.tasks.get(tid)
      return t?._localDirty ?? false
    }, taskId)
    expect(isDirtyAfter).toBe(false)

    await ctxB.close()
  })

  test('J21-2: visibilitychange 重新聚焦后自动触发同步', async ({ page }) => {
    const projectName = makeUniqueProjectName('vis-trigger')

    // Phase 1: 创建 + push
    await page.goto('/')
    await injectRealSession(page, testUser!.session)
    await page.goto('/app')
    await page.waitForTimeout(2000)
    await page.evaluate(async () => {
      await (window as any).__authStore?.getState?.().initSession?.()
    })

    const projectId = await createLocalProjectViaAPI(page, projectName, [
      'J21聚焦同步任务',
    ])

    await triggerSync(page)
    await page.waitForTimeout(3000)

    const initialTasks = await assertDbHasRecord('tasks', {
      title: 'J21聚焦同步任务',
    })
    const taskId = initialTasks[0].id

    // Phase 2: 重置 sync 状态，然后修改本地 title（不 push）
    await page.evaluate(() => (window as any).__resetSyncState?.())

    const modifiedTitle = 'J21聚焦同步任务-改后'
    await page.evaluate(async ({ taskId, title }) => {
      const db = (window as any).__mindflowDb
      await db.tasks.update(taskId, { title })
    }, { taskId, title: modifiedTitle })

    // Phase 3: 模拟 visibilitychange hidden → visible
    // 先 hidden（此时不会触发 sync）
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
        writable: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(800)

    // 再重置 sync 状态，然后 visible
    await page.evaluate(() => (window as any).__resetSyncState?.())

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
        writable: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // 等待 autoSync debounce + push+pull 完成
    await waitForSyncComplete(page, 20000)

    // Phase 4: 验证云端已更新
    const cloudTasks = await assertDbHasRecord('tasks', { id: taskId })
    expect(cloudTasks[0].title).toBe(modifiedTitle)
  })
})
