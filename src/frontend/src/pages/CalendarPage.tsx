import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { useTaskStore } from '@/stores/taskStore'
import { useProjectStore } from '@/stores/projectStore'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const PROJECT_COLORS: Record<string, string> = {
  indigo: 'bg-project-indigo',
  teal: 'bg-project-teal',
  amber: 'bg-project-amber',
  rose: 'bg-project-rose',
  emerald: 'bg-project-emerald',
  violet: 'bg-project-violet',
}

const PROJECT_COLOR_SOFT: Record<string, string> = {
  indigo: 'bg-project-indigo/15 text-project-indigo',
  teal: 'bg-project-teal/15 text-project-teal',
  amber: 'bg-project-amber/15 text-project-amber',
  rose: 'bg-project-rose/15 text-project-rose',
  emerald: 'bg-project-emerald/15 text-project-emerald',
  violet: 'bg-project-violet/15 text-project-violet',
}

interface CalendarDay {
  date: number
  isCurrentMonth: boolean
  dateObj: Date
}

function getCalendarDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1)
  let startDayOfWeek = firstDay.getDay() // 0=Sunday
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1 // 0=Monday

  const days: CalendarDay[] = []

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: prevMonthLastDay - i,
      isCurrentMonth: false,
      dateObj: new Date(year, month - 1, prevMonthLastDay - i),
    })
  }

  // Current month
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
  for (let i = 1; i <= lastDayOfMonth; i++) {
    days.push({ date: i, isCurrentMonth: true, dateObj: new Date(year, month, i) })
  }

  // Next month padding to fill 42 cells (6 rows x 7 cols)
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: i, isCurrentMonth: false, dateObj: new Date(year, month + 1, i) })
  }

  return days
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function CalendarPage() {
  const navigate = useNavigate()
  const { allTasks, loadAllTasks } = useTaskStore()
  const { projects } = useProjectStore()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    loadAllTasks()
  }, [loadAllTasks])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const days = useMemo(() => getCalendarDays(year, month), [year, month])

  const today = new Date()

  const tasksByDay = useMemo(() => {
    const map = new Map<string, typeof allTasks>()
    for (const task of allTasks) {
      if (!task.due_date) continue
      const d = new Date(task.due_date)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    }
    return map
  }, [allTasks])

  const monthLabel = `${year}年${month + 1}月`

  const goPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const goNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => {
    const now = new Date()
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(now)
  }

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return []
    const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`
    return tasksByDay.get(key) || []
  }, [selectedDate, tasksByDay])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border-default bg-bg-surface">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-4 w-4 text-text-muted" />
          <span className="text-sm font-medium text-text-secondary">日历</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrevMonth}
            className="h-7 w-7 flex items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-text-primary w-24 text-center">{monthLabel}</span>
          <button
            onClick={goNextMonth}
            className="h-7 w-7 flex items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={goToday}
            className="h-7 px-2.5 rounded-md text-xs font-medium text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors ml-1 border border-border-default"
          >
            今天
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border-default bg-bg-surface/50">
        {WEEKDAYS.map((w) => (
          <div key={w} className="h-8 flex items-center justify-center text-xs font-medium text-text-muted">
            {w}
          </div>
        ))}
      </div>

      {/* Calendar grid + optional detail panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7 auto-rows-fr"
            style={{ minHeight: '100%' }}
          >
            {days.map((day, idx) => {
              const key = `${day.dateObj.getFullYear()}-${day.dateObj.getMonth()}-${day.dateObj.getDate()}`
              const dayTasks = tasksByDay.get(key) || []
              const isToday = isSameDay(day.dateObj, today)
              const isSelected = selectedDate ? isSameDay(day.dateObj, selectedDate) : false

              return (
                <div
                  key={idx}
                  className={cn(
                    'min-h-[100px] border-r border-b border-border-default p-1.5 flex flex-col gap-1 cursor-pointer transition-colors',
                    !day.isCurrentMonth && 'bg-bg-primary/60',
                    isSelected && 'bg-primary-50/60',
                    !isSelected && day.isCurrentMonth && 'hover:bg-bg-elevated/50'
                  )}
                  onClick={() => setSelectedDate(day.dateObj)}
                >
                  <div className="flex justify-end">
                    <span
                      className={cn(
                        'h-6 w-6 flex items-center justify-center rounded-full text-xs font-medium',
                        isToday
                          ? 'bg-primary-600 text-white'
                          : day.isCurrentMonth
                            ? 'text-text-primary'
                            : 'text-text-muted'
                      )}
                    >
                      {day.date}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 mt-0.5">
                    {dayTasks.slice(0, 3).map((task) => {
                      const project = projects.find((p) => p.id === task.project_id)
                      return (
                        <button
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/project/${task.project_id}?nodeUid=${task.node_uid}`)
                          }}
                          className={cn(
                            'text-left px-1.5 py-0.5 rounded text-[11px] leading-tight truncate transition-colors',
                            PROJECT_COLOR_SOFT[project?.color || ''] || 'bg-bg-elevated text-text-secondary',
                            task.status === 'done' && 'opacity-50 line-through'
                          )}
                          title={task.title}
                        >
                          <span className={cn('inline-block h-1.5 w-1.5 rounded-full mr-1', PROJECT_COLORS[project?.color || ''] || 'bg-text-muted')} />
                          {task.title}
                        </button>
                      )
                    })}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-text-muted px-1">
                        +{dayTasks.length - 3} 个任务
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected day detail panel */}
        {selectedDate && (
          <div className="w-72 border-l border-border-default bg-bg-surface flex flex-col shrink-0">
            <div className="h-10 px-4 flex items-center border-b border-border-default">
              <span className="text-sm font-medium text-text-primary">
                {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
                {isSameDay(selectedDate, today) && (
                  <span className="ml-2 text-xs text-primary-600">今天</span>
                )}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {selectedTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <span className="text-xs text-text-muted">当日无任务</span>
                </div>
              )}
              {selectedTasks.map((task) => {
                const project = projects.find((p) => p.id === task.project_id)
                return (
                  <button
                    key={task.id}
                    onClick={() => navigate(`/project/${task.project_id}?nodeUid=${task.node_uid}`)}
                    className={cn(
                      'text-left p-3 rounded-lg border border-border-default bg-bg-primary hover:border-border-hover hover:shadow-sm transition-all',
                      task.status === 'done' && 'opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-2 mb-1.5">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full mt-1 shrink-0',
                          PROJECT_COLORS[project?.color || ''] || 'bg-text-muted'
                        )}
                      />
                      <span className={cn(
                        'text-sm text-text-primary flex-1',
                        task.status === 'done' && 'line-through text-text-muted'
                      )}>
                        {task.title}
                      </span>
                    </div>
                    {project && (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            PROJECT_COLORS[project.color] || 'bg-text-muted'
                          )}
                        />
                        <span className="text-2xs text-text-muted">{project.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={cn(
                        'text-2xs px-1.5 py-0.5 rounded-full font-medium',
                        task.priority === 'high' && 'bg-status-error/10 text-status-error',
                        task.priority === 'medium' && 'bg-status-warning/10 text-status-warning',
                        task.priority === 'low' && 'bg-bg-elevated text-text-muted',
                        task.priority === 'urgent' && 'bg-status-error/10 text-status-error'
                      )}>
                        {task.priority === 'high' ? '高优' : task.priority === 'medium' ? '中优' : task.priority === 'low' ? '低优' : '紧急'}
                      </span>
                      <span className={cn(
                        'text-2xs',
                        task.status === 'done' ? 'text-status-success' : 'text-text-muted'
                      )}>
                        {task.status === 'todo' ? '待办' : task.status === 'in_progress' ? '进行中' : task.status === 'done' ? '已完成' : '已取消'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
