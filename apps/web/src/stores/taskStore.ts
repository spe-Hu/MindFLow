import { create } from 'zustand'
import type { LocalTask } from '@/lib/db'
import { db, getProjectTasks, getAllTasks, updateTaskWithMindmapSync } from '@/lib/db'

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
  // Current project tasks
  projectTasks: LocalTask[]
  // Global tasks
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

export const useTaskStore = create<TaskState>((set, get) => ({
  projectTasks: [],
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
      set({ projectTasks: tasks, isLoading: false })
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
    const state = get()
    if (state.projectTasks.some((t) => t.project_id === task.project_id)) {
      await state.loadProjectTasks(task.project_id)
    }
    await state.loadAllTasks()
  },

  updateTask: async (id, updates) => {
    await updateTaskWithMindmapSync(id, updates)
    const state = get()
    const task = await db.tasks.get(id)
    if (task) {
      await state.loadProjectTasks(task.project_id)
      await state.loadAllTasks()
    }
  },

  deleteTask: async (id) => {
    const task = await db.tasks.get(id)
    await db.tasks.delete(id)
    const state = get()
    if (task) {
      await state.loadProjectTasks(task.project_id)
      await state.loadAllTasks()
    }
  },

  toggleTaskStatus: async (id) => {
    const task = await db.tasks.get(id)
    if (!task) return
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    const completedAt = newStatus === 'done' ? new Date() : undefined
    await updateTaskWithMindmapSync(id, { status: newStatus, completed_at: completedAt })
    const state = get()
    await state.loadProjectTasks(task.project_id)
    await state.loadAllTasks()
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
    const { projectTasks, filters, sortBy, sortOrder } = get()
    const projectOnly = projectTasks.filter((t) => t.project_id === projectId)
    return applyFiltersAndSort(projectOnly, filters, sortBy, sortOrder)
  },
}))
