import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Flame,
  CalendarClock,
  FolderOpen,
  Inbox,
} from 'lucide-react'
import { useTaskStore } from '@/stores/taskStore'
import { useProjectStore } from '@/stores/projectStore'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'

const PROJECT_COLORS: Record<string, string> = {
  indigo: 'bg-project-indigo',
  teal: 'bg-project-teal',
  amber: 'bg-project-amber',
  rose: 'bg-project-rose',
  emerald: 'bg-project-emerald',
  violet: 'bg-project-violet',
}

const PROJECT_COLOR_SOFT: Record<string, string> = {
  indigo: 'bg-project-indigo/10 text-project-indigo',
  teal: 'bg-project-teal/10 text-project-teal',
  amber: 'bg-project-amber/10 text-project-amber',
  rose: 'bg-project-rose/10 text-project-rose',
  emerald: 'bg-project-emerald/10 text-project-emerald',
  violet: 'bg-project-violet/10 text-project-violet',
}

const PRIORITY_LABEL: Record<string, string> = {
  urgent: '紧急',
  high: '高优',
  medium: '中优',
  low: '低优',
}

const STATUS_LABEL: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  cancelled: '已取消',
}

function StatCard({
  icon: Icon,
  label,
  value,
  colorClass,
  onClick,
}: {
  icon: React.ElementType
  label: string
  value: number
  colorClass: string
  onClick?: () => void
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'bg-bg-surface rounded-xl p-4 flex items-center gap-3.5 text-left w-full shadow-sm',
        onClick && 'hover:shadow-md transition-all cursor-pointer'
      )}
    >
      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div>
        <div className="text-xl font-semibold text-text-primary leading-tight">{value}</div>
        <div className="text-2xs text-text-muted mt-0.5">{label}</div>
      </div>
    </Wrapper>
  )
}

function ProjectProgress({
  project,
  tasks,
  onClick,
}: {
  project: { id: string; name: string; color: string }
  tasks: { total: number; done: number; inProgress: number }
  onClick: () => void
}) {
  const pct = tasks.total > 0 ? Math.round((tasks.done / tasks.total) * 100) : 0
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-bg-surface border border-border-default rounded-xl p-4 hover:border-border-hover hover:shadow-sm transition-all group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className={cn('h-2.5 w-2.5 rounded-full', PROJECT_COLORS[project.color] || 'bg-text-muted')} />
          <span className="text-sm font-medium text-text-primary">{project.name}</span>
        </div>
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', PROJECT_COLOR_SOFT[project.color] || 'bg-bg-elevated text-text-muted')}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-bg-elevated rounded-full overflow-hidden mb-2">
        <div
          className={cn('h-full rounded-full transition-all duration-500', PROJECT_COLORS[project.color] || 'bg-text-muted')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-2xs text-text-muted">
        <span>{tasks.total} 个任务</span>
        <span>{tasks.done} 已完成 · {tasks.inProgress} 进行中</span>
      </div>
    </button>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { allTasks, loadAllTasks } = useTaskStore()
  const { projects, loadProjects } = useProjectStore()

  useEffect(() => {
    loadAllTasks()
    loadProjects()
  }, [loadAllTasks, loadProjects])

  const stats = useMemo(() => {
    const total = allTasks.length
    const done = allTasks.filter((t) => t.status === 'done').length
    const todo = allTasks.filter((t) => t.status === 'todo').length
    const inProgress = allTasks.filter((t) => t.status === 'in_progress').length
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdue = allTasks.filter((t) => {
      if (!t.due_date || t.status === 'done' || t.status === 'cancelled') return false
      const d = new Date(t.due_date)
      d.setHours(0, 0, 0, 0)
      return d < today
    }).length
    return { total, done, todo, inProgress, overdue }
  }, [allTasks])

  const projectStats = useMemo(() => {
    return projects.map((p) => {
      const pTasks = allTasks.filter((t) => t.project_id === p.id)
      const total = pTasks.length
      const done = pTasks.filter((t) => t.status === 'done').length
      const inProgress = pTasks.filter((t) => t.status === 'in_progress').length
      return {
        project: p,
        tasks: { total, done, inProgress },
      }
    }).filter((s) => s.tasks.total > 0)
  }, [projects, allTasks])

  const upcomingTasks = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekLater = new Date(today)
    weekLater.setDate(today.getDate() + 7)
    return allTasks
      .filter((t) => {
        if (!t.due_date || t.status === 'done' || t.status === 'cancelled') return false
        const d = new Date(t.due_date)
        d.setHours(0, 0, 0, 0)
        return d >= today && d <= weekLater
      })
      .sort((a, b) => {
        if (!a.due_date || !b.due_date) return 0
        return a.due_date.getTime() - b.due_date.getTime()
      })
      .slice(0, 8)
  }, [allTasks])

  const highPriorityTasks = useMemo(() => {
    return allTasks
      .filter((t) => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'done' && t.status !== 'cancelled')
      .sort((a, b) => {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.getTime() - b.due_date.getTime()
      })
      .slice(0, 6)
  }, [allTasks])

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="h-12 px-4 flex items-center border-b border-border-default bg-bg-surface shrink-0">
        <LayoutDashboard className="h-4 w-4 text-text-muted mr-2" />
        <span className="text-sm font-medium text-text-secondary">工作台</span>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            icon={TrendingUp}
            label="总任务"
            value={stats.total}
            colorClass="bg-primary-100 text-primary-700"
            onClick={() => navigate('/global-tasks')}
          />
          <StatCard
            icon={CheckCircle2}
            label="已完成"
            value={stats.done}
            colorClass="bg-status-success/15 text-status-success"
            onClick={() => navigate('/global-tasks/board')}
          />
          <StatCard
            icon={Circle}
            label="待办"
            value={stats.todo}
            colorClass="bg-primary-50 text-primary-600"
            onClick={() => navigate('/global-tasks')}
          />
          <StatCard
            icon={Clock}
            label="进行中"
            value={stats.inProgress}
            colorClass="bg-status-warning/15 text-status-warning"
            onClick={() => navigate('/global-tasks/board')}
          />
          <StatCard
            icon={AlertCircle}
            label="已逾期"
            value={stats.overdue}
            colorClass={stats.overdue > 0 ? 'bg-status-error/15 text-status-error' : 'bg-bg-elevated text-text-muted'}
            onClick={() => navigate('/global-tasks')}
          />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Project Progress */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-text-primary">项目进度</h2>
              <button
                onClick={() => navigate('/global-tasks')}
                className="text-2xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                查看全部 <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            {projectStats.length === 0 && (
              <EmptyState
                icon={FolderOpen}
                title="暂无项目任务数据"
                description="在思维导图中将节点转为任务后开始追踪进度"
                tone="indigo"
              />
            )}
            {projectStats.map(({ project, tasks }) => (
              <ProjectProgress
                key={project.id}
                project={project}
                tasks={tasks}
                onClick={() => navigate(`/project/${project.id}/board`)}
              />
            ))}
          </div>

          {/* Right column: Upcoming + High Priority */}
          <div className="flex flex-col gap-3">
            {/* Upcoming this week */}
            <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden">
              <div className="h-9 px-4 flex items-center gap-1.5 border-b border-border-default">
                <CalendarClock className="h-3.5 w-3.5 text-text-muted" />
                <span className="text-xs font-medium text-text-primary">本周截止</span>
              </div>
              {upcomingTasks.length === 0 ? (
                <div className="p-4 text-center">
                  <span className="text-2xs text-text-muted">近 7 天无截止任务</span>
                </div>
              ) : (
                <div className="p-2 flex flex-col gap-0.5">
                  {upcomingTasks.map((task) => {
                    const project = projects.find((p) => p.id === task.project_id)
                    const dueInDays = task.due_date
                      ? Math.ceil(
                          (new Date(task.due_date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
                            86400000
                        )
                      : null
                    return (
                      <button
                        key={task.id}
                        onClick={() =>
                          navigate(`/project/${task.project_id}?nodeUid=${task.node_uid}`)
                        }
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg-elevated transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full shrink-0',
                              PROJECT_COLORS[project?.color || ''] || 'bg-text-muted'
                            )}
                          />
                          <span className="text-xs text-text-primary truncate flex-1">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-text-muted">
                            {project?.name || '—'}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-medium',
                              dueInDays === 0
                                ? 'text-status-error'
                                : dueInDays === 1
                                  ? 'text-status-warning'
                                  : 'text-text-muted'
                            )}
                          >
                            {dueInDays === 0
                              ? '今天'
                              : dueInDays === 1
                                ? '明天'
                                : `${dueInDays} 天后`}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* High priority */}
            <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden">
              <div className="h-9 px-4 flex items-center gap-1.5 border-b border-border-default">
                <Flame className="h-3.5 w-3.5 text-status-error" />
                <span className="text-xs font-medium text-text-primary">高优任务</span>
              </div>
              {highPriorityTasks.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="暂无高优先级待办"
                  description="设置任务优先级为「高优」或「紧急」，它们会显示在这里"
                  tone="rose"
                  compact
                />
              ) : (
                <div className="p-2 flex flex-col gap-0.5">
                  {highPriorityTasks.map((task) => {
                    const project = projects.find((p) => p.id === task.project_id)
                    return (
                      <button
                        key={task.id}
                        onClick={() =>
                          navigate(`/project/${task.project_id}?nodeUid=${task.node_uid}`)
                        }
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg-elevated transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full shrink-0',
                              PROJECT_COLORS[project?.color || ''] || 'bg-text-muted'
                            )}
                          />
                          <span className="text-xs text-text-primary truncate flex-1">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-text-muted">{project?.name}</span>
                          <span
                            className={cn(
                              'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                              task.priority === 'urgent'
                                ? 'bg-status-error/10 text-status-error'
                                : 'bg-status-warning/10 text-status-error'
                            )}
                          >
                            {PRIORITY_LABEL[task.priority]}
                          </span>
                          <span className="text-[10px] text-text-muted ml-auto">
                            {STATUS_LABEL[task.status]}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
