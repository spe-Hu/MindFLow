import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LocalTask } from '@/lib/db'

interface TaskListProps {
  tasks: LocalTask[]
  onToggleTask?: (id: string) => void
}

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-priority-high',
  medium: 'bg-priority-medium',
  low: 'bg-priority-low',
  urgent: 'bg-priority-urgent',
}

export function TaskList({ tasks, onToggleTask }: TaskListProps) {
  return (
    <div className="flex flex-col">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="h-12 px-4 grid grid-cols-[40px_1fr_80px_120px_100px_40px] items-center text-sm border-b border-border-default hover:bg-bg-elevated transition-colors duration-fast group"
        >
          <button
            className="flex items-center justify-center"
            onClick={() => onToggleTask?.(task.id)}
          >
            <span
              className={cn(
                'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                task.status === 'done' ? 'bg-status-success border-status-success' : 'border-text-muted'
              )}
            >
              {task.status === 'done' && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
            </span>
          </button>
          <span className={cn('text-text-primary truncate', task.status === 'done' && 'line-through text-text-muted')}>
            {task.title}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[task.priority] || 'bg-text-muted')} />
            <span className="text-xs text-text-secondary">{task.priority}</span>
          </div>
          <span className="text-xs text-text-muted">—</span>
          <span className="text-xs font-mono text-text-secondary">
            {task.due_date ? new Date(task.due_date).toLocaleDateString('zh-CN') : '—'}
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ))}
    </div>
  )
}
