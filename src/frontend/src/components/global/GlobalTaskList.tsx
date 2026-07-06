import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LocalTask } from '@/lib/db'

interface GlobalTaskListProps {
  tasks: LocalTask[]
}

const STATUS_LABELS: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  cancelled: '已取消',
}

export function GlobalTaskList({ tasks }: GlobalTaskListProps) {
  return (
    <div className="flex flex-col">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="h-12 px-4 grid grid-cols-[24px_1fr_100px_60px_80px_40px] items-center text-sm border-b border-border-default hover:bg-bg-elevated transition-colors duration-fast"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-text-muted" />
          <span className="text-text-primary truncate">{task.title}</span>
          <span className="text-2xs font-mono text-text-secondary">
            {task.due_date ? new Date(task.due_date).toLocaleDateString('zh-CN') : '—'}
          </span>
          <span className="text-xs text-text-secondary">{task.priority}</span>
          <span className="text-2xs rounded-full px-2 py-0.5 bg-bg-elevated text-text-secondary text-center">
            {STATUS_LABELS[task.status] || task.status}
          </span>
          <span className="flex items-center justify-center">
            <span
              className={cn(
                'h-4 w-4 rounded border flex items-center justify-center',
                task.status === 'done' ? 'bg-status-success border-status-success' : 'border-text-muted'
              )}
            >
              {task.status === 'done' && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}
