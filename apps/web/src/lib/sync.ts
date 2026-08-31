// ============================================================
// sync.ts — 本地 IndexedDB ↔ Supabase 云端同步
// 职责：核心同步逻辑（push dirty / pull with comparison / Realtime）
// 不操作 UI store — 状态管理由调用者（syncStore）处理
// ============================================================

import { db } from '@/lib/db'
import type { LocalProject, LocalMindmap, LocalTask } from '@/lib/db'
import { useAuthStore } from '@/stores/authStore'
import { devLog, devWarn } from '@/lib/devConsole'
import {
  upsertToCloud,
  deleteFromCloud,
  batchUpsertToCloud,
  fetchAllFromCloud as _fetchAllFromCloud,
  subscribeToChanges,
  getLastSyncCheckpoint,
  setLastSyncCheckpoint,
  type RealtimeChangeEvent,
} from '@/lib/cloudSync'

function getUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null
}

function isOnline(): boolean {
  return navigator.onLine
}

// ============================================
// Debounce Push
// ============================================

let pushTimer: ReturnType<typeof setTimeout> | null = null
const PUSH_DEBOUNCE_MS = 3000

export function scheduleAutoPush(): void {
  schedulePushDebounce()
}

function schedulePushDebounce(): void {
  if (pushTimer) clearTimeout(pushTimer)
  if (!isOnline()) return
    pushTimer = setTimeout(() => {
      pushTimer = null
      pushDirtyRecords({ skipPlayback: true }).catch((e) => devWarn('[Sync] Debounced push failed:', e))
    }, PUSH_DEBOUNCE_MS)
}

export function cancelPushDebounce(): void {
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
}

// ============================================
// Push: 批量推送 dirty 记录
// 返回 { pushed, errors } 供调用者更新 UI store
// ============================================

interface PushResult {
  pushedTotal: number
  errors: string[]
}

export async function pushDirtyRecords(opts?: { skipPlayback?: boolean }): Promise<PushResult> {
  const userId = getUserId()
  devLog('[Sync] pushDirtyRecords start, userId=', userId, 'onLine=', navigator.onLine)
  if (!userId) return { pushedTotal: 0, errors: [] }

  // 离线时：将 dirty records 转为 pending_changes 队列
  if (!isOnline()) {
    return enqueueDirtyToOfflineQueue()
  }

  // 联网时：先回放离线队列（doAutoSync / triggerSync 场景），再推送当前 dirty records
  let queueResult: PushResult = { pushedTotal: 0, errors: [] }
  if (!opts?.skipPlayback) {
    queueResult = await playbackPendingChanges()
  }

  devLog('[Sync] Push: finding dirty records...')

  const [dirtyProjects, dirtyMindmaps, dirtyTasks] = await Promise.all([
    db.projects.filter((p) => p._localDirty === true).toArray().catch(() => [] as LocalProject[]),
    db.mindmaps.filter((m) => m._localDirty === true).toArray().catch(() => [] as LocalMindmap[]),
    db.tasks.filter((t) => t._localDirty === true).toArray().catch(() => [] as LocalTask[]),
  ])
  devLog(`[Sync] Found dirty: P=${dirtyProjects.length}, M=${dirtyMindmaps.length}, T=${dirtyTasks.length}`)

  const totalDirty = dirtyProjects.length + dirtyMindmaps.length + dirtyTasks.length
  if (totalDirty === 0) {
    devLog('[Sync] No dirty records to push')
    return { pushedTotal: queueResult.pushedTotal, errors: queueResult.errors }
  }

  devLog(`[Sync] Push: ${dirtyProjects.length}P, ${dirtyMindmaps.length}M, ${dirtyTasks.length}T`)

  const errors: string[] = [...queueResult.errors]
  let pushedTotal = queueResult.pushedTotal

  // Projects
  if (dirtyProjects.length > 0) {
    const { failed } = await batchUpsertToCloud(
      'projects',
      dirtyProjects.map((p) => ({
        id: p.id,
        user_id: userId,
        name: p.name,
        color: p.color,
        icon: 'folder',
        sort_order: p.sort_order,
        is_archived: p.is_archived,
        version: p.version,
        last_opened_at: p.last_opened_at?.toISOString() ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
    )
    for (const f of failed) errors.push(`project ${f.id}: ${f.error.message}`)
    const succeededIds = dirtyProjects.map((p) => p.id).filter((id) => !failed.find((f) => f.id === id))
    if (succeededIds.length > 0) {
      await db.projects.bulkUpdate(succeededIds.map((id) => ({ key: id, changes: { _localDirty: false } })))
      pushedTotal += succeededIds.length
    }
  }

  // Mindmaps
  if (dirtyMindmaps.length > 0) {
    const { failed } = await batchUpsertToCloud(
      'mindmaps',
      dirtyMindmaps.map((m) => ({
        id: m.id,
        project_id: m.project_id,
        user_id: userId,
        title: '思维导图',
        root_node_id: 'root',
        tree_data: m.tree_data,
        view_state: m.view_state ?? {},
        version: m.version,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
    )
    for (const f of failed) errors.push(`mindmap ${f.id}: ${f.error.message}`)
    const succeededIds = dirtyMindmaps.map((m) => m.id).filter((id) => !failed.find((f) => f.id === id))
    if (succeededIds.length > 0) {
      await db.mindmaps.bulkUpdate(succeededIds.map((id) => ({ key: id, changes: { _localDirty: false } })))
      pushedTotal += succeededIds.length
    }
  }

  // Tasks
  if (dirtyTasks.length > 0) {
    const mindmapMap = new Map<string, string>()
    const projectIds = [...new Set(dirtyTasks.map((t) => t.project_id))]
    for (const pid of projectIds) {
      const mm = await db.mindmaps.where('project_id').equals(pid).first()
      if (mm) mindmapMap.set(pid, mm.id)
    }
    devLog(`[Sync] Push tasks: ${dirtyTasks.length} dirty, mindmapMap:`, mindmapMap)
    const { failed } = await batchUpsertToCloud(
      'tasks',
      dirtyTasks.map((t) => {
        const mindmapId = mindmapMap.get(t.project_id)
        return {
          id: t.id,
          user_id: userId,
          project_id: t.project_id,
          mindmap_id: mindmapId,
          title: t.title,
          status: t.status,
          node_uid: t.node_uid ?? null,
          priority: t.priority ?? null,
          due_date: t.due_date ? t.due_date.toISOString().split('T')[0] : null,
          completed_at: t.completed_at?.toISOString() ?? null,
          sort_order: t.sort_order ?? null,
          updated_at: new Date().toISOString(),
          pomodoro_count: t.pomodoro_count ?? null,
          attachments: t.attachments ? t.attachments : null,
        }
      })
    )
    devLog(`[Sync] Tasks upsert result: failed=${failed.length}, errors so far=${errors.length}`)
    for (const f of failed) errors.push(`task ${f.id}: ${f.error.message}`)
    const succeededIds = dirtyTasks.map((t) => t.id).filter((id) => !failed.find((f) => f.id === id))
    devLog(`[Sync] Tasks succeededIds:`, succeededIds)
    if (succeededIds.length > 0) {
      await db.tasks.bulkUpdate(succeededIds.map((id) => ({ key: id, changes: { _localDirty: false } })))
      pushedTotal += succeededIds.length
      devLog(`[Sync] Cleared _localDirty for tasks:`, succeededIds)
    }
  }

  if (errors.length > 0) {
    devWarn('[Sync] Push errors:', errors)
  }

  return { pushedTotal, errors }
}

// ============================================
// Offline Queue helpers
// ============================================

import {
  isOnline as checkOnline,
  removeChange,
  markChangeFailed,
  getPendingChanges,
  dbInsertPendingChange,
} from '@/lib/offlineQueue'

async function enqueueDirtyToOfflineQueue(): Promise<PushResult> {
  const [dirtyProjects, dirtyMindmaps, dirtyTasks] = await Promise.all([
    db.projects.filter((p) => p._localDirty === true).toArray().catch(() => [] as LocalProject[]),
    db.mindmaps.filter((m) => m._localDirty === true).toArray().catch(() => [] as LocalMindmap[]),
    db.tasks.filter((t) => t._localDirty === true).toArray().catch(() => [] as LocalTask[]),
  ])

  const total = dirtyProjects.length + dirtyMindmaps.length + dirtyTasks.length
  if (total === 0) return { pushedTotal: 0, errors: [] }

  for (const p of dirtyProjects) {
    await dbInsertPendingChange('projects', p.id, 'upsert', { ...p })
  }
  for (const m of dirtyMindmaps) {
    await dbInsertPendingChange('mindmaps', m.id, 'upsert', { ...m })
  }
  for (const t of dirtyTasks) {
    await dbInsertPendingChange('tasks', t.id, 'upsert', { ...t })
  }

  devLog(`[Sync] Queued ${total} changes (offline mode)`)
  return { pushedTotal: total, errors: [] }
}

/** 回放所有 pending changes */
async function playbackPendingChanges(): Promise<PushResult> {
  const changes = await getPendingChanges()
  if (changes.length === 0) return { pushedTotal: 0, errors: [] }

  const errors: string[] = []
  let pushedTotal = 0

  for (const change of changes) {
    try {
      if (change.action === 'delete') {
        const { error } = await deleteFromCloud(change.table, change.record_id)
        if (error) throw new Error(error.message)
        await removeChange(change.id)
        pushedTotal++
        continue
      }

      const userId = getUserId()
      if (!userId) throw new Error('playback: no user id')

      // 清理 payload：去掉本地字段，添加 user_id
      const payload = { ...change.payload }
      delete (payload as any)._localDirty
      delete (payload as any)._localFailed
      delete (payload as any)._localError
      payload.user_id = userId

      const { error } = await upsertToCloud({ table: change.table, record: payload })
      if (error) throw new Error(error.message)

      await removeChange(change.id)
      pushedTotal++
    } catch (e: any) {
      const msg = e?.message || String(e)
      devWarn(`[Sync] Offline queue playback failed: ${change.table} ${change.record_id}: ${msg}`)
      await markChangeFailed(change.id, msg)
      // offline queue 有独立重试 + 丢弃机制，不把错误当 fatal error 传播
    }
  }

  return { pushedTotal, errors }
}

// ============================================
// Pull: 从云端拉取 + updated_at 比较
// 返回 { pulledTotal, errors, conflicts } 供调用者处理
// ============================================

const TIMESTAMP_EPSILON_MS = 500

export interface ConflictInfo {
  table: string
  id: string
  localUpdatedAt: string
  cloudUpdatedAt: string
  localVersion: number
  cloudVersion: number
}

interface PullResult {
  pulledTotal: number
  errors: string[]
  conflicts: ConflictInfo[]
}

function isCloudNewer(localAt: string | Date | undefined, cloudAt: string): boolean {
  const a = localAt ? new Date(localAt).getTime() : 0
  const b = new Date(cloudAt).getTime()
  return b > a + TIMESTAMP_EPSILON_MS
}

function isSameTimestamp(localAt: string | Date | undefined, cloudAt: string): boolean {
  const a = localAt ? new Date(localAt).getTime() : 0
  const b = new Date(cloudAt).getTime()
  return Math.abs(a - b) <= TIMESTAMP_EPSILON_MS
}

export async function pullFromCloud(): Promise<PullResult> {
  const userId = getUserId()
  if (!userId || !isOnline()) return { pulledTotal: 0, errors: [], conflicts: [] }

  devLog('[Sync] Pull: fetching from cloud...')

  // ---- 尝试增量同步（change_log） ----
  const checkpoint = await getLastSyncCheckpoint(userId)
  if (checkpoint) {
    const { data: changeLog, error: logError } = await fetchChangeLog(userId, checkpoint)
    if (logError || !changeLog) {
      devWarn('[Sync] Incremental pull failed, falling back to full pull:', logError)
    } else if (changeLog.length > 0) {
      devLog(`[Sync] Incremental: ${changeLog.length} change_log entries`)
      const result = await applyChangeLog(changeLog)
      await setLastSyncCheckpoint(userId, changeLog[changeLog.length - 1].created_at)
      return result
    } else {
      devLog('[Sync] Incremental: no new changes')
      return { pulledTotal: 0, errors: [], conflicts: [] }
    }
  }

  // ---- 回退：全量拉取 ----
  const [projectsResult, mindmapsResult, tasksResult] = await Promise.all([
    _fetchAllFromCloud({ table: 'projects', userId }),
    _fetchAllFromCloud({ table: 'mindmaps', userId }),
    _fetchAllFromCloud({ table: 'tasks', userId }),
  ])

  const errors: string[] = []
  const conflicts: ConflictInfo[] = []
  if (projectsResult.error) errors.push(`projects: ${projectsResult.error.message}`)
  if (mindmapsResult.error) errors.push(`mindmaps: ${mindmapsResult.error.message}`)
  if (tasksResult.error) errors.push(`tasks: ${tasksResult.error.message}`)

  if (errors.length > 0) {
    return { pulledTotal: 0, errors, conflicts }
  }

  let pulledTotal = 0

  // ---- Pull projects ----
  for (const cp of projectsResult.records ?? []) {
    const local = await db.projects.get(cp.id)
    if (!local || isCloudNewer(local.last_opened_at, cp.updated_at)) {
      await db.projects.put({
        id: cp.id,
        name: cp.name,
        color: cp.color,
        sort_order: cp.sort_order ?? 0,
        is_archived: cp.is_archived ?? false,
        version: cp.version ?? local?.version ?? 1,
        last_opened_at: cp.last_opened_at ? new Date(cp.last_opened_at) : undefined,
        user_id: cp.user_id,
        project_type: (cp.project_type as any) ?? 'cloud',
        _localDirty: false,
        __syncPull: true,
      })
      pulledTotal++
      devLog(`[Sync] Pull: project "${cp.name}" updated`)
    } else if (isSameTimestamp(local.last_opened_at, cp.updated_at) && local.version !== cp.version) {
      conflicts.push({
        table: 'projects',
        id: cp.id,
        localUpdatedAt: local.last_opened_at?.toISOString() ?? '',
        cloudUpdatedAt: cp.updated_at,
        localVersion: local.version,
        cloudVersion: cp.version ?? 1,
      })
    }
  }

  // ---- Pull mindmaps ----
  for (const cm of mindmapsResult.records ?? []) {
    const local = await db.mindmaps.get(cm.id)
    if (!local || isCloudNewer(undefined, cm.updated_at)) {
      await db.mindmaps.put({
        id: cm.id,
        project_id: cm.project_id,
        tree_data: cm.tree_data as Record<string, unknown>,
        view_state: (cm.view_state ?? {}) as Record<string, unknown>,
        version: cm.version ?? local?.version ?? 1,
        _localDirty: false,
        __syncPull: true,
      })
      pulledTotal++
      devLog(`[Sync] Pull: mindmap ${cm.id} updated`)
    } else if (local.version !== cm.version) {
      conflicts.push({
        table: 'mindmaps',
        id: cm.id,
        localUpdatedAt: '',
        cloudUpdatedAt: cm.updated_at,
        localVersion: local.version,
        cloudVersion: cm.version ?? 1,
      })
    }
  }

  // ---- Pull tasks ----
  for (const ct of tasksResult.records ?? []) {
    const local = await db.tasks.get(ct.id)
    if (!local || isCloudNewer(undefined, ct.updated_at)) {
      await db.tasks.put({
        id: ct.id,
        project_id: ct.project_id,
        node_uid: ct.node_uid,
        title: ct.title,
        status: ct.status,
        priority: ct.priority,
        due_date: ct.due_date ? new Date(ct.due_date) : undefined,
        completed_at: ct.completed_at ? new Date(ct.completed_at) : undefined,
        sort_order: ct.sort_order ?? 0,
        user_id: ct.user_id,
        pomodoro_count: ct.pomodoro_count ?? undefined,
        attachments: ct.attachments ?? undefined,
        _localDirty: false,
        __syncPull: true,
      })
      pulledTotal++
      devLog(`[Sync] Pull: task "${ct.title}" updated`)
    } else if (local.version !== ct.version) {
      conflicts.push({
        table: 'tasks',
        id: ct.id,
        localUpdatedAt: '',
        cloudUpdatedAt: ct.updated_at,
        localVersion: local.version,
        cloudVersion: ct.version ?? 1,
      })
    }
  }

  // 首次全量同步成功后记录 checkpoint
  await setLastSyncCheckpoint(userId, new Date().toISOString())

  return { pulledTotal, errors, conflicts }
}

/**
 * 应用 change_log 增量记录到本地 IndexedDB
 */
async function applyChangeLog(changeLog: ChangeLogEntry[]): Promise<PullResult> {
  const pulledTotal = 0
  const errors: string[] = []
  const conflicts: ConflictInfo[] = []

  for (const entry of changeLog) {
    try {
      const payload = entry.payload
      switch (entry.table_name) {
        case 'projects': {
          await db.projects.put({
            id: entry.record_id,
            name: payload.name as string,
            color: (payload.color as string) ?? '#666',
            sort_order: (payload.sort_order as number) ?? 0,
            is_archived: (payload.is_archived as boolean) ?? false,
            version: (payload.version as number) ?? 1,
            last_opened_at: payload.last_opened_at ? new Date(payload.last_opened_at as string) : undefined,
            user_id: payload.user_id as string,
            project_type: (payload.project_type as any) ?? 'cloud',
            _localDirty: false,
            __syncPull: true,
          })
          break
        }
        case 'mindmaps': {
          await db.mindmaps.put({
            id: entry.record_id,
            project_id: payload.project_id as string,
            tree_data: (payload.tree_data ?? {}) as Record<string, unknown>,
            view_state: (payload.view_state ?? {}) as Record<string, unknown>,
            version: (payload.version as number) ?? 1,
            _localDirty: false,
            __syncPull: true,
          })
          break
        }
        case 'tasks': {
          await db.tasks.put({
            id: entry.record_id,
            project_id: payload.project_id as string,
            node_uid: payload.node_uid as string,
            title: payload.title as string,
            status: payload.status as any,
            priority: payload.priority as any,
            due_date: payload.due_date ? new Date(payload.due_date as string) : undefined,
            completed_at: payload.completed_at ? new Date(payload.completed_at as string) : undefined,
            sort_order: (payload.sort_order as number) ?? 0,
            user_id: payload.user_id as string,
            pomodoro_count: payload.pomodoro_count ? Number(payload.pomodoro_count) : undefined,
            attachments: payload.attachments as any,
            _localDirty: false,
            __syncPull: true,
          })
          break
        }
      }
    } catch (e: any) {
      errors.push(`${entry.table_name} ${entry.record_id}: ${e.message}`)
    }
  }

  return { pulledTotal: changeLog.length - errors.length, errors, conflicts }
}

// ============================================
// Full Sync: push → pull
// ============================================

export async function doAutoSync(): Promise<void> {
  const userId = useAuthStore.getState().user?.id ?? null
  if (!userId || !navigator.onLine) return

  cancelPushDebounce() // 避免和 debounce push 重复
  devLog('[Sync] === Auto sync started ===')

  // Step 1: push dirty records
  const pushResult = await pushDirtyRecords()
  if (pushResult.errors.length > 0) {
    devWarn('[Sync] Push completed with errors:', pushResult.errors)
  }

  // Step 2: pull from cloud (with updated_at comparison)
  const pullResult = await pullFromCloud()
  if (pullResult.errors.length > 0) {
    throw new Error(`Pull failed: ${pullResult.errors.join('; ')}`)
  }
  if (pullResult.conflicts.length > 0) {
    devWarn('[Sync] Conflicts detected during pull:', pullResult.conflicts)
  }

  // Step 3: 如果 push 有不可恢复的错误，同步结束后抛出让调用者感知
  if (pushResult.errors.length > 0) {
    const summary = pushResult.errors.slice(0, 5).join('; ')
    const more = pushResult.errors.length > 5 ? ` 等共 ${pushResult.errors.length} 项失败` : ''
    throw new Error(`Push failed: ${summary}${more}`)
  }

  devLog(`[Sync] === Auto sync complete (pushed ${pushResult.pushedTotal}, pulled ${pullResult.pulledTotal}) ===`)
}

// ============================================
// Realtime subscription
// ============================================

let unsubscribeRealtime: (() => void) | null = null
let realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null

export function subscribeToRealtime(userId: string): void {
  if (unsubscribeRealtime) {
    unsubscribeRealtime()
    unsubscribeRealtime = null
  }

  unsubscribeRealtime = subscribeToChanges(
    userId,
    ['projects', 'mindmaps', 'tasks'],
    (_event: RealtimeChangeEvent) => {
      // 延迟聚合多个事件，然后 pull
      if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer)
      realtimeDebounceTimer = setTimeout(() => {
        realtimeDebounceTimer = null
        pullFromCloud().catch((e) => devWarn('[Sync] Realtime pull failed:', e))
      }, 500)
    }
  )
}

export function unsubscribeFromRealtime(): void {
  if (unsubscribeRealtime) {
    unsubscribeRealtime()
    unsubscribeRealtime = null
  }
}

// ============================================
// Backward-compatible exports
// 旧 API 保留签名，内部改为 dirty-flag + debounce
// ============================================

export async function syncProjectToCloud(project: LocalProject): Promise<void> {
  // Dexie hook 已在 put 时自动标记 dirty，这里兜底
  await db.projects.update(project.id, { _localDirty: true }).catch(() => {})
  schedulePushDebounce()
}

export async function deleteProjectFromCloud(projectId: string): Promise<void> {
  if (!getUserId() || !isOnline()) return
  const { error } = await deleteFromCloud('projects', projectId)
  if (error) devWarn('[Sync] Delete project from cloud failed:', error.message)
}

export async function syncMindmapToCloud(mindmap: LocalMindmap): Promise<void> {
  await db.mindmaps.update(mindmap.id, { _localDirty: true }).catch(() => {})
  schedulePushDebounce()
}

export async function deleteMindmapFromCloud(mindmapId: string): Promise<void> {
  if (!getUserId() || !isOnline()) return
  const { error } = await deleteFromCloud('mindmaps', mindmapId)
  if (error) devWarn('[Sync] Delete mindmap from cloud failed:', error.message)
}

export async function syncTaskToCloud(task: LocalTask): Promise<void> {
  await db.tasks.update(task.id, { _localDirty: true }).catch(() => {})
  schedulePushDebounce()
}

export async function deleteTaskFromCloud(taskId: string): Promise<void> {
  if (!getUserId() || !isOnline()) return
  const { error } = await deleteFromCloud('tasks', taskId)
  if (error) devWarn('[Sync] Delete task from cloud failed:', error.message)
}

// ============================================
// Migrate (首次登录批量迁移)
// ============================================

export async function migrateLocalDataToCloud(
  projects: LocalProject[],
  mindmaps: LocalMindmap[],
  tasks: LocalTask[]
): Promise<void> {
  const userId = getUserId()
  if (!userId) throw new Error('用户未登录，无法同步')
  if (!isOnline()) throw new Error('当前处于离线状态，无法同步')

  devLog(`[Sync] Migrating ${projects.length}P, ${mindmaps.length}M, ${tasks.length}T to cloud...`)

  const errors: string[] = []

  if (projects.length > 0) {
    const { failed } = await batchUpsertToCloud('projects', projects.map((p) => ({
      id: p.id,
      user_id: userId,
      name: p.name,
      color: p.color,
      icon: 'folder',
      sort_order: p.sort_order,
      is_archived: p.is_archived,
      version: p.version,
      last_opened_at: p.last_opened_at?.toISOString() ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })))
    for (const f of failed) errors.push(`project ${f.id}: ${f.error.message}`)
  }

  if (mindmaps.length > 0) {
    const { failed } = await batchUpsertToCloud('mindmaps', mindmaps.map((m) => ({
      id: m.id,
      project_id: m.project_id,
      user_id: userId,
      title: '思维导图',
      root_node_id: 'root',
      tree_data: m.tree_data,
      view_state: m.view_state ?? {},
      version: m.version,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })))
    for (const f of failed) errors.push(`mindmap ${f.id}: ${f.error.message}`)
  }

  if (tasks.length > 0) {
    const mindmapMap = new Map<string, string>()
    for (const t of tasks) {
      if (!mindmapMap.has(t.project_id)) {
        const mm = await db.mindmaps.where('project_id').equals(t.project_id).first()
        if (mm) mindmapMap.set(t.project_id, mm.id)
      }
    }
    const { failed } = await batchUpsertToCloud('tasks', tasks.map((t) => ({
      id: t.id,
      user_id: userId,
      project_id: t.project_id,
      mindmap_id: mindmapMap.get(t.project_id),
      title: t.title,
      status: t.status,
      node_uid: t.node_uid ?? null,
      priority: t.priority ?? null,
      due_date: t.due_date ? t.due_date.toISOString().split('T')[0] : null,
      completed_at: t.completed_at?.toISOString() ?? null,
      sort_order: t.sort_order ?? null,
      updated_at: new Date().toISOString(),
      pomodoro_count: t.pomodoro_count ?? null,
      attachments: t.attachments ? t.attachments : null,
    })))
    for (const f of failed) errors.push(`task ${f.id}: ${f.error.message}`)
  }

  if (errors.length > 0) {
    const summary = errors.slice(0, 3).join('; ')
    const more = errors.length > 3 ? ` 等共 ${errors.length} 项失败` : ''
    throw new Error(`云端同步失败: ${summary}${more}`)
  }

  devLog('[Sync] Migration complete.')
}

// ============================================
// Legacy fetchAllFromCloud (kept for compatibility)
// ============================================

export async function fetchAllFromCloud(): Promise<{
  projects: LocalProject[]
  mindmaps: LocalMindmap[]
  tasks: LocalTask[]
}> {
  const userId = getUserId()
  if (!userId) throw new Error('用户未登录')
  if (!isOnline()) throw new Error('当前处于离线状态')

  const [projectsResult, mindmapsResult, tasksResult] = await Promise.all([
    _fetchAllFromCloud({ table: 'projects', userId }),
    _fetchAllFromCloud({ table: 'mindmaps', userId }),
    _fetchAllFromCloud({ table: 'tasks', userId }),
  ])

  return {
    projects: (projectsResult.records ?? []).map((r) => formatProjectFromCloud(r)),
    mindmaps: (mindmapsResult.records ?? []).map((r) => formatMindmapFromCloud(r)),
    tasks: (tasksResult.records ?? []).map((r) => formatTaskFromCloud(r)),
  }
}

function formatProjectFromCloud(r: any): LocalProject {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    sort_order: r.sort_order ?? 0,
    is_archived: r.is_archived ?? false,
    version: r.version ?? 1,
    last_opened_at: r.last_opened_at ? new Date(r.last_opened_at) : undefined,
    user_id: r.user_id,
    project_type: r.project_type ?? 'cloud',
    _localDirty: false,
  }
}

function formatMindmapFromCloud(r: any): LocalMindmap {
  return {
    id: r.id,
    project_id: r.project_id,
    tree_data: r.tree_data as Record<string, unknown>,
    view_state: (r.view_state ?? {}) as Record<string, unknown>,
    version: r.version ?? 1,
    _localDirty: false,
  }
}

function formatTaskFromCloud(r: any): LocalTask {
  return {
    id: r.id,
    project_id: r.project_id,
    node_uid: r.node_uid,
    title: r.title,
    status: r.status,
    priority: r.priority,
    due_date: r.due_date ? new Date(r.due_date) : undefined,
    completed_at: r.completed_at ? new Date(r.completed_at) : undefined,
    sort_order: r.sort_order ?? 0,
    user_id: r.user_id,
    pomodoro_count: r.pomodoro_count ?? undefined,
    attachments: r.attachments ?? undefined,
    _localDirty: false,
  }
}

// ============================================
// Auto-sync scheduling
// ============================================

let autoSyncTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleAutoSync(): void {
  cancelAutoSyncSchedule()
  if (!getUserId() || !navigator.onLine) return
  autoSyncTimer = setTimeout(() => {
    autoSyncTimer = null
    void doAutoSync()
  }, 500)
}

export function cancelAutoSyncSchedule(): void {
  if (autoSyncTimer) {
    clearTimeout(autoSyncTimer)
    autoSyncTimer = null
  }
}
