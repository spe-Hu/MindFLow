/**
 * Journey 22 – 真实后端：离线队列失败重试
 * 验证: pending_changes 回放失败 → retry_count 递增 → 达到 MAX_RETRIES=5 后丢弃
 */

import { test, expect } from '@playwright/test'
import {
  ensureTestUser,
  cleanupUserCloudData,
  injectRealSession,
  clearBrowserData,
  getPendingChangeCount,
  triggerSync,
  createLocalProjectViaAPI,
} from './supabase-helper'

let testUser: Awaited<ReturnType<typeof ensureTestUser>>

function makeUniqueProjectName(suffix: string) {
  return `J22-${suffix}-${Date.now()}`
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

test.describe('Journey 22 – Real Backend Offline Retry & Dead Letter', () => {
  test('J22-1: pending_changes 回放失败后 retry_count 递增并最终丢弃', async ({ page }) => {
    const projectName = makeUniqueProjectName('retry')

    // =================== Phase 1: 创建项目 + 任务并 push 到云端 ===================
    await page.goto('/')
    await injectRealSession(page, testUser!.session)
    await page.goto('/app')
    await page.waitForTimeout(2000)
    await page.evaluate(async () => {
      await (window as any).__authStore?.getState?.().initSession?.()
    })

    const projectId = await createLocalProjectViaAPI(page, projectName, [
      'J22重试测试任务',
    ])

    await triggerSync(page)
    await page.waitForTimeout(3000)

    // 获取真实 taskId 和 mindmapId（用于构造合法外键引用但触发 DB 错误的 payload）
    const taskInfo = await page.evaluate(async () => {
      const db = (window as any).__mindflowDb
      const tasks = await db.tasks.toArray()
      const mindmaps = await db.mindmaps.toArray()
      return {
        taskId: tasks[0]?.id ?? null,
        projectId: tasks[0]?.project_id ?? null,
        mindmapId: mindmaps[0]?.id ?? null,
      }
    })
    expect(taskInfo.taskId).not.toBeNull()
    expect(taskInfo.projectId).not.toBeNull()
    expect(taskInfo.mindmapId).not.toBeNull()

    // =================== Phase 2: 插入一个注定失败的 pending_change ===================
    // payload: title = null（违反 tasks.title NOT NULL 约束）
    // project_id 和 mindmap_id 用真实值以避免 FK 约束被静音跳过
    const changeId = `pc-retry-${Date.now()}`
    await page.evaluate(
      async ({ changeId, taskId, projectId, mindmapId }) => {
        const db = (window as any).__mindflowDb
        if (!db) throw new Error('__mindflowDb not exposed')

        await db.pending_changes.add({
          id: changeId,
          table: 'tasks',
          record_id: taskId,
          action: 'upsert',
          payload: {
            id: taskId,
            project_id: projectId,
            mindmap_id: mindmapId,
            title: null,          // ← DB NOT NULL 约束，会触发 400
            status: 'todo',
            node_uid: 'n1',
          },
          created_at: new Date(),
          retry_count: 0,
        })
      },
      { changeId, taskId: taskInfo.taskId, projectId: taskInfo.projectId, mindmapId: taskInfo.mindmapId }
    )

    const pendingInitial = await getPendingChangeCount(page)
    expect(pendingInitial).toBe(1)

    // =================== Phase 3: 重复 triggerSync，观察 retry_count 递增 ===================
    const getRetryCount = async (): Promise<number> => {
      return page.evaluate(async (cid) => {
        const db = (window as any).__mindflowDb
        const pc = await db.pending_changes.get(cid)
        return pc?.retry_count ?? -1
      }, changeId)
    }

    // 第 1 次回放 → retry_count 应为 1
    await page.evaluate(() => (window as any).__resetSyncState?.())
    await triggerSync(page)
    await page.waitForTimeout(3000)
    let rc1 = await getRetryCount()
    expect(rc1).toBe(1)

    // 第 2 次 → retry_count = 2
    await page.evaluate(() => (window as any).__resetSyncState?.())
    await triggerSync(page)
    await page.waitForTimeout(3000)
    let rc2 = await getRetryCount()
    expect(rc2).toBe(2)

    // 第 3 次 → retry_count = 3
    await page.evaluate(() => (window as any).__resetSyncState?.())
    await triggerSync(page)
    await page.waitForTimeout(3000)
    let rc3 = await getRetryCount()
    expect(rc3).toBe(3)

    // 第 4 次 → retry_count = 4
    await page.evaluate(() => (window as any).__resetSyncState?.())
    await triggerSync(page)
    await page.waitForTimeout(3000)
    let rc4 = await getRetryCount()
    expect(rc4).toBe(4)

    // 第 5 次 → retry_count 已达 4，4+1 >= MAX_RETRIES(5)，pending_change 被删除
    await page.evaluate(() => (window as any).__resetSyncState?.())
    await triggerSync(page)
    await page.waitForTimeout(3000)
    let rc5 = await getRetryCount()
    expect(rc5).toBe(-1) // 已删除，查不到

    // 验证队列已空
    const finalPending = await getPendingChangeCount(page)
    expect(finalPending).toBe(0)

    // 验证该 change 确实已被删除（查不到）
    const gone = await page.evaluate(async (cid) => {
      const db = (window as any).__mindflowDb
      const pc = await db.pending_changes.get(cid)
      return pc === undefined
    }, changeId)
    expect(gone).toBe(true)
  })

  test('J22-2: 多个失败的 pending_changes 各自独立计数', async ({ page }) => {
    const projectName = makeUniqueProjectName('multi-retry')

    await page.goto('/')
    await injectRealSession(page, testUser!.session)
    await page.goto('/app')
    await page.waitForTimeout(2000)
    await page.evaluate(async () => {
      await (window as any).__authStore?.getState?.().initSession?.()
    })

    const projectId = await createLocalProjectViaAPI(page, projectName, [
      'J22多任务A',
      'J22多任务B',
    ])

    await triggerSync(page)
    await page.waitForTimeout(3000)

    // 获取两个 taskId
    const taskIds = await page.evaluate(async () => {
      const db = (window as any).__mindflowDb
      const tasks = await db.tasks.toArray()
      return tasks.slice(0, 2).map((t: any) => ({
        id: t.id,
        projectId: t.project_id,
        mindmapId: t.mindmap_id ?? '',
      }))
    })
    expect(taskIds.length).toBe(2)

    const changeIds = [`pc-multi-a-${Date.now()}`, `pc-multi-b-${Date.now() + 1}`]

    // 插入两个失败 change
    await page.evaluate(
      async ({ changes }) => {
        const db = (window as any).__mindflowDb
        for (const c of changes) {
          await db.pending_changes.add({
            id: c.changeId,
            table: 'tasks',
            record_id: c.taskId,
            action: 'upsert',
            payload: {
              id: c.taskId,
              project_id: c.projectId,
              mindmap_id: c.mindmapId,
              title: null,
              status: 'todo',
              node_uid: 'n1',
            },
            created_at: new Date(),
            retry_count: 0,
          })
        }
      },
      {
        changes: [
          { changeId: changeIds[0], taskId: taskIds[0].id, projectId: taskIds[0].projectId, mindmapId: taskIds[0].mindmapId },
          { changeId: changeIds[1], taskId: taskIds[1].id, projectId: taskIds[1].projectId, mindmapId: taskIds[1].mindmapId },
        ],
      }
    )

    // triggerSync 3 次
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => (window as any).__resetSyncState?.())
      await triggerSync(page)
      await page.waitForTimeout(3000)
    }

    // 验证两个 change 的 retry_count 都是 3
    const counts = await page.evaluate(async (cids) => {
      const db = (window as any).__mindflowDb
      const results: number[] = []
      for (const cid of cids) {
        const pc = await db.pending_changes.get(cid)
        results.push(pc?.retry_count ?? -1)
      }
      return results
    }, changeIds)

    expect(counts[0]).toBe(3)
    expect(counts[1]).toBe(3)

    // 再 triggerSync 2 次（总共 5 次后超过 MAX_RETRIES=5，pending_change 被删除）
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => (window as any).__resetSyncState?.())
      await triggerSync(page)
      await page.waitForTimeout(3000)
    }

    // 两个都应该被删除
    const finalPending = await getPendingChangeCount(page)
    expect(finalPending).toBe(0)
  })
})
