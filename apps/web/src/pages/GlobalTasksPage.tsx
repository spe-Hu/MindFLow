import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown, ChevronRight, ClipboardList } from 'lucide-react'
import { TaskFilterBar } from '@/components/task/TaskFilterBar'
import { useTaskStore } from '@/stores/taskStore'
import { useProjectStore } from '@/stores/projectStore'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-priority-high',
  medium: 'bg-priority-medium',
  low: 'bg-priority-low',
  urgent: 'bg-priority-urgent',
}

const STATUS_LABELS: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  cancelled: '已取消',
}

const PROJECT_COLORS: Record<string, string> = {
  indigo: 'bg-project-indigo',
  teal: 'bg-project-teal',
  amber: 'bg-project-amber',
  rose: 'bg-project-rose',
  emerald: 'bg-project-emerald',
  violet: 'bg-project-violet',
}

export function GlobalTasksPage() {
  const navigate = useNavigate()
  const { loadAllTasks, toggleTaskStatus, getFilteredTasks } = useTaskStore()
  const { projects } = useProjectStore()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
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

  const filteredTasks = getFilteredTasks()

  const filteredProjects = selectedProjectIds.size > 0
    ? projects.filter((p) => selectedProjectIds.has(p.id))
    : projects

  const grouped = filteredProjects.map((p) => ({
    project: p,
    tasks: filteredTasks.filter((t) => t.project_id === p.id),
  })).filter((g) => g.tasks.length > 0)

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 px-4 flex items-center border-b border-border-default bg-bg-surface">
        <span className="text-sm font-medium text-text-secondary">全局任务</span>
      </div>
      <TaskFilterBar />
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
        {projects.filter((p) => filteredTasks.some((t) => t.project_id === p.id)).map((p) => {
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
      <div className="flex-1 overflow-y-auto bg-bg-primary">
        {grouped.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title="暂无跨项目任务"
            description="在思维导图中将节点转为任务，即可在这里跨项目追踪"
            action={{
              label: '新建项目',
              onClick: () => {},
            }}
            tone="blue"
          />
        )}
        {grouped.map(({ project, tasks }) => {
          const isCollapsed = collapsed.has(project.id)
          return (
            <div key={project.id}>
              <button
                onClick={() => toggleGroup(project.id)}
                className="w-full h-10 px-4 flex items-center gap-2 hover:bg-bg-elevated transition-colors duration-fast"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-muted" />
                )}
                <span className={cn('h-2.5 w-2.5 rounded-full', PROJECT_COLORS[project.color] || 'bg-text-muted')} />
                <span className="text-sm font-medium text-text-primary">{project.name}</span>
                <span className="text-2xs text-text-muted ml-auto">{tasks.length} 个任务</span>
              </button>
              {!isCollapsed && (
                <div>
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="h-12 px-4 grid grid-cols-[24px_1fr_100px_60px_80px_40px] items-center border-b border-border-default hover:bg-bg-elevated transition-colors duration-fast"
                    >
                      <span className={cn('h-2.5 w-2.5 rounded-full', PROJECT_COLORS[project.color] || 'bg-text-muted')} />
                      <span
                        className="text-sm text-text-primary truncate cursor-pointer"
                        onClick={() => navigate(`/project/${task.project_id}?nodeUid=${task.node_uid}`)}
                      >
                        {task.title}
                      </span>
                      <span className="text-2xs font-mono text-text-secondary">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString('zh-CN') : '—'}
                      </span>
                      <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[task.priority] || 'bg-text-muted')} />
                      <span className="text-2xs rounded-full px-2 py-0.5 bg-bg-elevated text-text-secondary text-center">
                        {STATUS_LABELS[task.status] || task.status}
                      </span>
                      <button
                        className="flex items-center justify-center"
                        onClick={() => toggleTaskStatus(task.id)}
                      >
                        <span
                          className={cn(
                            'h-4 w-4 rounded border flex items-center justify-center',
                            task.status === 'done' ? 'bg-status-success border-status-success' : 'border-text-muted'
                          )}
                        >
                          {task.status === 'done' && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
