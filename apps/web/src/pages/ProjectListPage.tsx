import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { ViewHeader } from '@/components/layout/ViewHeader'
import { TaskFilterBar } from '@/components/task/TaskFilterBar'
import { useProjectStore } from '@/stores/projectStore'
import { useTaskStore } from '@/stores/taskStore'
import { cn } from '@/lib/utils'

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-priority-high',
  medium: 'bg-priority-medium',
  low: 'bg-priority-low',
  urgent: 'bg-priority-urgent',
}

export function ProjectListPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setActiveProject } = useProjectStore()
  const { loadProjectTasks, toggleTaskStatus, deleteTask, getFilteredProjectTasks } = useTaskStore()

  useEffect(() => {
    if (id) {
      setActiveProject(id)
      loadProjectTasks(id)
    }
  }, [id, setActiveProject, loadProjectTasks])

  const filteredTasks = id ? getFilteredProjectTasks(id) : []

  if (!id) return null

  return (
    <div className="flex flex-col h-full">
      <ViewHeader projectId={id} />
      <TaskFilterBar />
      <div className="flex-1 overflow-y-auto bg-bg-primary">
        {/* Header Row */}
        <div className="h-9 px-4 grid grid-cols-[40px_1fr_80px_100px_40px] items-center text-xs text-text-muted border-b border-border-default bg-bg-surface">
          <span />
          <span>任务名称</span>
          <span>优先级</span>
          <span>截止日期</span>
          <span />
        </div>

        {filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-sm text-text-muted">暂无任务，在思维导图中将节点转为任务即可开始追踪</span>
          </div>
        )}

        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="h-12 px-4 grid grid-cols-[40px_1fr_80px_100px_40px] items-center text-sm border-b border-border-default group hover:bg-bg-elevated transition-colors duration-fast"
          >
            <button
              className="flex items-center justify-center"
              onClick={() => toggleTaskStatus(task.id)}
              aria-label={task.status === 'done' ? '标记为未完成' : '标记为已完成'}
            >
              <span
                className={cn(
                  'h-4 w-4 rounded border flex items-center justify-center transition-colors duration-fast',
                  task.status === 'done'
                    ? 'bg-status-success border-status-success'
                    : 'border-text-muted'
                )}
              >
                {task.status === 'done' && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </span>
            </button>

            <span
              className={cn(
                'text-text-primary truncate cursor-pointer',
                task.status === 'done' && 'line-through text-text-muted'
              )}
              onClick={() => navigate(`/project/${id}`)}
            >
              {task.title}
            </span>

            <div className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[task.priority] || 'bg-text-muted')} />
              <span className="text-xs text-text-secondary">{task.priority}</span>
            </div>

            <span className="text-xs font-mono text-text-secondary">
              {task.due_date ? new Date(task.due_date).toLocaleDateString('zh-CN') : '—'}
            </span>

            <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-fast gap-1">
              <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-bg-surface text-text-muted">
                <Pencil className="h-3 w-3" />
              </button>
              <button
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-bg-surface text-status-error"
                onClick={() => deleteTask(task.id)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-bg-surface text-text-muted">
                <MoreHorizontal className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 text-xs text-text-muted border-t border-border-default bg-bg-surface">
        {filteredTasks.length} 个任务
      </div>
    </div>
  )
}
