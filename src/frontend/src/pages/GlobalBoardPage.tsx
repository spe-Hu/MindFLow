import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '@/stores/taskStore'
import { useProjectStore } from '@/stores/projectStore'
import { cn } from '@/lib/utils'

const COLUMNS: { status: string; title: string }[] = [
  { status: 'todo', title: '待办' },
  { status: 'in_progress', title: '进行中' },
  { status: 'done', title: '已完成' },
]

const PROJECT_COLORS: Record<string, string> = {
  indigo: 'bg-project-indigo',
  teal: 'bg-project-teal',
  amber: 'bg-project-amber',
  rose: 'bg-project-rose',
  emerald: 'bg-project-emerald',
  violet: 'bg-project-violet',
}

export function GlobalBoardPage() {
  const navigate = useNavigate()
  const { allTasks, loadAllTasks, updateTask } = useTaskStore()
  const { projects } = useProjectStore()
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAllTasks()
  }, [loadAllTasks])

  const toggleProjectFilter = (projectId: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  const filteredTasks = selectedProjectIds.size > 0
    ? allTasks.filter((t) => selectedProjectIds.has(t.project_id))
    : allTasks

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 px-4 flex items-center border-b border-border-default bg-bg-surface">
        <span className="text-sm font-medium text-text-secondary">全局看板</span>
      </div>
      <div className="h-9 px-4 flex items-center gap-2 bg-bg-surface/50 border-b border-border-default overflow-x-auto">
        <button
          onClick={() => setSelectedProjectIds(new Set())}
          className={cn(
            'shrink-0 h-6 px-2.5 rounded-full text-2xs font-medium transition-colors',
            selectedProjectIds.size === 0
              ? 'bg-primary-600 text-white'
              : 'bg-bg-elevated text-text-secondary hover:bg-bg-surface'
          )}
        >
          全部
        </button>
        {projects.map((p) => {
          const selected = selectedProjectIds.has(p.id)
          return (
            <button
              key={p.id}
              onClick={() => toggleProjectFilter(p.id)}
              className={cn(
                'shrink-0 h-6 px-2.5 rounded-full text-2xs font-medium transition-colors flex items-center gap-1.5',
                selected
                  ? 'bg-primary-600 text-white'
                  : 'bg-bg-elevated text-text-secondary hover:bg-bg-surface'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', PROJECT_COLORS[p.color] || 'bg-text-muted')} />
              {p.name}
            </button>
          )
        })}
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-bg-primary px-6 py-4 flex gap-6">
        {COLUMNS.map((col) => {
          const tasks = filteredTasks.filter((t) => t.status === col.status)
          return (
            <div key={col.status} className="w-[280px] flex-shrink-0 flex flex-col h-full">
              <div className="h-10 flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{col.title}</span>
                  <span className="h-5 px-2 rounded-full text-2xs bg-bg-elevated text-text-secondary flex items-center">
                    {tasks.length}
                  </span>
                </div>
              </div>
              <div
                className="flex-1 overflow-y-auto flex flex-col gap-3"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const taskId = e.dataTransfer.getData('text/plain')
                  if (taskId) updateTask(taskId, { status: col.status as 'todo' | 'in_progress' | 'done' | 'cancelled' })
                }}
              >
                {tasks.map((task) => {
                  const project = projects.find((p) => p.id === task.project_id)
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', task.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      className={cn(
                        'bg-bg-surface border border-border-default rounded-md overflow-hidden',
                        'hover:shadow-sm hover:border-border-hover transition-all duration-fast cursor-pointer',
                        'active:opacity-60',
                        task.status === 'done' && 'opacity-65'
                      )}
                      onClick={() => navigate(`/project/${task.project_id}?nodeUid=${task.node_uid}`)}
                    >
                      <div className={cn('h-[3px] w-full', PROJECT_COLORS[project?.color || ''] || 'bg-text-muted')} />
                      <div className="p-3">
                        <p className="text-sm text-text-primary mb-2">{task.title}</p>
                        {project && (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-bg-elevated">
                            <span className={cn('h-1.5 w-1.5 rounded-full', PROJECT_COLORS[project.color] || 'bg-text-muted')} />
                            <span className="text-2xs text-text-secondary">{project.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {tasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <span className="text-xs text-text-muted">还没有任务</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
