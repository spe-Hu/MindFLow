import { db } from '@/lib/db/schema'
import type { LocalMindmap, LocalTask } from '@/lib/db/schema'
import { syncMindmapToCloud, syncTaskToCloud } from '@/lib/sync'
import { devLog, devWarn } from '@/lib/devConsole'

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

  // Sync tasks to cloud (when logged in + online)
  for (const task of tasks) {
    await syncTaskToCloud(task).catch((e) => {
      devWarn('[DB] sync task failed:', e)
    })
  }
}

// --------------------------------------------------
// Update task and reflect status/priority back to mindmap node
// --------------------------------------------------
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
    await syncMindmapToCloud(updatedMindmap).catch((e) => {
      devWarn('[DB] sync mindmap failed:', e)
    })
  }
}

// --------------------------------------------------
// Cleanup orphaned tasks whose node_uid no longer exists
// in the project's mindmap tree. Run once on app init.
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
