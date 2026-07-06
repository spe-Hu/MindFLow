import { useTaskStore, type TaskStatus, type TaskPriority } from '@/stores/taskStore'
import { cn } from '@/lib/utils'
import { ArrowUpDown, X, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const STATUS_OPTIONS: { value: TaskStatus | null; label: string; color?: string }[] = [
  { value: null, label: '全部状态' },
  { value: 'todo', label: '待办', color: 'bg-status-info' },
  { value: 'in_progress', label: '进行中', color: 'bg-status-warning' },
  { value: 'done', label: '已完成', color: 'bg-status-success' },
]

const PRIORITY_OPTIONS: { value: TaskPriority | null; label: string; color?: string }[] = [
  { value: null, label: '全部优先级' },
  { value: 'urgent', label: '紧急', color: 'bg-priority-urgent' },
  { value: 'high', label: '高优', color: 'bg-priority-high' },
  { value: 'medium', label: '中优', color: 'bg-priority-medium' },
  { value: 'low', label: '低优', color: 'bg-priority-low' },
]

const DUE_DATE_OPTIONS = [
  { value: null as string | null, label: '全部日期' },
  { value: 'today', label: '今天截止' },
  { value: 'week', label: '本周截止' },
  { value: 'overdue', label: '已过期' },
  { value: 'none', label: '无截止日期' },
]

const SORT_OPTIONS = [
  { value: 'dueDate' as const, label: '截止日期' },
  { value: 'priority' as const, label: '优先级' },
  { value: 'createdAt' as const, label: '创建时间' },
]

function getTodayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  return { start, end }
}

function getWeekRange() {
  const now = new Date()
  const day = now.getDay() || 7
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 7, 23, 59, 59)
  return { start, end }
}

export function TaskFilterBar() {
  const { filters, sortBy, sortOrder, setFilters, setSortBy, setSortOrder, clearFilters } = useTaskStore()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const hasActiveFilters = filters.status || filters.priority || filters.dueDateRange

  const handleStatusChange = (value: TaskStatus | null) => {
    setFilters({ ...filters, status: value ?? undefined })
    setOpenDropdown(null)
  }

  const handlePriorityChange = (value: TaskPriority | null) => {
    setFilters({ ...filters, priority: value ?? undefined })
    setOpenDropdown(null)
  }

  const handleDueDateChange = (value: string | null) => {
    let range: { start?: Date; end?: Date } | null = null
    if (value === 'today') {
      const { start, end } = getTodayRange()
      range = { start, end }
    } else if (value === 'week') {
      const { start, end } = getWeekRange()
      range = { start, end }
    } else if (value === 'overdue') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      range = { end: new Date(today.getTime() - 1) }
    } else if (value === 'none') {
      // Special handling: filter for tasks with no due_date
      // We'll handle this by setting a special flag, but for now use an impossible range to mean "none"
      // Actually, better approach: use a sentinel value in the filter. Let's use start > end.
      range = { start: new Date(8640000000000000), end: new Date(0) }
    }
    setFilters({ ...filters, dueDateRange: range ?? undefined })
    setOpenDropdown(null)
  }

  const activeStatusLabel = STATUS_OPTIONS.find((o) => o.value === filters.status)?.label ?? '全部状态'
  const activePriorityLabel = PRIORITY_OPTIONS.find((o) => o.value === filters.priority)?.label ?? '全部优先级'

  let activeDueLabel = '全部日期'
  if (filters.dueDateRange) {
    const { start, end } = filters.dueDateRange
    if (start && end) {
      const today = getTodayRange()
      if (start.getTime() === today.start.getTime() && end.getTime() === today.end.getTime()) {
        activeDueLabel = '今天截止'
      } else {
        activeDueLabel = '本周截止'
      }
    } else if (end && !start) {
      activeDueLabel = '已过期'
    } else if (start && !end) {
      activeDueLabel = '无截止日期'
    }
  }

  const toggleDropdown = (key: string) => {
    setOpenDropdown((prev) => (prev === key ? null : key))
  }

  return (
    <div className="h-12 px-4 flex items-center gap-2 bg-bg-surface border-b border-border-default text-sm">
      {/* Status filter */}
      <FilterDropdown
        label={activeStatusLabel}
        active={!!filters.status}
        isOpen={openDropdown === 'status'}
        onToggle={() => toggleDropdown('status')}
      >
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => handleStatusChange(opt.value)}
            className={cn(
              'w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2',
              filters.status === opt.value
                ? 'bg-primary-50 text-primary-700'
                : 'hover:bg-bg-elevated text-text-secondary'
            )}
          >
            {opt.color && <span className={cn('h-2 w-2 rounded-full', opt.color)} />}
            {opt.label}
          </button>
        ))}
      </FilterDropdown>

      {/* Priority filter */}
      <FilterDropdown
        label={activePriorityLabel}
        active={!!filters.priority}
        isOpen={openDropdown === 'priority'}
        onToggle={() => toggleDropdown('priority')}
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => handlePriorityChange(opt.value)}
            className={cn(
              'w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2',
              filters.priority === opt.value
                ? 'bg-primary-50 text-primary-700'
                : 'hover:bg-bg-elevated text-text-secondary'
            )}
          >
            {opt.color && <span className={cn('h-2 w-2 rounded-full', opt.color)} />}
            {opt.label}
          </button>
        ))}
      </FilterDropdown>

      {/* Due date filter */}
      <FilterDropdown
        label={activeDueLabel}
        active={!!filters.dueDateRange}
        isOpen={openDropdown === 'dueDate'}
        onToggle={() => toggleDropdown('dueDate')}
      >
        {DUE_DATE_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => handleDueDateChange(opt.value)}
            className={cn(
              'w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors',
              activeDueLabel === opt.label
                ? 'bg-primary-50 text-primary-700'
                : 'hover:bg-bg-elevated text-text-secondary'
            )}
          >
            {opt.label}
          </button>
        ))}
      </FilterDropdown>

      <div className="h-5 w-px bg-border-default mx-1" />

      {/* Sort */}
      <FilterDropdown
        label={SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? '排序'}
        active={false}
        isOpen={openDropdown === 'sort'}
        onToggle={() => toggleDropdown('sort')}
      >
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setSortBy(opt.value)
              setOpenDropdown(null)
            }}
            className={cn(
              'w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors',
              sortBy === opt.value
                ? 'bg-primary-50 text-primary-700'
                : 'hover:bg-bg-elevated text-text-secondary'
            )}
          >
            {opt.label}
          </button>
        ))}
      </FilterDropdown>

      <button
        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-bg-elevated text-text-muted transition-colors"
        title={sortOrder === 'asc' ? '升序' : '降序'}
      >
        <ArrowUpDown className={cn('h-3.5 w-3.5', sortOrder === 'desc' && 'rotate-180')} />
      </button>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="h-7 px-2 flex items-center gap-1 text-xs text-text-muted hover:text-status-error rounded-md hover:bg-status-error/10 transition-colors"
        >
          <X className="h-3 w-3" />
          清除筛选
        </button>
      )}
    </div>
  )
}

function FilterDropdown({
  label,
  active,
  isOpen,
  onToggle,
  children,
}: {
  label: string
  active: boolean
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={cn(
          'h-7 px-2.5 rounded-full text-xs flex items-center gap-1 transition-colors border',
          active
            ? 'bg-primary-50 text-primary-700 border-primary-200'
            : 'bg-bg-elevated text-text-secondary border-transparent hover:border-border-hover'
        )}
      >
        {label}
        <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onToggle} />
          <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] bg-bg-surface border border-border-default rounded-lg shadow-lg py-1 flex flex-col gap-0.5">
            {children}
          </div>
        </>
      )}
    </div>
  )
}
