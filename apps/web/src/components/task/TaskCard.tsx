import { cn } from '@/lib/utils'
import type { LocalTask } from '@/lib/db'
import { usePomodoroStore } from '@/stores/pomodoroStore'
import { Timer, AlertTriangle } from 'lucide-react'

interface TaskCardProps {
  task: LocalTask
  projectColor?: string
  onClick?: () => void
}

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-priority-high',
  medium: 'bg-priority-medium',
  low: 'bg-priority-low',
  urgent: 'bg-priority-urgent',
}

function getTaskDueInfo(task: LocalTask) {
  if (!task.due_date || task.status === 'done' || task.status === 'cancelled') return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(task.due_date)
  due.setHours(0, 0, 0, 0)

  if (due < today) return { type: 'overdue' as const, label: '已逾期' }
  if (due.getTime() === today.getTime()) return { type: 'due_today' as const, label: '今天' }
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (due.getTime() === tomorrow.getTime()) return { type: 'due_tomorrow' as const, label: '明天' }
  return null
}

export function TaskCard({ task, projectColor, onClick }: TaskCardProps) {
  const pomodoro = usePomodoroStore()
  const dueInfo = getTaskDueInfo(task)

  const handlePomodoroClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (pomodoro.activeTaskId === task.id && pomodoro.isRunning) {
      pomodoro.pause()
    } else {
      pomodoro.start(task.id, task.title)
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-bg-surface border border-border-default rounded-lg p-3',
        'hover:shadow-sm hover:border-border-hover transition-all duration-fast cursor-pointer',
        task.status === 'done' && 'opacity-60',
        dueInfo?.type === 'overdue' && 'border-l-[3px] border-l-status-error'
      )}
    >
      {projectColor && (
        <div className={cn('h-[3px] w-full rounded-t-sm mb-2', projectColor)} />
      )}
      <div className="flex items-start gap-2">
        {!projectColor && (
          <span className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', PRIORITY_DOT[task.priority] || 'bg-text-muted')} />
        )}
        <span className={cn('text-sm text-text-primary flex-1', task.status === 'done' && 'line-through text-text-muted')}>
          {task.title}
        </span>
        {/* Pomodoro button */}
        <button
          onClick={handlePomodoroClick}
          className={cn(
            'shrink-0 flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded transition-colors',
            pomodoro.activeTaskId === task.id && pomodoro.isRunning
              ? 'bg-priority-high/10 text-priority-high animate-pulse'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
          )}
          title={pomodoro.activeTaskId === task.id && pomodoro.isRunning ? '暂停番茄钟' : '开始番茄钟'}
        >
          <Timer className="w-3 h-3" />
          {task.pomodoro_count ? (
            <span>{task.pomodoro_count}</span>
          ) : null}
        </button>
      </div>
      {dueInfo ? (
        <div className="flex items-center gap-1.5 mt-2">
          {dueInfo.type === 'overdue' && (
            <AlertTriangle className="h-3 w-3 text-status-error shrink-0" />
          )}
          <span
            className={cn(
              'text-2xs font-medium',
              dueInfo.type === 'overdue' && 'text-status-error',
              dueInfo.type === 'due_today' && 'text-status-warning',
              dueInfo.type === 'due_tomorrow' && 'text-primary-600'
            )}
          >
            {dueInfo.label}
          </span>
          <span className="text-2xs text-text-muted">
            {new Date(task.due_date).toLocaleDateString('zh-CN')}
          </span>
        </div>
      ) : task.due_date ? (
        <p className="text-2xs font-mono text-text-muted mt-2">
          {new Date(task.due_date).toLocaleDateString('zh-CN')}
        </p>
      ) : null}
    </div>
  )
}
