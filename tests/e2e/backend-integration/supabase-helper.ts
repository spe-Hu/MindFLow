/**
 * Supabase 测试辅助函数
 * 在 Node.js 侧（Playwright test runner）直接调用真实 Supabase 后端
 */

import { createClient, type Session, type User } from '@supabase/supabase-js'
import type { Page, BrowserContext } from '@playwright/test'

// 已认证 session 缓存（用于 RLS 查询）
let _cachedAuthedSession: Session | null = null
// 当前测试用户（由 ensureTestUser 填充），用于 env-less 认证
let _testUserRef: TestUser | null = null

export async function getAuthedClient() {
  // 先尝试用 ensureTestUser 中已有的 session（支持 auto-signup 路径）
  const session = _cachedAuthedSession ?? _testUserRef?.session ?? null
  if (session) {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${session.access_token}` },
      },
    })
  }

  // fallback: env 凭据
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  if (!email || !password) throw new Error('TEST_USER_EMAIL/PASSWORD env required')
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(`Auth failed: ${error?.message}`)
  _cachedAuthedSession = data.session
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${_cachedAuthedSession.access_token}` },
    },
  })
}

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://biywnxryvwsszplzirce.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_ImouKYrVb4DH2ZKKWuD9Ew_h8ry9Hxd'

const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0]
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`

export interface TestUser {
  user: User
  session: Session
  email: string
  password: string
}

/** 创建 Supabase 客户端（Node.js 侧） */
export function createTestClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * 确保获取一个可用的测试账户。
 * 优先级：
 *   1. 环境变量 TEST_USER_EMAIL / TEST_USER_PASSWORD 登录
 *   2. 自动创建临时测试用户（signUp，要求项目关闭 email confirmation）
 */
export async function ensureTestUser(): Promise<TestUser | null> {
  const client = createTestClient()

  // 1. 尝试环境变量账户
  const envEmail = process.env.TEST_USER_EMAIL
  const envPassword = process.env.TEST_USER_PASSWORD

  if (envEmail && envPassword) {
    const { data, error } = await client.auth.signInWithPassword({
      email: envEmail,
      password: envPassword,
    })
    if (data.session && data.user) {
      _testUserRef = {
        user: data.user,
        session: data.session,
        email: envEmail,
        password: envPassword,
      }
      return _testUserRef
    }
    if (error) {
      console.warn(
        `[BackendE2E] Env creds login failed: ${error.message}. Trying auto-signup...`
      )
    }
  }

  // 2. 自动创建临时账户（需要 Supabase 项目关闭 email confirmation）
  const tempEmail = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@mindflow.e2e`
  const tempPassword = `e2e-pass-${Math.random().toString(36).slice(2, 10)}`

  const { data: signUpData, error: signUpErr } = await client.auth.signUp({
    email: tempEmail,
    password: tempPassword,
  })

  if (signUpErr) {
    console.error(
      `[BackendE2E] Auto sign-up failed: ${signUpErr.message}. ` +
        `Please set TEST_USER_EMAIL / TEST_USER_PASSWORD env vars, ` +
        `or disable email confirmation in Supabase Auth settings.`
    )
    return null
  }

  if (!signUpData.session || !signUpData.user) {
    console.error(
      `[BackendE2E] Sign-up succeeded but no session returned. ` +
        `Email confirmation may be required. Set TEST_USER_EMAIL env var instead.`
    )
    return null
  }

  _testUserRef = {
    user: signUpData.user,
    session: signUpData.session,
    email: tempEmail,
    password: tempPassword,
  }

  // 确保 public.users 表中有记录（project.user_id FK 需要）
  const { error: userUpsertErr } = await client.from('users').upsert({ id: signUpData.user.id })
  if (userUpsertErr) {
    // ignore — 可能 users 记录已存在或其他原因
  }

  return _testUserRef
}

/** 通过重新登录获取最新的有效 session（绕过可能已被刷旧的 token） */
export async function getFreshSession(updateCache = true): Promise<Session> {
  if (!_testUserRef) throw new Error('No test user available')
  const client = createTestClient()
  const { data, error } = await client.auth.signInWithPassword({
    email: _testUserRef.email,
    password: _testUserRef.password,
  })
  if (error || !data.session) {
    throw new Error(`Fresh login failed: ${error?.message}`)
  }
  if (updateCache) {
    // 更新缓存，后续注入使用新 session
    _testUserRef.session = data.session
    _cachedAuthedSession = data.session
  }
  return data.session
}

/** 将测试用户的 session 注入浏览器 localStorage，使前端自动认证 */
export async function injectRealSession(
  page: Page,
  session: Session
): Promise<void> {
  const sessionJson = JSON.stringify(session)
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value)
    },
    { key: STORAGE_KEY, value: sessionJson }
  )

  // 禁用 supabase 自动刷新 token，避免多端 context 共享 session 时 token rotation 冲突
  await page.evaluate(() => {
    const sb = (window as any).__supabase
    if (sb?.auth?.stopAutoRefresh) {
      sb.auth.stopAutoRefresh()
    }
  })
}

/** 清理该用户的所有云端数据（通过 RLS，只能删自己的数据） */
export async function cleanupUserCloudData(userId: string): Promise<void> {
  const client = await getAuthedClient()

  const tables = ['change_log', 'tasks', 'mindmaps', 'projects']
  for (const table of tables) {
    const { error } = await client
      .from(table as any)
      .delete()
      .eq('user_id', userId)
    if (error) {
      console.warn(`[BackendE2E] Cleanup ${table} failed: ${error.message}`)
    }
  }
}

/** 通过 supabase-js 断言云端 DB 中存在符合条件的记录 */
export async function assertDbHasRecord(
  table: string,
  match: Record<string, unknown>
): Promise<any[]> {
  const client = await getAuthedClient()

  let query = client.from(table as any).select('*')
  for (const [key, value] of Object.entries(match)) {
    query = query.eq(key, value)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(
      `[BackendE2E] DB assert query failed: ${error.message} (table=${table})`
    )
  }

  const records = (data ?? []) as any[]
  if (records.length === 0) {
    throw new Error(
      `[BackendE2E] DB assert failed: no record in ${table} matching ${JSON.stringify(match)}`
    )
  }

  return records
}

/** 通过 supabase-js 断言云端 DB 中不存在符合条件的记录 */
export async function assertDbHasNoRecord(
  table: string,
  match: Record<string, unknown>
): Promise<void> {
  const client = await getAuthedClient()

  let query = client.from(table as any).select('*')
  for (const [key, value] of Object.entries(match)) {
    query = query.eq(key, value)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(
      `[BackendE2E] DB assert query failed: ${error.message} (table=${table})`
    )
  }

  const records = (data ?? []) as any[]
  if (records.length > 0) {
    throw new Error(
      `[BackendE2E] DB assert failed: found ${records.length} unexpected record(s) in ${table} matching ${JSON.stringify(match)}`
    )
  }
}

/** 在浏览器端清空 IndexedDB + localStorage */
export async function clearBrowserData(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => {
    localStorage.removeItem('mindflow-auth-store')
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('mindflow-') || k.startsWith('sb-')) {
        localStorage.removeItem(k)
      }
    })
  })
  await page.reload({ waitUntil: 'networkidle' })

  await page.evaluate(async () => {
    const db = (window as any).__mindflowDb
    if (db && db.tables) {
      try {
        await db.transaction('rw', db.tables, async () => {
          for (const table of db.tables) {
            await table.clear()
          }
        })
      } catch (e) {
        for (const table of db.tables || []) {
          try {
            await table.clear()
          } catch (e2) {
            /* ignore */
          }
        }
      }
    }
  })
}

/** 等待指定 syncStore 状态 */
export async function waitForSyncStatus(
  page: Page,
  status: string,
  timeoutMs = 15000
): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const current = await page.evaluate(() => {
      const store = (window as any).__syncStore
      return store?.getState?.().status ?? 'unknown'
    })
    if (current === status) return true
    await page.waitForTimeout(500)
  }
  return false
}

/** 触发一次主动同步（强制 online → 重置 sync 状态 → 调用 doAutoSync → 等待完成） */
export async function triggerSync(page: Page): Promise<void> {
  // 先确保 navigator.onLine 为 true（Chromium headless 默认可能 false）
  await setNavigatorOnLine(page, true)
  // 重置模块级 sync 状态（timestamp + timer），避免 30s 间隔阻止本次 sync
  await page.evaluate(() => {
    if ((window as any).__resetSyncState) {
      ;(window as any).__resetSyncState()
    }
  })
  await page.evaluate(async () => {
    const store = (window as any).__syncStore
    if (store?.getState?.().doAutoSync) {
      await store.getState().doAutoSync()
    }
  })
  // doAutoSync 内部先 debounce 500ms 再执行 push+pull，等它稳定进入 syncing 后再轮询
  await page.waitForTimeout(1000)
  await waitForSyncComplete(page, 20000)
}

/** 等待同步完成（status 从 syncing 变为 idle 或 error） */
export async function waitForSyncComplete(page: Page, timeoutMs = 15000): Promise<boolean> {
  // 先确保当前不是 idle（避免立即返回而 sync 尚未真正启动）
  let hasBeenSyncing = false
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const { status, lastSyncTime } = await page.evaluate(() => {
      const s = (window as any).__syncStore?.getState?.()
      return {
        status: s?.status ?? 'unknown',
        lastSyncTime: s?.lastSyncTime ?? s?.lastSyncAt ?? null,
      }
    })
    if (status === 'syncing') {
      hasBeenSyncing = true
    }
    // 如果最近几秒内成功同步过，认为已完成（避免 sync 提前完成后 hasBeenSyncing==false 超时）
    if (status === 'idle' && lastSyncTime) {
      const lastSyncMs = new Date(lastSyncTime).getTime()
      if (Date.now() - lastSyncMs < 8000) {
        return true
      }
    }
    if (hasBeenSyncing && (status === 'idle' || status === 'error')) {
      return status === 'idle'
    }
    await page.waitForTimeout(500)
  }
  return false
}

/**
 * 强制设置 navigator.onLine（绕过之前可能存在的 getter descriptor）
 * 注意：如果之前 triggerSync 设置了 getter，直接用 {value: false} 会冲突（TypeError）。
 * 必须先 delete 再 redefine。
 */
export async function setNavigatorOnLine(page: Page, online: boolean): Promise<void> {
  await page.evaluate((online) => {
    // 1. 先删除现有 descriptor（无论是 value 还是 getter）
    try { delete (navigator as any).onLine } catch { /* ignore */ }
    // 2. 重新定义
    Object.defineProperty(navigator, 'onLine', {
      value: online,
      configurable: true,
      writable: true,
    })
    // 3. 派发对应事件
    window.dispatchEvent(new Event(online ? 'online' : 'offline'))
  }, online)
}

/** 停止 navigator.onLine 强制覆盖（测试结束后清理） */
export async function restoreNavigatorOnLine(page: Page): Promise<void> {
  await page.evaluate(() => {
    if ((window as any).__navOnlineInterval) {
      clearInterval((window as any).__navOnlineInterval)
      delete (window as any).__navOnlineInterval
    }
    try {
      delete (navigator as any).onLine
    } catch {
      // ignore
    }
  })
}

/** 通过 browser expose 的 db 获取任务列表 */
export async function getLocalTasks(page: Page): Promise<any[]> {
  return page.evaluate(async () => {
    const db = (window as any).__mindflowDb
    if (!db) return []
    return db.tasks.toArray().catch(() => [])
  })
}

/** 通过 browser expose 的 db 获取 pending_changes 数量 */
export async function getPendingChangeCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const db = (window as any).__mindflowDb
    if (!db?.pending_changes) return 0
    return db.pending_changes.count().catch(() => 0)
  })
}

/** 直接通过 IndexedDB API 创建项目和任务（绕过 UI，更可靠） */
export async function createLocalProjectViaAPI(
  page: Page,
  name: string,
  taskNames: string[] = []
): Promise<string> {
  return page.evaluate(async ({ name, taskNames }) => {
    const db = (window as any).__mindflowDb
    if (!db) throw new Error('__mindflowDb not exposed')

    const now = new Date()
    const projectId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const mindmapId = `${projectId}-mm`

    // 1. Insert project
    await db.projects.add({
      id: projectId,
      name,
      color: 'indigo',
      sort_order: 0,
      is_archived: false,
      version: 1,
      last_opened_at: now,
      project_type: 'cloud',
      _localDirty: true,
    })

    // 2. Build mindmap tree
    const children = taskNames.map((t, i) => {
      const nodeUid = `node-${i}-${Date.now()}`
      return {
        data: {
          uid: nodeUid,
          text: t,
          expand: true,
          _isTask: true,
          _status: 'todo',
          _priority: 'medium',
          _sortOrder: i,
        },
        children: [],
      }
    })

    const treeData = {
      data: { uid: 'root', text: name, expand: true, isRoot: true },
      children,
    }

    await db.mindmaps.add({
      id: mindmapId,
      project_id: projectId,
      title: name,
      root_node_id: 'root',
      tree_data: treeData,
      view_state: { layout: 'logicalStructure' },
      version: 1,
      _localDirty: true,
    })

    // 3. Insert tasks
    for (let i = 0; i < taskNames.length; i++) {
      const nodeUid = children[i].data.uid
      await db.tasks.add({
        id: `${projectId}-${nodeUid}`,
        project_id: projectId,
        mindmap_id: mindmapId,
        node_uid: nodeUid,
        title: taskNames[i],
        status: 'todo',
        priority: 'medium',
        sort_order: i,
        _localDirty: true,
      })
    }

    return projectId
  }, { name, taskNames })
}
