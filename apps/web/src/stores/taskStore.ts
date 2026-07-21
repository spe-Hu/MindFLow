import { create } from 'zustand'
import type { LocalTask } from '@/lib/db'
import { db, getProjectTasks, getAllTasks } from '@/lib/db'
import { updateTaskWithMindmapSync } from '@/lib/taskTreeSync'

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface TaskFilterState {
  status?: TaskStatus | null
  priority?: TaskPriority | null
  dueDateRange?: { start?: Date; end?: Date } | null
  projectIds?: string[]
}

export type SortBy = 'dueDate' | 'priority' | 'createdAt'
export type SortOrder = 'asc' | 'desc'

interface TaskState {
  // Unified task cache (single source of truth)
  allTasks: LocalTask[]
  // Filters
  filters: TaskFilterState
  sortBy: SortBy
  sortOrder: SortOrder
  isLoading: boolean
  error: string | null

  // Actions
  loadProjectTasks: (projectId: string) => Promise<void>
  loadAllTasks: () => Promise<void>
  addTask: (task: LocalTask) => Promise<void>
  updateTask: (id: string, updates: Partial<LocalTask>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleTaskStatus: (id: string) => Promise<void>
  setFilters: (filters: TaskFilterState) => void
  setSortBy: (sortBy: SortBy) => void
  setSortOrder: (order: SortOrder) => void
  clearFilters: () => void
  getFilteredTasks: () => LocalTask[]
  getFilteredProjectTasks: (projectId: string) => LocalTask[]
}

const priorityWeight: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function applyFiltersAndSort(
  tasks: LocalTask[],
  filters: TaskFilterState,
  sortBy: SortBy,
  sortOrder: SortOrder
): LocalTask[] {
  let result = [...tasks]

  if (filters.status) {
    result = result.filter((t) => t.status === filters.status)
  }
  if (filters.priority) {
    result = result.filter((t) => t.priority === filters.priority)
  }
  if (filters.projectIds && filters.projectIds.length > 0) {
    result = result.filter((t) => filters.projectIds?.includes(t.project_id))
  }
  if (filters.dueDateRange) {
    const { start, end } = filters.dueDateRange
    if (start && end && start.getTime() > end.getTime()) {
      // "无截止日期" 筛选模式
      result = result.filter((t) => !t.due_date)
    } else if (start || end) {
      result = result.filter((t) => {
        if (!t.due_date) return false
        const d = new Date(t.due_date)
        if (start && d < start) return false
        if (end && d > end) return false
        return true
      })
    }
  }

  result.sort((a, b) => {
    let cmp = 0
    switch (sortBy) {
      case 'priority':
        cmp = priorityWeight[a.priority] - priorityWeight[b.priority]
        break
      case 'dueDate':
        cmp = (a.due_date?.getTime() ?? Infinity) - (b.due_date?.getTime() ?? Infinity)
        break
      case 'createdAt':
      default:
        cmp = 0
    }
    return sortOrder === 'asc' ? cmp : -cmp
  })

  return result
}

async function reloadAllTasks(setter: (fn: (state: TaskState) => Partial<TaskState>) => void) {
  const tasks = await getAllTasks()
  setter(() => ({ allTasks: tasks }))
}

export const useTaskStore = create<TaskState>((set, get) => ({
  allTasks: [],
  filters: {},
  sortBy: 'dueDate',
  sortOrder: 'asc',
  isLoading: false,
  error: null,

  loadProjectTasks: async (projectId) => {
    set({ isLoading: true, error: null })
    try {
      const tasks = await getProjectTasks(projectId)
      set((state) => {
        // Merge: replace existing tasks for this project, keep others
        const merged = state.allTasks.filter((t) => t.project_id !== projectId)
        merged.push(...tasks)
        return { allTasks: merged, isLoading: false }
      })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load tasks', isLoading: false })
    }
  },

  loadAllTasks: async () => {
    set({ isLoading: true, error: null })
    try {
      const tasks = await getAllTasks()
      set({ allTasks: tasks, isLoading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load tasks', isLoading: false })
    }
  },

  addTask: async (task) => {
    await db.tasks.put(task)
    await reloadAllTasks(set)
  },

  updateTask: async (id, updates) => {
    await updateTaskWithMindmapSync(id, updates)
    await reloadAllTasks(set)
  },

  deleteTask: async (id) => {
    await db.tasks.delete(id)
    await reloadAllTasks(set)
  },

  toggleTaskStatus: async (id) => {
    const task = await db.tasks.get(id)
    if (!task) return
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    const completedAt = newStatus === 'done' ? new Date() : undefined
    await updateTaskWithMindmapSync(id, { status: newStatus, completed_at: completedAt })
    await reloadAllTasks(set)
  },

  setFilters: (filters) => set({ filters }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  clearFilters: () => set({ filters: {} }),

  getFilteredTasks: () => {
    const { allTasks, filters, sortBy, sortOrder } = get()
    return applyFiltersAndSort(allTasks, filters, sortBy, sortOrder)
  },

  getFilteredProjectTasks: (projectId: string) => {
    const { allTasks, filters, sortBy, sortOrder } = get()
    const projectOnly = allTasks.filter((t) => t.project_id === projectId)
    return applyFiltersAndSort(projectOnly, filters, sortBy, sortOrder)
  },
}))
