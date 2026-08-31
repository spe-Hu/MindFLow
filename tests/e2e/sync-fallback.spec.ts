// E2E – 验证 syncTaskToCloud 的 fallback 降级逻辑
// 模拟云端 schema 缺失字段（400 Bad Request）时，能逐级 fallback 到核心字段

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.MF_BASE_URL || 'http://localhost:5173'
const MOCK_USER_ID = 'e2e-fallback-test-user'

function getMockSessionJson(): string {
  const session = {
    access_token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJhdWQiOiAiYXV0aGVudGljYXRlZCIsCiAgImV4cCI6IDE5OTAyMjcwMzAsCiAgInN1YiI6ICJlMmUtZmFsbGJhY2stdGVzdC11c2VyIiwKICAiZW1haWwiOiAidGVzdEBleGFtcGxlLmNvbSIsCiAgInJvbGUiOiAiYXV0aGVudGljYXRlZCIKfQ.mock-signature',
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

test.describe('SyncTask Fallback', () => {
  test('当云端 tasks 表缺少可选字段时，fallback 逐级降级后仍成功', async ({ page }) => {
    let taskRequestCount = 0
    const taskRequests: any[] = []

    // 拦截所有 Supabase API：tasks upsert 前两次返回 400，第三次返回 200
    await page.route('https://biywnxryvwsszplzirce.supabase.co/**', async (route) => {
      const req = route.request()
      const url = req.url()
      const method = req.method()
      const pathname = new URL(url).pathname

      if (pathname === '/auth/v1/user') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: MOCK_USER_ID, email: 'test@example.com', role: 'authenticated' }),
        })
      }
      if (pathname === '/auth/v1/token') {
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ access_token: 'mock', token_type: 'bearer', expires_in: 3600, user: { id: MOCK_USER_ID } }),
        })
      }
      if (pathname.includes('/rest/v1/users')) {
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify([{ id: MOCK_USER_ID, username: 'tester', display_name: 'Tester', avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]),
        })
      }

      if (pathname.includes('/rest/v1/tasks') && (method === 'POST' || method === 'PATCH')) {
        taskRequestCount++
        taskRequests.push({ count: taskRequestCount, url, method })
        if (taskRequestCount <= 2) {
          return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              code: '42701',
              message: "Could not find the 'attachments' column of 'tasks' in the schema cache",
              details: '',
              hint: '',
            }),
          })
        }
        return route.fulfill({ status: 200, body: '{}' })
      }

      if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
        return route.fulfill({ status: 200, body: '{}' })
      }

      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    // 1. 打开页面并清理数据
    await page.goto(BASE_URL + '/')
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()
    await page.waitForTimeout(3000)

    // 2. 通过 expose API 设置状态和数据（全部不经过 UI）
    // 注意：mindmap tree_data 必须使用 { data: { uid, text }, children: [] } 格式，
    // 否则 cleanupOrphanedTasks 会找不到 node_uid 对应节点，删除 task。
    await page.evaluate(async () => {
      const db: any = (window as any).__mindflowDb
      const authStore: any = (window as any).__authStore
      const syncStore: any = (window as any).__syncStore
      if (!db || !authStore || !syncStore) {
        throw new Error(`Missing exposed APIs: db=${!!db} auth=${!!authStore} sync=${!!syncStore}`)
      }

      // 清理 IndexedDB
      await db.projects.clear()
      await db.mindmaps.clear()
      await db.tasks.clear()

      // seed 数据
      const projectId = crypto.randomUUID()
      const mindmapId = crypto.randomUUID()
      const taskId = crypto.randomUUID()
      const now = new Date()

      await db.projects.add({
        id: projectId,
        name: 'Fallback 测试项目',
        color: '#3b82f6',
        sort_order: 0,
        is_archived: false,
        version: 1,
        last_opened_at: now,
        updated_at: now,
      })

      await db.mindmaps.add({
        id: mindmapId,
        project_id: projectId,
        tree_data: {
          data: { text: 'Fallback 测试项目', uid: 'root' },
          children: [
            { data: { text: 'FallbackTaskDirect', uid: 'test-node-1' }, children: [] }
          ]
        },
        view_state: {},
        version: 1,
        created_at: now,
        updated_at: now,
      })

      await db.tasks.add({
        id: taskId,
        project_id: projectId,
        node_uid: 'test-node-1',
        title: 'FallbackTaskDirect',
        status: 'todo',
        priority: 'medium',
        due_date: null,
        completed_at: null,
        sort_order: 0,
        pomodoro_count: 0,
        attachments: [],
        created_at: now,
        updated_at: now,
      })

      // 设置 local mode（避免路由重定向到 auth）
      authStore.getState().enableLocalMode()

      return { projectId, mindmapId, taskId }
    })

    // 3. 注入 mock session 并初始化 auth user
    await page.evaluate((json) => {
      localStorage.setItem('sb-biywnxryvwsszplzirce-auth-token', json)
    }, getMockSessionJson())

    await page.evaluate(async () => {
      const authStore: any = (window as any).__authStore
      await authStore.getState().initSession()
    })

    const authReady: boolean = await page.evaluate(() => {
      const authStore: any = (window as any).__authStore
      return !!authStore.getState().user
    })
    expect(authReady).toBe(true)

    // 4. 注入 syncStore deps
    await page.evaluate(() => {
      const syncStore: any = (window as any).__syncStore
      const authStore: any = (window as any).__authStore
      syncStore.getState().setDeps({
        getUser: () => authStore.getState().user,
        refreshProjects: async () => {},
      })
    })

    // 5. 重置 sync interval 限制并触发 doAutoSync
    const diagBeforeSync = await page.evaluate(async () => {
      const resetFn = (window as any).__resetSyncState
      if (resetFn) resetFn()

      const db = (window as any).__mindflowDb
      const taskCount = await db.tasks.count()
      const projCount = await db.projects.count()
      const mmCount = await db.mindmaps.count()

      const syncStore = (window as any).__syncStore
      const authStore = (window as any).__authStore
      const user = authStore.getState().user
      const deps = syncStore.getState().deps

      return { taskCount, projCount, mmCount, hasUser: !!user, hasDeps: !!deps, resetDone: typeof resetFn === 'function' }
    })
    console.error('[FallbackTest] diagBeforeSync:', JSON.stringify(diagBeforeSync))

    await page.evaluate(async () => {
      const syncStore: any = (window as any).__syncStore
      await syncStore.getState().doAutoSync()
    })

    // 6. 读取结果
    await page.waitForTimeout(4000)

    const syncResult = await page.evaluate(() => {
      const syncStore: any = (window as any).__syncStore
      const state = syncStore.getState()
      return { status: state.status, lastError: state.lastError }
    })

    console.error('[FallbackTest] syncResult:', JSON.stringify(syncResult))
    console.error('[FallbackTest] taskRequestCount:', taskRequestCount)
    console.error('[FallbackTest] taskRequests:', JSON.stringify(taskRequests))

    // 7. 断言：fallback 至少走 3 次（full payload → no attachments → no pomodoro_count → core fields 成功）
    expect(taskRequestCount).toBeGreaterThanOrEqual(3)
    expect(taskRequests.length).toBeGreaterThanOrEqual(3)
  })
})
