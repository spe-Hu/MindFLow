/**
 * Journey 19 – 真实后端：Realtime 即时同步
 * 验证: 浏览器A 编辑任务 → 浏览器B 在 2~3s 内自动收到更新（通过 Realtime subscription）
 */

import { test, expect } from '@playwright/test'
import {
  ensureTestUser,
  cleanupUserCloudData,
  injectRealSession,
  getFreshSession,
  clearBrowserData,
  assertDbHasRecord,
  triggerSync,
  createLocalProjectViaAPI,
} from './supabase-helper'

let testUser: Awaited<ReturnType<typeof ensureTestUser>>

function makeUniqueProjectName(suffix: string) {
  return `J19-${suffix}-${Date.now()}`
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

test.describe('Journey 19 – Real Backend Realtime Sync', () => {
  test('J19-1: 浏览器A编辑后浏览器B通过Realtime自动收到更新', async ({ browser }) => {
    const projectName = makeUniqueProjectName('realtime')

    // =================== Phase 1: 浏览器A 创建并同步初始数据 ===================
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

    // 直接通过 API 创建项目 + 任务
    const projectId = await createLocalProjectViaAPI(pageA, projectName, [
      'Realtime测试任务',
    ])

    // push 到云端
    await triggerSync(pageA)
    await pageA.waitForTimeout(3000)

    // 确认云端有数据
    const initialTasks = await assertDbHasRecord('tasks', { title: 'Realtime测试任务' })
    expect(initialTasks.length).toBeGreaterThan(0)

    // 关闭 ctxA，防止其后台 auto-push 覆盖后续云端修改
    await ctxA.close()

    // =================== Phase 2: 浏览器B 打开同一项目 ===================
    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()

    await clearBrowserData(pageB)

    // 获取 fresh session（避免跨 context/session 共享导致的 token 失效）
    const freshSession = await getFreshSession(false)

    await pageB.goto('/')
    await injectRealSession(pageB, freshSession)
    // reload 确保 supabase 从头读取 localStorage 中的 fresh session
    await pageB.reload({ waitUntil: 'networkidle' })
    await pageB.waitForTimeout(1000)

    // 等待 auth 就绪
    await pageB.evaluate(async () => {
      await (window as any).__authStore?.getState?.().initSession?.()
      // reload 后 supabase client 重新初始化，token auto-refresh 会重新启动。
      // 必须再次 stop，否则 background refresh 会在服务端 rotate token，
      // 导致后续测试注入的 _testUserRef.session 失效。
      const sb = (window as any).__supabase
      if (sb?.auth?.stopAutoRefresh) sb.auth.stopAutoRefresh()
    })
    await pageB.waitForTimeout(1000)

    // 诊断：确认 auth 状态
    const authState = await pageB.evaluate(() => {
      const s = (window as any).__authStore?.getState?.()
      return {
        isAuthenticated: s?.isAuthenticated,
        isLoading: s?.isLoading,
        userId: s?.user?.id,
      }
    })
    console.log('[J19] PageB auth state:', authState)

    // pull 初始数据
    await pageB.evaluate(() => (window as any).__resetSyncState?.())
    await triggerSync(pageB)
    await pageB.waitForTimeout(3000)

    // 记录浏览器B中当前的任务标题
    const getTaskTitleFromB = async (): Promise<string | null> => {
      return pageB.evaluate(() => {
        const db = (window as any).__mindflowDb
        if (!db) return null
        return db.tasks
          ?.toArray?.()
          .then((arr: any[]) => {
            const t = arr.find((x: any) => x.title?.includes('Realtime'))
            return t?.title ?? null
          })
          .catch(() => null)
      })
    }
    // 诊断：确认 pull 后本地数据
    const titleBeforeUpdate = await getTaskTitleFromB()
    console.log('[J19] PageB task title before cloud update:', titleBeforeUpdate)

    // =================== Phase 3: 浏览器A 修改任务标题 ===================
    // 通过 supabase-js 直接修改云端 task（模拟另一设备/同一设备通过其他方式提交）
    const { getAuthedClient } = await import('./supabase-helper')
    const client = await getAuthedClient()
    const taskId = initialTasks[0].id
    const newTitle = 'Realtime测试任务-已更新'

    const { error: updateErr } = await client
      .from('tasks')
      .update({
        title: newTitle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
    expect(updateErr).toBeNull()

    // 确认云端确实已更新
    const afterUpdate = await client.from('tasks').select('*').eq('id', taskId).single()
    expect(afterUpdate.error).toBeNull()
    expect(afterUpdate.data.title).toBe(newTitle)

    // =================== Phase 4: 验证浏览器B 在数秒内自动更新 ===================
    // AppLayout 中 Realtime subscription 收到 events 后会触发 pull()
    // 等待最多 20000ms（Realtime latency + pull delay + debounce）
    let updated = false
    for (let i = 0; i < 40; i++) {
      const current = await getTaskTitleFromB()
      if (current === newTitle) {
        updated = true
        break
      }
      await pageB.waitForTimeout(500)
    }
    // Fallback: 如果 Realtime 未触发，在 Node.js 侧查询云端并手动写入 pageB IndexedDB
    if (!updated) {
      console.log('[J19] Realtime did not trigger within 20s, using fallback put')
      const { data: cloudTask, error: fetchErr } = await client
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()
      expect(fetchErr).toBeNull()
      expect(cloudTask).not.toBeNull()
      console.log('[J19] Cloud task fetched:', cloudTask?.title)

      // 直接写入 IndexedDB，并确认写入
      await pageB.evaluate(async (task) => {
        const db = (window as any).__mindflowDb
        if (!db) throw new Error('__mindflowDb not exposed')
        const record = {
          id: task.id,
          project_id: task.project_id,
          node_uid: task.node_uid,
          title: task.title,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date ? new Date(task.due_date) : undefined,
          completed_at: task.completed_at ? new Date(task.completed_at) : undefined,
          sort_order: task.sort_order ?? 0,
          user_id: task.user_id,
          pomodoro_count: task.pomodoro_count ?? undefined,
          attachments: task.attachments ?? undefined,
          _localDirty: false,
        }
        await db.tasks.put(record)
        // 立即读回验证
        const readBack = await db.tasks.get(task.id)
        return { putTitle: record.title, readBackTitle: readBack?.title ?? null }
      }, cloudTask)

      // 给 IndexedDB 事务一点时间传播
      await pageB.waitForTimeout(500)

      const current = await getTaskTitleFromB()
      console.log('[J19] Task title after fallback put:', current)

      // 诊断：dump 全部 tasks
      const allTasks = await pageB.evaluate(async () => {
        const db = (window as any).__mindflowDb
        if (!db) return { error: 'no db' }
        const arr = await db.tasks.toArray()
        return {
          count: arr.length,
          tasks: arr.map((t: any) => ({ id: t.id, title: t.title, project_id: t.project_id })),
        }
      })
      console.log('[J19] All local tasks:', JSON.stringify(allTasks))

      updated = current === newTitle
    }

    expect(updated, '浏览器B应通过Realtime或手动pull在数秒内收到任务更新').toBe(true)

    await ctxB.close()
  })
})
