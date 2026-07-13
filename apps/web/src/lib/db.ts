import Dexie, { type Table } from 'dexie'
import { devLog, devWarn } from '@/lib/devConsole'
import {
  syncProjectToCloud,
  syncMindmapToCloud,
  syncTaskToCloud,
  deleteProjectFromCloud,
  deleteTaskFromCloud,
} from '@/lib/sync'

// --------------------------------------------------
// IndexedDB Schema — Dexie.js
// --------------------------------------------------

export interface LocalProject {
  id: string
  name: string
  color: string
  sort_order: number
  is_archived: boolean
  version: number
  last_opened_at?: Date
  user_id?: string
}

export interface LocalMindmap {
  id: string
  project_id: string
  tree_data: Record<string, unknown>
  view_state: Record<string, unknown>
  version: number
}

export interface AttachmentItem {
  id: string
  name: string
  size: number
  type: string
  url: string
  path: string
  createdAt: string
}

export interface LocalTask {
  id: string
  project_id: string
  node_uid: string
  title: string
  status: 'todo' | 'in_progress' | 'done' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: Date
  start_date?: Date
  duration_days?: number
  completed_at?: Date
  sort_order: number
  user_id?: string
  pomodoro_count?: number
  attachments?: AttachmentItem[]
}

export interface LocalSetting {
  key: string
  value: unknown
}

class MindFlowDB extends Dexie {
  projects!: Table<LocalProject, string>
  mindmaps!: Table<LocalMindmap, string>
  tasks!: Table<LocalTask, string>
  settings!: Table<LocalSetting, string>

  constructor() {
    super('mindflow-db')
    this.version(1).stores({
      projects: 'id, name, color, sort_order, is_archived',
      mindmaps: 'id, project_id',
      tasks: 'id, project_id, node_uid, title, status, priority, due_date',
      settings: 'key',
    })
    this.version(2).stores({
      projects: 'id, name, color, sort_order, is_archived, last_opened_at',
      mindmaps: 'id, project_id',
      tasks: 'id, project_id, node_uid, title, status, priority, due_date',
      settings: 'key',
    })
  }
}

export const db = new MindFlowDB()

// Helpers
export async function getProjectTasks(projectId: string): Promise<LocalTask[]> {
  return db.tasks.where('project_id').equals(projectId).sortBy('sort_order')
}

export async function getAllTasks(): Promise<LocalTask[]> {
  return db.tasks.toArray()
}

export async function upsertTask(task: LocalTask): Promise<void> {
  await db.tasks.put(task)
  await syncTaskToCloud(task).catch((e) => { devWarn('[DB] sync task failed:', e) })
}

export async function deleteTask(taskId: string): Promise<void> {
  await db.tasks.delete(taskId)
  await deleteTaskFromCloud(taskId).catch((e) => { devWarn('[DB] delete task from cloud failed:', e) })
}

/** Update task in IndexedDB and sync status/priority back to the mindmap tree node */
export async function updateTaskWithMindmapSync(
  taskId: string,
  updates: Partial<LocalTask>
): Promise<void> {
  // 1. Update task
  await db.tasks.update(taskId, updates)

  // 2. If status or priority changed, reflect back to mindmap node
  if (!('status' in updates) && !('priority' in updates)) return

  const task = await db.tasks.get(taskId)
  if (!task) return

  const mindmap = await db.mindmaps.where('project_id').equals(task.project_id).first()
  if (!mindmap?.tree_data) return

  const tree = structuredClone(mindmap.tree_data) as Record<string, unknown>

  const targetNodeUid = task.node_uid
  function updateNode(node: Record<string, unknown>): boolean {
    const nodeData = (node.data || {}) as Record<string, unknown>
    if (nodeData.uid === targetNodeUid) {
      if ('status' in updates) {
        nodeData._status = updates.status
        if (updates.status === 'done') {
          nodeData._completedAt = new Date().toISOString()
          nodeData.fillColor = '#dcfce7'
          nodeData.borderColor = '#86efac'
          nodeData.color = '#15803d'
        } else {
          delete nodeData._completedAt
          nodeData.fillColor = '#eff6ff'
          nodeData.borderColor = '#93c5fd'
          nodeData.color = '#1e40af'
        }
      }
      if ('priority' in updates) {
        nodeData._priority = updates.priority
      }
      return true
    }
    const children = (node.children || []) as Record<string, unknown>[]
    for (const child of children) {
      if (updateNode(child)) return true
    }
    return false
  }

  const updated = updateNode(tree)
  if (updated) {
    const updatedMindmap = {
      ...mindmap,
      tree_data: tree,
      version: mindmap.version + 1,
    }
    await db.mindmaps.update(mindmap.id, {
      tree_data: tree,
      version: mindmap.version + 1,
    })
    await syncMindmapToCloud(updatedMindmap).catch((e) => { devWarn('[DB] sync mindmap failed:', e) })
  }
}

export async function getProjects(): Promise<LocalProject[]> {
  return db.projects.orderBy('sort_order').toArray()
}

export async function getRecentProjects(limit = 4): Promise<LocalProject[]> {
  const all = await db.projects.toArray()
  return all
    .filter((p) => !p.is_archived && p.last_opened_at)
    .sort((a, b) => (b.last_opened_at!.getTime() || 0) - (a.last_opened_at!.getTime() || 0))
    .slice(0, limit)
}

export async function upsertProject(project: LocalProject): Promise<void> {
  await db.projects.put(project)
  await syncProjectToCloud(project).catch((e) => { devWarn('[DB] sync project failed:', e) })
}

export async function deleteProject(projectId: string): Promise<void> {
  await db.transaction('rw', db.projects, db.mindmaps, db.tasks, async () => {
    await db.projects.delete(projectId)
    await db.mindmaps.where('project_id').equals(projectId).delete()
    await db.tasks.where('project_id').equals(projectId).delete()
  })
  await deleteProjectFromCloud(projectId).catch((e) => { devWarn('[DB] delete project from cloud failed:', e) })
}

// --------------------------------------------------
// Task sync from mindmap tree data
// --------------------------------------------------
export async function syncTasksFromTree(
  projectId: string,
  treeData: Record<string, unknown>
): Promise<void> {
  // Preserve pomodoro_count from existing tasks
  const existingTasks = await db.tasks.where('project_id').equals(projectId).toArray()
  const pomodoroMap = new Map<string, number>()
  for (const t of existingTasks) {
    if (t.pomodoro_count && t.pomodoro_count > 0) {
      pomodoroMap.set(t.node_uid, t.pomodoro_count)
    }
  }

  const tasks: LocalTask[] = []

  function traverse(node: Record<string, unknown>) {
    const data = (node.data || {}) as Record<string, unknown>
    const uid = String(data.uid || '')
    const text = String(data.text || '')
    const isTask = Boolean(data._isTask)

    if (isTask && uid && text) {
      tasks.push({
        id: `${projectId}-${uid}`,
        project_id: projectId,
        node_uid: uid,
        title: text,
        status: (data._status as LocalTask['status']) || 'todo',
        priority: (data._priority as LocalTask['priority']) || 'medium',
        due_date: data._dueDate ? new Date(String(data._dueDate)) : undefined,
        sort_order: tasks.length,
        pomodoro_count: pomodoroMap.get(uid),
      })
    }

    const children = (node.children || []) as Record<string, unknown>[]
    children.forEach((child) => traverse(child))
  }

  traverse(treeData)

  await db.transaction('rw', db.tasks, async () => {
    await db.tasks.where('project_id').equals(projectId).delete()
    if (tasks.length > 0) {
      await db.tasks.bulkPut(tasks)
    }
  })

  // NEW: 同步 tasks 到云端（已登录 + 在线时）
  for (const task of tasks) {
    await syncTaskToCloud(task).catch((e) => { devWarn('[DB] sync task failed:', e) })
  }
}

// --------------------------------------------------
// Data integrity: cleanup orphaned tasks whose node_uid
// no longer exists in the project's mindmap tree.
// Run once on app init.
// --------------------------------------------------
export async function cleanupOrphanedTasks(): Promise<number> {
  const allTasks = await db.tasks.toArray()
  const mindmaps = await db.mindmaps.toArray()
  const mindmapByProject = new Map<string, LocalMindmap>()
  for (const m of mindmaps) {
    mindmapByProject.set(m.project_id, m)
  }

  let deletedCount = 0
  const toDelete: string[] = []

  for (const task of allTasks) {
    const mm = mindmapByProject.get(task.project_id)
    if (!mm || !mm.tree_data) {
      // No mindmap at all → definitely orphaned
      toDelete.push(task.id)
      continue
    }
    const tree = mm.tree_data as Record<string, unknown>

    function findNodeUid(node: Record<string, unknown>): boolean {
      const data = (node.data || {}) as Record<string, unknown>
      if (String(data.uid || '') === task.node_uid) return true
      const children = (node.children || []) as Record<string, unknown>[]
      for (const child of children) {
        if (findNodeUid(child)) return true
      }
      return false
    }

    const found = findNodeUid(tree)
    if (!found) {
      toDelete.push(task.id)
    }
  }

  if (toDelete.length > 0) {
    await db.tasks.bulkDelete(toDelete)
    deletedCount = toDelete.length
    devLog(`[MindFlow] cleanupOrphanedTasks: removed ${deletedCount} orphaned task(s)`)
  }
  return deletedCount
}

// --------------------------------------------------
// Storage statistics & health check
// --------------------------------------------------

export interface StorageStats {
  projectCount: number
  activeProjectCount: number
  archivedProjectCount: number
  taskCount: number
  completedTaskCount: number
  nodeCount: number
  estimatedSizeKB: number
}

export async function getStorageStats(): Promise<StorageStats> {
  const projects = await db.projects.toArray()
  const mindmaps = await db.mindmaps.toArray()
  const tasks = await db.tasks.toArray()

  let nodeCount = 0
  for (const mm of mindmaps) {
    if (!mm.tree_data) continue
    function countNodes(node: Record<string, unknown>) {
      nodeCount++
      const children = (node.children || []) as Record<string, unknown>[]
      for (const child of children) countNodes(child)
    }
    countNodes(mm.tree_data as Record<string, unknown>)
  }

  const estimatedSizeKB = Math.round(
    (JSON.stringify(projects).length +
      JSON.stringify(mindmaps).length +
      JSON.stringify(tasks).length) /
      1024
  )

  return {
    projectCount: projects.length,
    activeProjectCount: projects.filter((p) => !p.is_archived).length,
    archivedProjectCount: projects.filter((p) => p.is_archived).length,
    taskCount: tasks.length,
    completedTaskCount: tasks.filter((t) => t.status === 'done').length,
    nodeCount,
    estimatedSizeKB,
  }
}

export interface HealthIssue {
  id: string
  type: 'orphan_task' | 'missing_mindmap' | 'empty_project' | 'duplicate_node_uid'
  severity: 'warning' | 'error'
  message: string
  projectId?: string
  taskId?: string
  autoFixable: boolean
}

export async function runHealthCheck(): Promise<HealthIssue[]> {
  const issues: HealthIssue[] = []
  const projects = await db.projects.toArray()
  const mindmaps = await db.mindmaps.toArray()
  const tasks = await db.tasks.toArray()

  const mindmapByProject = new Map<string, LocalMindmap>()
  for (const m of mindmaps) {
    mindmapByProject.set(m.project_id, m)
  }

  // 1. Missing mindmap for project
  for (const p of projects) {
    if (!mindmapByProject.has(p.id)) {
      issues.push({
        id: `missing-mindmap-${p.id}`,
        type: 'missing_mindmap',
        severity: 'error',
        message: `项目「${p.name}」缺少思维导图数据`,
        projectId: p.id,
        autoFixable: false,
      })
    }
  }

  // 2. Orphan tasks
  for (const task of tasks) {
    const mm = mindmapByProject.get(task.project_id)
    if (!mm || !mm.tree_data) {
      issues.push({
        id: `orphan-task-${task.id}`,
        type: 'orphan_task',
        severity: 'warning',
        message: `任务「${task.title}」所属项目缺少导图数据`,
        projectId: task.project_id,
        taskId: task.id,
        autoFixable: true,
      })
      continue
    }

    function findNodeUid(node: Record<string, unknown>): boolean {
      const data = (node.data || {}) as Record<string, unknown>
      if (String(data.uid || '') === task.node_uid) return true
      const children = (node.children || []) as Record<string, unknown>[]
      for (const child of children) {
        if (findNodeUid(child)) return true
      }
      return false
    }

    if (!findNodeUid(mm.tree_data as Record<string, unknown>)) {
      issues.push({
        id: `orphan-task-${task.id}`,
        type: 'orphan_task',
        severity: 'warning',
        message: `任务「${task.title}」在导图中找不到对应节点`,
        projectId: task.project_id,
        taskId: task.id,
        autoFixable: true,
      })
    }
  }

  // 3. Empty projects (no tasks, mindmap only has root node)
  for (const p of projects) {
    const projectTasks = tasks.filter((t) => t.project_id === p.id)
    const mm = mindmapByProject.get(p.id)
    if (projectTasks.length === 0 && mm?.tree_data) {
      const rootChildren = ((mm.tree_data as Record<string, unknown>).children || []) as unknown[]
      if (rootChildren.length === 0) {
        issues.push({
          id: `empty-project-${p.id}`,
          type: 'empty_project',
          severity: 'warning',
          message: `项目「${p.name}」为空（无节点和任务）`,
          projectId: p.id,
          autoFixable: false,
        })
      }
    }
  }

  // 4. Duplicate node_uid within a project
  const nodeUidMap = new Map<string, Set<string>>()
  for (const mm of mindmaps) {
    if (!mm.tree_data) continue
    const seen = new Set<string>()
    function collectUids(node: Record<string, unknown>) {
      const data = (node.data || {}) as Record<string, unknown>
      const uid = String(data.uid || '')
      if (uid) {
        if (seen.has(uid)) {
          issues.push({
            id: `dup-uid-${mm.project_id}-${uid}`,
            type: 'duplicate_node_uid',
            severity: 'error',
            message: `项目导图存在重复节点 ID: ${uid.slice(0, 8)}...`,
            projectId: mm.project_id,
            autoFixable: false,
          })
        }
        seen.add(uid)
      }
      const children = (node.children || []) as Record<string, unknown>[]
      for (const child of children) collectUids(child)
    }
    collectUids(mm.tree_data as Record<string, unknown>)
    nodeUidMap.set(mm.project_id, seen)
  }

  return issues
}

export async function fixHealthIssues(issues: HealthIssue[]): Promise<number> {
  let fixed = 0
  const orphanTasks = issues.filter(
    (i) => i.type === 'orphan_task' && i.autoFixable && i.taskId
  )
  if (orphanTasks.length > 0) {
    await db.tasks.bulkDelete(orphanTasks.map((i) => i.taskId!))
    fixed += orphanTasks.length
  }
  return fixed
}

// Expose for E2E automation (dev only)
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__mindflowDb = db
}
