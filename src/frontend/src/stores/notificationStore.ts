import { create } from 'zustand'
import type { LocalTask } from '@/lib/db'

export type NotificationType = 'overdue' | 'due_today' | 'due_tomorrow'

export interface TaskNotification {
  id: string
  taskId: string
  projectId: string
  nodeUid: string
  title: string
  type: NotificationType
  dueDate?: Date
  priority: string
  read: boolean
  createdAt: Date
}

interface NotificationState {
  notifications: TaskNotification[]
  isOpen: boolean
  unreadCount: number

  generateFromTasks: (tasks: LocalTask[]) => void
  markAllRead: () => void
  markRead: (id: string) => void
  setOpen: (v: boolean) => void
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isOpen: false,
  unreadCount: 0,

  generateFromTasks: (tasks) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const list: TaskNotification[] = []

    for (const task of tasks) {
      if (!task.due_date || task.status === 'done' || task.status === 'cancelled') continue

      const due = new Date(task.due_date)
      due.setHours(0, 0, 0, 0)

      let type: NotificationType | null = null

      if (due < today) {
        type = 'overdue'
      } else if (isSameDay(due, today)) {
        type = 'due_today'
      } else if (isSameDay(due, tomorrow)) {
        type = 'due_tomorrow'
      }

      if (type) {
        list.push({
          id: `${task.id}-${type}`,
          taskId: task.id,
          projectId: task.project_id,
          nodeUid: task.node_uid,
          title: task.title,
          type,
          dueDate: task.due_date,
          priority: task.priority,
          read: false,
          createdAt: new Date(),
        })
      }
    }

    // Sort: overdue first, then due_today, then due_tomorrow
    const typeOrder = { overdue: 0, due_today: 1, due_tomorrow: 2 }
    list.sort((a, b) => {
      const ta = typeOrder[a.type]
      const tb = typeOrder[b.type]
      if (ta !== tb) return ta - tb
      return (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0)
    })

    const unreadCount = list.filter((n) => !n.read).length
    set({ notifications: list, unreadCount })
  },

  markAllRead: () => {
    set({
      notifications: get().notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })
  },

  markRead: (id) => {
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    )
    const unreadCount = updated.filter((n) => !n.read).length
    set({ notifications: updated, unreadCount })
  },

  setOpen: (v) => {
    if (v) {
      // Opening the panel: mark all as read
      const allRead = get().notifications.map((n) => ({ ...n, read: true }))
      set({ isOpen: true, notifications: allRead, unreadCount: 0 })
    } else {
      set({ isOpen: false })
    }
  },
}))
