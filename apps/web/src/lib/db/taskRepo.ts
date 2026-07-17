import { db } from './schema'
import type { LocalTask } from './schema'
import { syncTaskToCloud, deleteTaskFromCloud } from '@/lib/sync'
import { devWarn } from '@/lib/devConsole'

export async function getProjectTasks(projectId: string): Promise<LocalTask[]> {
  return db.tasks.where('project_id').equals(projectId).sortBy('sort_order')
}

export async function getAllTasks(): Promise<LocalTask[]> {
  return db.tasks.toArray()
}

export async function upsertTask(task: LocalTask): Promise<void> {
  await db.tasks.put(task)
  await syncTaskToCloud(task).catch((e) => {
    devWarn('[DB] sync task failed:', e)
  })
}

export async function deleteTask(taskId: string): Promise<void> {
  await db.tasks.delete(taskId)
  await deleteTaskFromCloud(taskId).catch((e) => {
    devWarn('[DB] delete task from cloud failed:', e)
  })
}
