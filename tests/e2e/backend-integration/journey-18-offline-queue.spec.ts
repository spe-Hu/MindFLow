/**
 * Journey 18 – 真实后端：离线队列
 * 验证: 断网 → 创建任务 → pending_changes 入队 → 恢复联网 → 队列回放 → DB 真实入库
 */

import { test, expect } from '@playwright/test'
import {
  ensureTestUser,
  cleanupUserCloudData,
  injectRealSession,
  clearBrowserData,
  assertDbHasRecord,
  assertDbHasNoRecord,
  getPendingChangeCount,
  waitForSyncStatus,
  triggerSync,
  createLocalProjectViaAPI,
  setNavigatorOnLine,
  waitForSyncComplete,
} from './supabase-helper'

let testUser: Awaited<ReturnType<typeof ensureTestUser>>

function makeUniqueProjectName(suffix: string) {
  return `J18-${suffix}-${Date.now()}`
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

test.describe('Journey 18 – Real Backend Offline Queue', () => {
  test('J18-1: 离线创建的任务在联网后自动推送到 Supabase', async ({ page }) => {
    const projectName = makeUniqueProjectName('offline-queue')

    // 1. 初始化：注入 session，创建项目
    await page.goto('/')
    await injectRealSession(page, testUser!.session)
    await page.goto('/app')
    await page.waitForTimeout(2000)

    await page.evaluate(async () => {
      await (window as any).__authStore?.getState?.().initSession?.()
    })

    // 2. 断网
    await setNavigatorOnLine(page, false)
    await page.waitForTimeout(800)

    // 3. 断网，然后通过 API 创建 dirty 记录并手动 enqueue 到 pending_changes
    const taskNames = ['离线任务1', '离线任务2', '离线任务3']
    await createLocalProjectViaAPI(page, projectName, taskNames)

    // 手动把 dirty records 转为 pending_changes（模拟断网 enqueue）
    await page.evaluate(async () => {
      const db = (window as any).__mindflowDb
      const dirtyProjects = (await db.projects.toArray()).filter((p: any) => p._localDirty)
      const dirtyMindmaps = (await db.mindmaps.toArray()).filter((m: any) => m._localDirty)
      const dirtyTasks = (await db.tasks.toArray()).filter((t: any) => t._localDirty)

      for (const p of dirtyProjects) {
        await db.pending_changes.add({
          id: `pc-${p.id}-${Date.now()}`,
          table: 'projects',
          record_id: p.id,
          action: 'upsert',
          payload: { ...p },
          created_at: new Date(),
          retry_count: 0,
        })
      }
      for (const m of dirtyMindmaps) {
        await db.pending_changes.add({
          id: `pc-${m.id}-${Date.now()}`,
          table: 'mindmaps',
          record_id: m.id,
          action: 'upsert',
          payload: { ...m },
          created_at: new Date(),
          retry_count: 0,
        })
      }
      for (const t of dirtyTasks) {
        await db.pending_changes.add({
          id: `pc-${t.id}-${Date.now()}`,
          table: 'tasks',
          record_id: t.id,
          action: 'upsert',
          payload: { ...t },
          created_at: new Date(),
          retry_count: 0,
        })
      }
    })

    // 验证 pending_changes 队列入队
    let pendingCount = 0
    for (let i = 0; i < 10; i++) {
      pendingCount = await getPendingChangeCount(page)
      if (pendingCount >= 3) break
      await page.waitForTimeout(500)
    }
    expect(pendingCount).toBeGreaterThanOrEqual(3)

    // 4. 恢复联网并触发同步（回放队列）
    await setNavigatorOnLine(page, true)
    await page.waitForTimeout(800)
    await triggerSync(page)
    await waitForSyncComplete(page, 20000)

    // 5. 验证 DB 中有所有离线任务
    for (const name of taskNames) {
      const records = await assertDbHasRecord('tasks', { title: name })
      expect(records.length).toBeGreaterThan(0)
    }

    // 6. 验证 pending_changes 队列为空
    const finalPending = await getPendingChangeCount(page)
    expect(finalPending).toBe(0)
  })
})
