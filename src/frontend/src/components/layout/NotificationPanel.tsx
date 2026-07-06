import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Clock, CalendarArrowUp, CheckCheck } from 'lucide-react'
import { useNotificationStore, type NotificationType } from '@/stores/notificationStore'
import { useTaskStore } from '@/stores/taskStore'
import { cn } from '@/lib/utils'

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: typeof AlertTriangle; color: string; badgeColor: string }
> = {
  overdue: {
    label: '已逾期',
    icon: AlertTriangle,
    color: 'text-status-error',
    badgeColor: 'bg-status-error/10 text-status-error border-status-error/20',
  },
  due_today: {
    label: '今天到期',
    icon: Clock,
    color: 'text-status-warning',
    badgeColor: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  },
  due_tomorrow: {
    label: '明天到期',
    icon: CalendarArrowUp,
    color: 'text-primary-600',
    badgeColor: 'bg-primary-100 text-primary-700 border-primary-200',
  },
}

const PRIORITY_LABEL: Record<string, string> = {
  urgent: '紧急',
  high: '高优',
  medium: '中优',
  low: '低优',
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'text-status-error',
  high: 'text-status-error',
  medium: 'text-status-warning',
  low: 'text-primary-600',
}

export function NotificationPanel() {
  const navigate = useNavigate()
  const { notifications, isOpen, setOpen, generateFromTasks } = useNotificationStore()
  const { allTasks, loadAllTasks } = useTaskStore()
  const panelRef = useRef<HTMLDivElement>(null)

  // Load tasks and generate notifications on mount
  useEffect(() => {
    loadAllTasks()
  }, [loadAllTasks])

  useEffect(() => {
    generateFromTasks(allTasks)
  }, [allTasks, generateFromTasks])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, setOpen])

  const handleTaskClick = (taskId: string, projectId: string, nodeUid: string) => {
    setOpen(false)
    navigate(`/project/${projectId}?nodeUid=${nodeUid}`)
  }

  const handleMarkAllRead = () => {
    useNotificationStore.getState().markAllRead()
  }

  const grouped = {
    overdue: notifications.filter((n) => n.type === 'overdue'),
    due_today: notifications.filter((n) => n.type === 'due_today'),
    due_tomorrow: notifications.filter((n) => n.type === 'due_tomorrow'),
  }

  const totalCount = notifications.length

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell trigger */}
      <button
        onClick={() => setOpen(!isOpen)}
        className="relative h-8 w-8 flex items-center justify-center rounded-md hover:bg-bg-elevated transition-colors"
        aria-label="通知"
      >
        <Bell className="h-4 w-4 text-text-secondary" />
        {totalCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-status-error ring-2 ring-bg-surface" />
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-10 w-[360px] bg-bg-surface border border-border-default rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <div className="h-11 px-4 flex items-center justify-between border-b border-border-default">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-text-muted" />
              <span className="text-sm font-medium text-text-primary">任务提醒</span>
              {totalCount > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-bg-elevated text-text-muted">
                  {totalCount}
                </span>
              )}
            </div>
            {totalCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-2xs text-text-muted hover:text-primary-600 transition-colors flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                全部已读
              </button>
            )}
          </div>

          {/* Content */}
          {totalCount === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-text-muted/50 mx-auto mb-2" />
              <p className="text-sm text-text-muted">暂无任务提醒</p>
              <p className="text-2xs text-text-muted/70 mt-1">
                截止日期临近或逾期的任务会出现在这里
              </p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {(['overdue', 'due_today', 'due_tomorrow'] as NotificationType[]).map((type) => {
                const items = grouped[type]
                if (items.length === 0) return null
                const config = TYPE_CONFIG[type]
                const Icon = config.icon

                return (
                  <div key={type}>
                    <div className="h-8 px-4 flex items-center gap-1.5 bg-bg-elevated/60">
                      <Icon className={cn('h-3 w-3', config.color)} />
                      <span className={cn('text-[11px] font-medium', config.color)}>
                        {config.label}
                      </span>
                      <span className="text-[11px] text-text-muted ml-1">({items.length})</span>
                    </div>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleTaskClick(item.taskId, item.projectId, item.nodeUid)}
                        className="w-full text-left px-4 py-2.5 hover:bg-bg-elevated transition-colors border-b border-border-default/50 last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn('text-xs font-medium truncate flex-1', config.color)}>
                            {item.title}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded border shrink-0',
                              config.badgeColor
                            )}
                          >
                            {config.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn('text-[10px]', PRIORITY_COLOR[item.priority])}>
                            {PRIORITY_LABEL[item.priority]}
                          </span>
                          {item.dueDate && (
                            <span className="text-[10px] text-text-muted">
                              {new Date(item.dueDate).toLocaleDateString('zh-CN', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
