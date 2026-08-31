/**
 * Journey 20 – 真实后端：删除同步
 * 验证: 断网期间删除本地记录 → pending_changes 入队 → 恢复联网后回放 delete action →
 *       云端 projects / mindmaps / tasks 均被清理
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
  triggerSync,
  createLocalProjectViaAPI,
  getFreshSession,
  setNavigatorOnLine,
  waitForSyncComplete,
} from './supabase-helper'

let testUser: Awaited<ReturnType<typeof ensureTestUser>>

function makeUniqueProjectName(suffix: string) {
  return `J20-${suffix}-${Date.now()}`
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

test.describe('Journey 20 – Real Backend Delete Sync', () => {
  test('J20-1: 断网删除任务后恢复联网，云端任务被同步删除', async ({ page }) => {
    const projectName = makeUniqueProjectName('delete')

    // =================== Phase 1: 创建并 push 初始数据 ===================
    await page.goto('/')
    await injectRealSession(page, testUser!.session)
    await page.goto('/app')
    await page.waitForTimeout(2000)
    await page.evaluate(async () => {
      await (window as any).__authStore?.getState?.().initSession?.()
    })

    const projectId = await createLocalProjectViaAPI(page, projectName, [
      'J20待删除任务',
    ])

    const dirtyBefore = await page.evaluate(async () => {
      const db = (window as any).__mindflowDb
      const projs = (await db.projects.toArray()).filter((p: any) => p._localDirty)
      const mms = (await db.mindmaps.toArray()).filter((m: any) => m._localDirty)
      const ts = (await db.tasks.toArray()).filter((t: any) => t._localDirty)
      return { projects: projs.length, mindmaps: mms.length, tasks: ts.length }
    })
    console.log('[J20-DIAG] dirty counts before triggerSync:', dirtyBefore)

    await triggerSync(page)
    await page.waitForTimeout(3000)

    // Diagnostic: verify sync actually succeeded
    const syncState = await page.evaluate(() => {
      const s = (window as any).__syncStore?.getState?.()
      return {
        status: s?.status ?? 'unknown',
        lastError: s?.lastError ?? null,
        lastSyncTime: s?.lastSyncTime ?? null,
      }
    })
    console.log('[J20-DIAG] sync state after triggerSync:', syncState)

    // 确认云端已有数据
    const initialTasks = await assertDbHasRecord('tasks', {
      title: 'J20待删除任务',
    })
    expect(initialTasks.length).toBeGreaterThan(0)
    const taskId = initialTasks[0].id
    const mindmapId = `${projectId}-mm`

    // =================== Phase 2: 断网 → 本地删除 + enqueue pending delete ===================
    await setNavigatorOnLine(page, false)
    await page.waitForTimeout(800)

    // 本地直接删除 records，同时把 delete action 入队到 pending_changes
    await page.evaluate(
      async ({ projectId, taskId, mindmapId }) => {
        const db = (window as any).__mindflowDb
        if (!db) throw new Error('__mindflowDb not exposed')

        // 本地直接删除
        await db.projects.delete(projectId)
        await db.mindmaps.delete(mindmapId)
        await db.tasks.delete(taskId)

        // enqueue delete actions for playback
        await db.pending_changes.add({
          id: `pc-del-task-${taskId}`,
          table: 'tasks',
          record_id: taskId,
          action: 'delete',
          payload: {},
          created_at: new Date(),
          retry_count: 0,
        })
      },
      { projectId, taskId, mindmapId }
    )

    const pendingBefore = await getPendingChangeCount(page)
    expect(pendingBefore).toBeGreaterThanOrEqual(1)

    // =================== Phase 3: 恢复联网 → triggerSync → playback delete ===================
    await page.evaluate(() => (window as any).__resetSyncState?.())
    await triggerSync(page)

    // =================== Phase 4: 验证 ===================
    // 4a. pending_changes 队列清空
    const finalPending = await getPendingChangeCount(page)
    expect(finalPending).toBe(0)

    // 4b. 云端 task 已删除
    await assertDbHasNoRecord('tasks', { id: taskId })
    // 4c. 云端 project / mindmap 仍存在（我们只删了 task，若需全删需同时 enqueue）
    const remainingProjects = await assertDbHasRecord('projects', { id: projectId })
    expect(remainingProjects.length).toBeGreaterThan(0)
  })

  test('J20-2: 断网删除整个项目树后恢复联网，云端全部清理', async ({ page }) => {
    const projectName = makeUniqueProjectName('tree-delete')

    // Phase 1: 创建 + push
    await page.goto('/')
    await injectRealSession(page, testUser!.session)
    await page.goto('/app')
    await page.waitForTimeout(2000)
    await page.evaluate(async () => {
      await (window as any).__authStore?.getState?.().initSession?.()
    })

    const projectId = await createLocalProjectViaAPI(page, projectName, [
      'J20树删除任务A',
      'J20树删除任务B',
    ])
    const mindmapId = `${projectId}-mm`

    await triggerSync(page)
    await page.waitForTimeout(3000)

    // 获取云端 task IDs
    const initialTasks = await assertDbHasRecord('tasks', { project_id: projectId })
    expect(initialTasks.length).toBe(2)
    const taskIds = initialTasks.map((t: any) => t.id)

    // Phase 2: 断网 → 本地批量删除 + enqueue delete actions
    await setNavigatorOnLine(page, false)
    await page.waitForTimeout(800)

    await page.evaluate(
      async ({ projectId, mindmapId, taskIds }) => {
        const db = (window as any).__mindflowDb
        if (!db) throw new Error('__mindflowDb not exposed')

        // 本地批量删除
        await db.projects.delete(projectId)
        await db.mindmaps.delete(mindmapId)
        for (const id of taskIds) {
          await db.tasks.delete(id)
        }

        // 为每个表 enqueue delete action
        await db.pending_changes.add({
          id: `pc-del-prj-${projectId}`,
          table: 'projects',
          record_id: projectId,
          action: 'delete',
          payload: {},
          created_at: new Date(),
          retry_count: 0,
        })
        await db.pending_changes.add({
          id: `pc-del-mm-${mindmapId}`,
          table: 'mindmaps',
          record_id: mindmapId,
          action: 'delete',
          payload: {},
          created_at: new Date(),
          retry_count: 0,
        })
        for (const id of taskIds) {
          await db.pending_changes.add({
            id: `pc-del-task-${id}`,
            table: 'tasks',
            record_id: id,
            action: 'delete',
            payload: {},
            created_at: new Date(),
            retry_count: 0,
          })
        }
      },
      { projectId, mindmapId, taskIds }
    )

    const pendingBefore = await getPendingChangeCount(page)
    expect(pendingBefore).toBe(4)

    // Phase 3: 恢复联网 → sync
    await setNavigatorOnLine(page, true)
    await page.waitForTimeout(800)
    // 重置 sync 状态，避免 MIN_SYNC_INTERVAL 挡住 playback
    await page.evaluate(() => (window as any).__resetSyncState?.())
    await triggerSync(page)
    await page.waitForTimeout(5000)

    // Phase 4: 验证云端全部干净
    const finalPending = await getPendingChangeCount(page)
    expect(finalPending).toBe(0)

    await assertDbHasNoRecord('projects', { id: projectId })
    await assertDbHasNoRecord('mindmaps', { id: mindmapId })
    for (const id of taskIds) {
      await assertDbHasNoRecord('tasks', { id })
    }
  })
})
