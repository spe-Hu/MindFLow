import { supabase } from '@/lib/supabase'
import { devLog, devWarn } from '@/lib/devConsole'
import { useAuthStore } from '@/stores/authStore'
import type {
  LocalProject,
  LocalMindmap,
  LocalTask,
} from '@/lib/db'
import type {
  ProjectInsert,
  MindmapInsert,
  TaskInsert,
} from '@/types/supabase'

// ============================================
// 数据同步服务 — 本地 IndexedDB ↔ Supabase 云端
// ============================================
// 规则：
// 1. 所有本地写操作完成后，如果用户已登录，自动同步到云端
// 2. 未登录时静默跳过，不报错
// 3. 首次登录时可将本地数据批量迁移到云端
// ============================================

function getUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null
}

function isOnline(): boolean {
  return navigator.onLine
}

// --------------------------------------------
// 项目同步
// --------------------------------------------

export async function syncProjectToCloud(project: LocalProject): Promise<void> {
  const userId = getUserId()
  if (!userId || !isOnline()) return

  const payload: ProjectInsert = {
    id: project.id,
    user_id: userId,
    name: project.name,
    color: project.color,
    icon: 'folder',
    sort_order: project.sort_order,
    is_archived: project.is_archived,
    version: project.version,
    last_opened_at: project.last_opened_at?.toISOString() ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { error } = await (supabase.from('projects').upsert(payload as any, { onConflict: 'id' }) as any)
  if (error) {
    devWarn('Sync project failed:', error)
    throw new Error(`项目 "${project.name}" 同步失败: ${error.message}`)
  }
}

export async function deleteProjectFromCloud(projectId: string): Promise<void> {
  if (!getUserId() || !isOnline()) return
  const { error } = await (supabase.from('projects').delete().eq('id', projectId) as any)
  if (error) devWarn('Delete project from cloud failed:', error)
}

// --------------------------------------------
// 思维导图同步
// --------------------------------------------

export async function syncMindmapToCloud(mindmap: LocalMindmap): Promise<void> {
  const userId = getUserId()
  if (!userId || !isOnline()) return

  const payload: MindmapInsert = {
    id: mindmap.id,
    project_id: mindmap.project_id,
    user_id: userId,
    title: '思维导图',
    root_node_id: 'root',
    tree_data: mindmap.tree_data as any,
    view_state: (mindmap.view_state ?? {}) as any,
    version: mindmap.version,
    last_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { error } = await (supabase.from('mindmaps').upsert(payload as any, { onConflict: 'id' }) as any)
  if (error) {
    devWarn('Sync mindmap failed:', error)
    throw new Error(`思维导图同步失败: ${error.message}`)
  }
}

export async function deleteMindmapFromCloud(mindmapId: string): Promise<void> {
  if (!getUserId() || !isOnline()) return
  const { error } = await (supabase.from('mindmaps').delete().eq('id', mindmapId) as any)
  if (error) devWarn('Delete mindmap from cloud failed:', error)
}

// --------------------------------------------
// 任务同步
// --------------------------------------------

export async function syncTaskToCloud(task: LocalTask): Promise<void> {
  const userId = getUserId()
  if (!userId || !isOnline()) return

  // Find the mindmap_id for this project
  const { data: mindmapData } = await supabase
    .from('mindmaps')
    .select('id')
    .eq('project_id', task.project_id)
    .maybeSingle()

  const mindmapId = mindmapData?.id ?? task.project_id

  const payload: TaskInsert = {
    id: task.id,
    user_id: userId,
    project_id: task.project_id,
    mindmap_id: mindmapId,
    node_uid: task.node_uid,
    title: task.title,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date ? task.due_date.toISOString().split('T')[0] : null,
    completed_at: task.completed_at?.toISOString() ?? null,
    sort_order: task.sort_order,
    updated_at: new Date().toISOString(),
    pomodoro_count: task.pomodoro_count ?? null,
    attachments: task.attachments ? (task.attachments as any) : null,
  }

  const { error } = await (supabase.from('tasks').upsert(payload as any, { onConflict: 'id' }) as any)
  if (error) {
    devWarn('Sync task failed:', error)
    throw new Error(`任务 "${task.title}" 同步失败: ${error.message}`)
  }
}

export async function deleteTaskFromCloud(taskId: string): Promise<void> {
  if (!getUserId() || !isOnline()) return
  const { error } = await (supabase.from('tasks').delete().eq('id', taskId) as any)
  if (error) devWarn('Delete task from cloud failed:', error)
}

// --------------------------------------------
// 批量迁移：本地数据 → 云端
// --------------------------------------------

export async function migrateLocalDataToCloud(
  projects: LocalProject[],
  mindmaps: LocalMindmap[],
  tasks: LocalTask[]
): Promise<void> {
  const userId = getUserId()
  if (!userId) throw new Error('用户未登录，无法同步')
  if (!isOnline()) throw new Error('当前处于离线状态，无法同步')

  devLog(`[Sync] Migrating ${projects.length} projects, ${mindmaps.length} mindmaps, ${tasks.length} tasks to cloud...`)

  const errors: string[] = []

  for (const project of projects) {
    try {
      await syncProjectToCloud(project)
    } catch (e: any) {
      errors.push(e.message)
    }
  }

  for (const mindmap of mindmaps) {
    try {
      await syncMindmapToCloud(mindmap)
    } catch (e: any) {
      errors.push(e.message)
    }
  }

  for (const task of tasks) {
    try {
      await syncTaskToCloud(task)
    } catch (e: any) {
      errors.push(e.message)
    }
  }

  if (errors.length > 0) {
    const summary = errors.slice(0, 3).join('; ')
    const more = errors.length > 3 ? ` 等共 ${errors.length} 项失败` : ''
    throw new Error(`云端同步失败: ${summary}${more}`)
  }

  devLog('[Sync] Migration complete.')
}

// --------------------------------------------
// 从云端拉取全部数据
// --------------------------------------------

export async function fetchAllFromCloud(): Promise<{
  projects: LocalProject[]
  mindmaps: LocalMindmap[]
  tasks: LocalTask[]
}> {
  const userId = getUserId()
  if (!userId) throw new Error('用户未登录，无法从云端拉取数据')
  if (!isOnline()) throw new Error('当前处于离线状态，无法拉取数据')

  const [
    { data: projectsData, error: projectsError },
    { data: mindmapsData, error: mindmapsError },
    { data: tasksData, error: tasksError },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('user_id', userId),
    supabase.from('mindmaps').select('*').eq('user_id', userId),
    supabase.from('tasks').select('*').eq('user_id', userId),
  ])

  if (projectsError || mindmapsError || tasksError) {
    const msgs = [projectsError, mindmapsError, tasksError]
      .filter(Boolean)
      .map((e: any) => e.message)
      .join('; ')
    throw new Error(`云端查询失败: ${msgs}`)
  }

  const projects: LocalProject[] = (projectsData ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    sort_order: p.sort_order ?? 0,
    is_archived: p.is_archived ?? false,
    version: p.version ?? 1,
    last_opened_at: p.last_opened_at ? new Date(p.last_opened_at) : undefined,
    user_id: p.user_id,
  }))

  const mindmaps: LocalMindmap[] = (mindmapsData ?? []).map((m: any) => ({
    id: m.id,
    project_id: m.project_id,
    tree_data: m.tree_data as Record<string, unknown>,
    view_state: (m.view_state ?? {}) as Record<string, unknown>,
    version: m.version ?? 1,
  }))

  const tasks: LocalTask[] = (tasksData ?? []).map((t: any) => ({
    id: t.id,
    project_id: t.project_id,
    node_uid: t.node_uid,
    title: t.title,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date ? new Date(t.due_date) : undefined,
    completed_at: t.completed_at ? new Date(t.completed_at) : undefined,
    sort_order: t.sort_order ?? 0,
    user_id: t.user_id,
    pomodoro_count: t.pomodoro_count ?? undefined,
  }))

  return { projects, mindmaps, tasks }
}
