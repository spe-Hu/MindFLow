import type { LocalTask } from '@/lib/db'

interface TaskBoardProps {
  tasks: LocalTask[]
}

export function TaskBoard({ tasks }: TaskBoardProps) {
  return (
    <div className="flex gap-6 overflow-x-auto h-full">
      {['todo', 'in_progress', 'done'].map((status) => {
        const colTasks = tasks.filter((t) => t.status === status)
        return (
          <div key={status} className="w-[280px] flex-shrink-0">
            <div className="h-10 flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-primary">
                {status === 'todo' ? '待办' : status === 'in_progress' ? '进行中' : '已完成'}
              </span>
              <span className="text-xs text-text-muted">{colTasks.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {colTasks.map((task) => (
                <div key={task.id} className="bg-bg-surface border border-border-default rounded-md p-3">
                  <span className="text-sm text-text-primary">{task.title}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
