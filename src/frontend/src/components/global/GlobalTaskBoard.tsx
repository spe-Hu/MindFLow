import type { LocalTask } from '@/lib/db'

interface GlobalTaskBoardProps {
  tasks: LocalTask[]
}

export function GlobalTaskBoard({ tasks }: GlobalTaskBoardProps) {
  const columns = [
    { status: 'todo', title: '待办' },
    { status: 'in_progress', title: '进行中' },
    { status: 'done', title: '已完成' },
  ]

  return (
    <div className="flex gap-6 overflow-x-auto h-full">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status)
        return (
          <div key={col.status} className="w-[280px] flex-shrink-0">
            <div className="h-10 flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-primary">{col.title}</span>
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
