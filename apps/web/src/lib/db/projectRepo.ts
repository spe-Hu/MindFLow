import { db } from './schema'
import type { LocalProject } from './schema'
import {
  syncProjectToCloud,
  deleteProjectFromCloud,
} from '@/lib/sync'
import { devWarn } from '@/lib/devConsole'

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
  await syncProjectToCloud(project).catch((e) => {
    devWarn('[DB] sync project failed:', e)
  })
}

export async function deleteProject(projectId: string): Promise<void> {
  await db.transaction('rw', db.projects, db.mindmaps, db.tasks, async () => {
    await db.projects.delete(projectId)
    await db.mindmaps.where('project_id').equals(projectId).delete()
    await db.tasks.where('project_id').equals(projectId).delete()
  })
  await deleteProjectFromCloud(projectId).catch((e) => {
    devWarn('[DB] delete project from cloud failed:', e)
  })
}
