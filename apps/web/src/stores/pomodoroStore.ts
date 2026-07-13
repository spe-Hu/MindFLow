import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const FOCUS_SECONDS = 25 * 60
const SHORT_BREAK_SECONDS = 5 * 60
const LONG_BREAK_SECONDS = 15 * 60

export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak'

interface PomodoroState {
  activeTaskId: string | null
  taskTitle: string | null
  timeLeft: number
  isRunning: boolean
  mode: PomodoroMode
  sessionsCompleted: number
  isOpen: boolean
  justCompleted: boolean

  // Actions
  start: (taskId: string, title: string) => void
  pause: () => void
  resume: () => void
  reset: () => void
  skip: () => void
  tick: () => void
  setOpen: (v: boolean) => void
  switchMode: (mode: PomodoroMode) => void
  clearCompleted: () => void
  dismiss: () => void
}

function getDuration(mode: PomodoroMode): number {
  switch (mode) {
    case 'focus':
      return FOCUS_SECONDS
    case 'shortBreak':
      return SHORT_BREAK_SECONDS
    case 'longBreak':
      return LONG_BREAK_SECONDS
  }
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      activeTaskId: null,
      taskTitle: null,
      timeLeft: FOCUS_SECONDS,
      isRunning: false,
      mode: 'focus',
      sessionsCompleted: 0,
      isOpen: false,
      justCompleted: false,

      start: (taskId, title) =>
        set({
          activeTaskId: taskId,
          taskTitle: title,
          timeLeft: FOCUS_SECONDS,
          isRunning: true,
          mode: 'focus',
          isOpen: true,
          justCompleted: false,
        }),

      pause: () => set({ isRunning: false }),

      resume: () => {
        const { timeLeft } = get()
        if (timeLeft > 0) set({ isRunning: true })
      },

      reset: () =>
        set((s) => ({
          timeLeft: getDuration(s.mode),
          isRunning: false,
          justCompleted: false,
        })),

      skip: () => {
        const { mode, sessionsCompleted } = get()
        if (mode === 'focus') {
          const nextSessions = sessionsCompleted + 1
          const nextMode = nextSessions % 4 === 0 ? 'longBreak' : 'shortBreak'
          set({
            mode: nextMode,
            timeLeft: getDuration(nextMode),
            isRunning: false,
            sessionsCompleted: nextSessions,
            justCompleted: false,
          })
        } else {
          set({
            mode: 'focus',
            timeLeft: FOCUS_SECONDS,
            isRunning: false,
            justCompleted: false,
          })
        }
      },

      tick: () => {
        const state = get()
        if (!state.isRunning || state.timeLeft <= 0) return

        const nextTime = state.timeLeft - 1
        if (nextTime <= 0) {
          // Session complete
          const { mode, sessionsCompleted } = state
          if (mode === 'focus') {
            const nextSessions = sessionsCompleted + 1
            const nextMode = nextSessions % 4 === 0 ? 'longBreak' : 'shortBreak'
            set({
              timeLeft: 0,
              isRunning: false,
              justCompleted: true,
              mode: nextMode,
              sessionsCompleted: nextSessions,
            })
          } else {
            set({
              timeLeft: 0,
              isRunning: false,
              justCompleted: true,
              mode: 'focus',
            })
          }
        } else {
          set({ timeLeft: nextTime })
        }
      },

      setOpen: (v) => set({ isOpen: v }),

      switchMode: (mode) =>
        set({
          mode,
          timeLeft: getDuration(mode),
          isRunning: false,
          justCompleted: false,
        }),

      clearCompleted: () => set({ justCompleted: false }),

      dismiss: () =>
        set({
          isOpen: false,
          isRunning: false,
        }),
    }),
    {
      name: 'mindflow-pomodoro',
      partialize: (state) => ({
        activeTaskId: state.activeTaskId,
        taskTitle: state.taskTitle,
        timeLeft: state.timeLeft,
        isRunning: state.isRunning,
        mode: state.mode,
        sessionsCompleted: state.sessionsCompleted,
        isOpen: state.isOpen,
      }),
    }
  )
)

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
