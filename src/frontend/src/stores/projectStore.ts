import { create } from 'zustand'
import type { LocalProject } from '@/lib/db'
import { db, getProjects, getRecentProjects, upsertProject, deleteProject } from '@/lib/db'
import { devWarn } from '@/lib/devConsole'

interface ProjectState {
  projects: LocalProject[]
  archivedProjects: LocalProject[]
  recentProjects: LocalProject[]
  activeProjectId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  loadProjects: () => Promise<void>
  loadRecentProjects: () => Promise<void>
  loadArchivedProjects: () => Promise<void>
  setActiveProject: (id: string | null) => void
  addProject: (project: LocalProject) => Promise<void>
  updateProject: (id: string, updates: Partial<LocalProject>) => Promise<void>
  removeProject: (id: string) => Promise<void>
  archiveProject: (id: string) => Promise<void>
  unarchiveProject: (id: string) => Promise<void>
  reorderProjects: (orderedIds: string[]) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  archivedProjects: [],
  recentProjects: [],
  activeProjectId: null,
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const list = await getProjects()
      set({ projects: list.filter((p) => !p.is_archived), isLoading: false })
      await get().loadRecentProjects()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load projects', isLoading: false })
    }
  },

  loadRecentProjects: async () => {
    try {
      const list = await getRecentProjects(4)
      set({ recentProjects: list })
    } catch (err) {
      devWarn('Failed to load recent projects:', err)
    }
  },

  loadArchivedProjects: async () => {
    try {
      // IndexedDB 存的是原生 boolean (true/false),Dexie 的 .equals(1) 找不到 boolean true
      // 用 filter 显式过滤 boolean 值更可靠
      const all = await db.projects.toArray()
      const list = all
        .filter((p) => p.is_archived === true)
        .sort((a, b) => a.sort_order - b.sort_order)
      set({ archivedProjects: list })
    } catch (err) {
      devWarn('Failed to load archived projects:', err)
    }
  },

  setActiveProject: (id) => {
    set({ activeProjectId: id })
    if (id) {
      db.projects.update(id, { last_opened_at: new Date() }).catch(() => {
        /* ignore */
      })
      get().loadRecentProjects().catch(() => { /* ignore */ })
    }
  },

  addProject: async (project) => {
    const enriched = { ...project, last_opened_at: new Date() }
    await upsertProject(enriched)
    await get().loadProjects()
    set({ activeProjectId: project.id })
  },

  updateProject: async (id, updates) => {
    await db.projects.update(id, updates)
    await get().loadProjects()
  },

  removeProject: async (id) => {
    await deleteProject(id)
    const remaining = get().projects.filter((p) => p.id !== id)
    const remainingArchived = get().archivedProjects.filter((p) => p.id !== id)
    set({
      projects: remaining,
      archivedProjects: remainingArchived,
      activeProjectId:
        get().activeProjectId === id
          ? remaining[0]?.id ?? null
          : get().activeProjectId,
    })
  },

  archiveProject: async (id) => {
    await db.projects.update(id, { is_archived: true })
    await get().loadProjects()
    await get().loadArchivedProjects()
    const state = get()
    if (state.activeProjectId === id) {
      const next = state.projects[0]?.id ?? null
      set({ activeProjectId: next })
    }
  },

  unarchiveProject: async (id) => {
    await db.projects.update(id, { is_archived: false })
    await get().loadProjects()
    await get().loadArchivedProjects()
  },

  reorderProjects: async (orderedIds) => {
    await db.transaction('rw', db.projects, async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.projects.update(orderedIds[i]!, { sort_order: i })
      }
    })
    await get().loadProjects()
  },
}))
