import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, GanttChart as GanttIcon, Calendar } from 'lucide-react'
import { useTaskStore } from '@/stores/taskStore'
import { useProjectStore } from '@/stores/projectStore'
import { cn } from '@/lib/utils'
import type { LocalTask } from '@/lib/db'

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const DAY_WIDTH = 56 // pixels per day
const VIEW_DAY_COUNT = 21 // show 3 weeks by default

const PROJECT_COLORS: Record<string, string> = {
  indigo: 'bg-project-indigo',
  teal: 'bg-project-teal',
  amber: 'bg-project-amber',
  rose: 'bg-project-rose',
  emerald: 'bg-project-emerald',
  violet: 'bg-project-violet',
}

const PROJECT_COLOR_SOFT: Record<string, string> = {
  indigo: 'bg-project-indigo/20',
  teal: 'bg-project-teal/20',
  amber: 'bg-project-amber/20',
  rose: 'bg-project-rose/20',
  emerald: 'bg-project-emerald/20',
  violet: 'bg-project-violet/20',
}

const PROJECT_BORDER_COLORS: Record<string, string> = {
  indigo: 'border-project-indigo',
  teal: 'border-project-teal',
  amber: 'border-project-amber',
  rose: 'border-project-rose',
  emerald: 'border-project-emerald',
  violet: 'border-project-violet',
}

const DEFAULT_DURATIONS: Record<LocalTask["priority"], number> = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 5,
}

const PRIORITY_LABEL: Record<LocalTask["priority"], string> = {
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

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return d
}

function getDaysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((b.getTime() - a.getTime()) / msPerDay)
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatWeekday(date: Date): string {
  const names = ['日', '一', '二', '三', '四', '五', '六']
  return names[date.getDay()]
}

function getTaskDuration(task: LocalTask): number {
  if (task.duration_days && task.duration_days > 0) return task.duration_days
  return DEFAULT_DURATIONS[task.priority]
}

function getTaskDateRange(task: LocalTask): { start: Date; end: Date } | null {
  if (task.start_date && task.due_date) {
    return { start: new Date(task.start_date), end: new Date(task.due_date) }
  }
  if (task.due_date) {
    const end = new Date(task.due_date)
    const start = addDays(end, -getTaskDuration(task) + 1)
    return { start, end }
  }
  if (task.start_date) {
    const start = new Date(task.start_date)
    const end = addDays(start, getTaskDuration(task) - 1)
    return { start, end }
  }
  return null
}

// ------------------------------------------------------------------
// Tooltip
// ------------------------------------------------------------------

interface TooltipData {
  task: LocalTask
  projectName: string
  projectColor: string
  x: number
  y: number
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

export function GanttPage() {
  const navigate = useNavigate()
  const { allTasks, loadAllTasks } = useTaskStore()
  const { projects } = useProjectStore()

  // Timeline view window
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [viewStart, setViewStart] = useState(() => addDays(today, -7))
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set())
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())

  const timelineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAllTasks()
  }, [loadAllTasks])

  const viewEnd = useMemo(() => addDays(viewStart, VIEW_DAY_COUNT - 1), [viewStart])

  const timelineDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < VIEW_DAY_COUNT; i++) {
      days.push(addDays(viewStart, i))
    }
    return days
  }, [viewStart])

  const totalWidth = VIEW_DAY_COUNT * DAY_WIDTH

  // Tasks with date range
  const tasksWithRange = useMemo(() => {
    return allTasks
      .map((task) => ({ task, range: getTaskDateRange(task) }))
      .filter(({ range }) => range !== null) as {
      task: LocalTask
      range: { start: Date; end: Date }
    }[]
  }, [allTasks])

  // Tasks without date
  const tasksWithoutDate = useMemo(() => {
    return allTasks.filter((task) => getTaskDateRange(task) === null)
  }, [allTasks])

  // Filtered tasks
  const filteredTasksWithRange = useMemo(() => {
    if (selectedProjectIds.size === 0) return tasksWithRange
    return tasksWithRange.filter(({ task }) => selectedProjectIds.has(task.project_id))
  }, [tasksWithRange, selectedProjectIds])

  const filteredTasksWithoutDate = useMemo(() => {
    if (selectedProjectIds.size === 0) return tasksWithoutDate
    return tasksWithoutDate.filter((task) => selectedProjectIds.has(task.project_id))
  }, [tasksWithoutDate, selectedProjectIds])

  // Group by project
  const groupedTasks = useMemo(() => {
    const map = new Map<string, { projectName: string; projectColor: string; tasks: typeof filteredTasksWithRange }>()
    for (const item of filteredTasksWithRange) {
      const project = projects.find((p) => p.id === item.task.project_id)
      if (!project) continue
      if (!map.has(project.id)) {
        map.set(project.id, {
          projectName: project.name,
          projectColor: project.color,
          tasks: [],
        })
      }
      map.get(project.id)!.tasks.push(item)
    }
    // Sort groups by project name
    return Array.from(map.entries()).sort((a, b) => a[1].projectName.localeCompare(b[1].projectName))
  }, [filteredTasksWithRange, projects])

  // Navigation
  const goPrev = () => setViewStart((prev) => addDays(prev, -7))
  const goNext = () => setViewStart((prev) => addDays(prev, 7))
  const goToday = () => setViewStart(addDays(today, -7))

  // Bar geometry
  function getBarGeometry(
    taskStart: Date,
    taskEnd: Date
  ): { left: number; width: number; clipped: boolean } | null {
    const viewStartMs = viewStart.getTime()
    const viewEndMs = viewEnd.getTime()
    const startMs = taskStart.getTime()
    const endMs = taskEnd.getTime()

    // Fully outside view
    if (endMs < viewStartMs || startMs > viewEndMs) return null

    const visibleStart = new Date(Math.max(startMs, viewStartMs))
    const visibleEnd = new Date(Math.min(endMs, viewEndMs))

    const startOffset = getDaysBetween(viewStart, visibleStart)
    const endOffset = getDaysBetween(viewStart, visibleEnd)

    return {
      left: startOffset * DAY_WIDTH,
      width: Math.max(DAY_WIDTH * 0.5, (endOffset - startOffset + 1) * DAY_WIDTH),
      clipped: startMs < viewStartMs || endMs > viewEndMs,
    }
  }

  // Toggle project filter
  const toggleProjectFilter = (projectId: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  // Toggle project collapse
  const toggleCollapse = (projectId: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  // Clear filters
  const clearFilters = () => setSelectedProjectIds(new Set())

  // Count tasks in view
  const totalVisibleTasks = filteredTasksWithRange.length + filteredTasksWithoutDate.length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border-default bg-bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <GanttIcon className="h-4 w-4 text-text-muted" />
          <span className="text-sm font-medium text-text-secondary">甘特图</span>
          <span className="text-xs text-text-muted">
            {formatDate(viewStart)} - {formatDate(viewEnd)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="h-7 w-7 flex items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToday}
            className="h-7 px-2.5 rounded-md text-xs font-medium text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors border border-border-default"
          >
            今天
          </button>
          <button
            onClick={goNext}
            className="h-7 w-7 flex items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Project Filters */}
      <div className="px-4 py-2 border-b border-border-default bg-bg-surface/50 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-muted mr-1">项目筛选:</span>
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => toggleProjectFilter(project.id)}
              className={cn(
                'flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium transition-all border',
                selectedProjectIds.size === 0 || selectedProjectIds.has(project.id)
                  ? 'border-border-default bg-bg-elevated text-text-secondary hover:bg-bg-surface'
                  : 'border-transparent opacity-40'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', PROJECT_COLORS[project.color] || 'bg-text-muted')} />
              {project.name}
            </button>
          ))}
          {selectedProjectIds.size > 0 && (
            <button
              onClick={clearFilters}
              className="h-6 px-2.5 rounded-full text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Task List */}
        <div className="w-56 shrink-0 border-r border-border-default bg-bg-surface flex flex-col">
          {/* Column header */}
          <div className="h-14 border-b border-border-default bg-bg-surface/80 shrink-0 flex items-end px-3 pb-2">
            <span className="text-xs font-medium text-text-muted">
              任务 ({totalVisibleTasks})
            </span>
          </div>

          {/* Task list scroll area */}
          <div className="flex-1 overflow-y-auto">
            {/* Dated tasks grouped by project */}
            {groupedTasks.map(([projectId, group]) => {
              const isCollapsed = collapsedProjects.has(projectId)
              return (
                <div key={projectId}>
                  {/* Project header */}
                  <button
                    onClick={() => toggleCollapse(projectId)}
                    className="w-full flex items-center gap-2 px-3 h-8 hover:bg-bg-elevated transition-colors"
                  >
                    <span
                      className={cn(
                        'text-xs transition-transform',
                        isCollapsed ? '' : 'rotate-90'
                      )}
                    >
                      ▶
                    </span>
                    <span className={cn('h-2 w-2 rounded-full', PROJECT_COLORS[group.projectColor] || 'bg-text-muted')} />
                    <span className="text-xs font-medium text-text-secondary truncate">{group.projectName}</span>
                    <span className="text-[10px] text-text-muted ml-auto">{group.tasks.length}</span>
                  </button>

                  {/* Tasks */}
                  {!isCollapsed &&
                    group.tasks.map(({ task }) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 px-3 h-8 border-b border-border-default/50 hover:bg-bg-elevated/50 transition-colors"
                      >
                        <div className="w-4 shrink-0" /> {/* indent */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-text-primary truncate" title={task.title}>
                            {task.title}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )
            })}

            {/* Undated tasks */}
            {filteredTasksWithoutDate.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-3 h-8 bg-bg-primary/50">
                  <span className="text-xs font-medium text-text-muted">无截止日期</span>
                  <span className="text-[10px] text-text-muted">{filteredTasksWithoutDate.length}</span>
                </div>
                {filteredTasksWithoutDate.map((task) => {
                  const project = projects.find((p) => p.id === task.project_id)
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 px-3 h-8 border-b border-border-default/50 hover:bg-bg-elevated/50 transition-colors"
                    >
                      <div className="w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-text-primary truncate" title={task.title}>
                          {task.title}
                        </div>
                      </div>
                      {project && (
                        <span
                          className={cn('h-1.5 w-1.5 rounded-full shrink-0', PROJECT_COLORS[project.color] || 'bg-text-muted')}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {totalVisibleTasks === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Calendar className="h-8 w-8 text-text-muted mb-2" />
                <span className="text-xs text-text-muted">暂无带截止日期的任务</span>
                <span className="text-[10px] text-text-muted mt-1">在思维导图中为任务设置截止日期</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Timeline */}
        <div ref={timelineRef} className="flex-1 overflow-auto bg-bg-primary relative">
          <div style={{ width: totalWidth, minHeight: '100%' }} className="relative">
            {/* Date header */}
            <div className="h-14 border-b border-border-default bg-bg-surface/80 sticky top-0 z-10 flex">
              {timelineDays.map((day) => {
                const isToday = isSameDay(day, today)
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                return (
                  <div
                    key={day.getTime()}
                    className={cn(
                      'flex flex-col items-center justify-center border-r border-border-default/60 shrink-0',
                      isToday && 'bg-primary-50/40',
                      isWeekend && 'bg-bg-primary/40'
                    )}
                    style={{ width: DAY_WIDTH }}
                  >
                    <span className={cn('text-[10px] font-medium', isToday ? 'text-primary-600' : 'text-text-muted')}>
                      {formatWeekday(day)}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-semibold mt-0.5',
                        isToday ? 'text-primary-600' : 'text-text-secondary'
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Grid lines (vertical) */}
            <div className="absolute inset-0 flex pointer-events-none">
              {timelineDays.map((day) => (
                <div
                  key={day.getTime()}
                  className={cn(
                    'h-full border-r shrink-0',
                    isSameDay(day, today) ? 'border-primary-200' : 'border-border-default/30'
                  )}
                  style={{ width: DAY_WIDTH }}
                />
              ))}
            </div>

            {/* Today marker */}
            {(() => {
              const todayOffset = getDaysBetween(viewStart, today)
              if (todayOffset < 0 || todayOffset >= VIEW_DAY_COUNT) return null
              return (
                <div
                  className="absolute top-14 bottom-0 border-l-2 border-primary-400/60 pointer-events-none z-5"
                  style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                />
              )
            })()}

            {/* Task bars */}
            <div className="relative">
              {groupedTasks.map(([projectId, group]) => {
                const isCollapsed = collapsedProjects.has(projectId)
                return (
                  <div key={projectId}>
                    {/* Project spacer row (header) */}
                    <div className="h-8 border-b border-border-default/50" />

                    {/* Task rows */}
                    {!isCollapsed &&
                      group.tasks.map(({ task, range }) => {
                        const geom = getBarGeometry(range.start, range.end)
                        if (!geom) {
                          return <div key={task.id} className="h-8 border-b border-border-default/50" />
                        }

                        return (
                          <div
                            key={task.id}
                            className="h-8 border-b border-border-default/50 relative"
                          >
                            <div
                              className={cn(
                                'absolute top-1.5 h-5 rounded-md cursor-pointer transition-all hover:brightness-95 hover:shadow-sm border',
                                PROJECT_COLOR_SOFT[group.projectColor] || 'bg-bg-elevated',
                                PROJECT_BORDER_COLORS[group.projectColor] || 'border-border-default',
                                task.status === 'done' && 'opacity-40 grayscale-[0.3]'
                              )}
                              style={{
                                left: geom.left + 2,
                                width: Math.max(geom.width - 4, 8),
                              }}
                              onClick={() => navigate(`/project/${task.project_id}?nodeUid=${task.node_uid}`)}
                              onMouseEnter={(e) =>
                                setTooltip({
                                  task,
                                  projectName: group.projectName,
                                  projectColor: group.projectColor,
                                  x: e.clientX,
                                  y: e.clientY,
                                })
                              }
                              onMouseLeave={() => setTooltip(null)}
                              onMouseMove={(e) =>
                                setTooltip((prev) =>
                                  prev && prev.task.id === task.id
                                    ? { ...prev, x: e.clientX, y: e.clientY }
                                    : prev
                                )
                              }
                            >
                              <span className="text-[10px] text-text-secondary truncate px-1.5 leading-5 block">
                                {task.title}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )
              })}

              {/* Undated tasks spacer */}
              {filteredTasksWithoutDate.length > 0 && (
                <>
                  <div className="h-8 border-b border-border-default/50 bg-bg-primary/30" />
                  {filteredTasksWithoutDate.map((task) => (
                    <div key={task.id} className="h-8 border-b border-border-default/50" />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-bg-surface border border-border-default rounded-lg shadow-lg px-3 py-2 pointer-events-none"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 8,
            maxWidth: 280,
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className={cn('h-2 w-2 rounded-full', PROJECT_COLORS[tooltip.projectColor] || 'bg-text-muted')} />
            <span className="text-[10px] text-text-muted">{tooltip.projectName}</span>
          </div>
          <div className="text-xs font-medium text-text-primary mb-1">{tooltip.task.title}</div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                tooltip.task.priority === 'high' && 'bg-status-error/10 text-status-error',
                tooltip.task.priority === 'medium' && 'bg-status-warning/10 text-status-warning',
                tooltip.task.priority === 'low' && 'bg-bg-elevated text-text-muted',
                tooltip.task.priority === 'urgent' && 'bg-status-error/10 text-status-error'
              )}
            >
              {PRIORITY_LABEL[tooltip.task.priority]}
            </span>
            <span className="text-[10px] text-text-muted">
              {tooltip.task.due_date ? `截止: ${formatDate(new Date(tooltip.task.due_date))}` : '无截止日期'}
            </span>
            <span className="text-[10px] text-text-muted">{STATUS_LABEL[tooltip.task.status]}</span>
          </div>
        </div>
      )}
    </div>
  )
}
