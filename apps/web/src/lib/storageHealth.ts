import { db } from '@/lib/db/schema'
import type { LocalMindmap } from '@/lib/db/schema'
import { devLog } from '@/lib/devConsole'

// --------------------------------------------------
// Storage statistics
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

// --------------------------------------------------
// Health check
// --------------------------------------------------

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

  // 3. Empty projects
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
