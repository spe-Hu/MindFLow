import { CheckSquare, Square, CalendarDays, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NodeToolbarProps {
  activeNodeData: Record<string, unknown> | null
  activeNodePos: { x: number; y: number } | null
  isTask: boolean
  onToggleTask: () => void
  onDeleteNode: () => void
  onSetPriority: (priority: 'high' | 'medium' | 'low') => void
  onSetDueDate: (date: string | undefined) => void
}

export function NodeToolbar({
  activeNodeData,
  activeNodePos,
  isTask,
  onToggleTask,
  onDeleteNode,
  onSetPriority,
  onSetDueDate,
}: NodeToolbarProps) {
  if (!activeNodeData || !activeNodePos) return null

  const dueDate = activeNodeData._dueDate
    ? String(activeNodeData._dueDate).slice(0, 10)
    : ''

  return (
    <div
      className="absolute z-50 flex flex-col gap-1 bg-bg-surface border border-border-default rounded-lg shadow-md p-1.5 animate-in fade-in zoom-in-95 duration-150"
      style={{ left: activeNodePos.x, top: activeNodePos.y }}
    >
      <button
        onClick={onToggleTask}
        className={cn(
          'flex items-center gap-2 h-8 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
          isTask
            ? 'bg-primary-subtle text-primary-600'
            : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
        )}
      >
        {isTask ? (
          <>
            <CheckSquare className="h-3.5 w-3.5" />
            已标记为任务
          </>
        ) : (
          <>
            <Square className="h-3.5 w-3.5" />
            转为任务
          </>
        )}
      </button>
      <button
        onClick={onDeleteNode}
        className="flex items-center gap-2 h-8 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap text-status-error hover:bg-status-error/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
        删除节点
      </button>
      {isTask && (
        <>
          <div className="flex items-center gap-1 pt-1 border-t border-border-default">
            <span className="text-[10px] text-text-muted ml-1">优先级</span>
            {(['high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                onClick={() => onSetPriority(p)}
                className={cn(
                  'h-5 w-5 rounded-full border-2 transition-all',
                  p === 'high' && 'border-priority-high',
                  p === 'medium' && 'border-priority-medium',
                  p === 'low' && 'border-priority-low',
                  activeNodeData._priority === p
                    ? 'bg-bg-elevated scale-110'
                    : 'opacity-40 hover:opacity-80'
                )}
                title={p}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 pt-1 border-t border-border-default">
            <CalendarDays className="h-3 w-3 text-text-muted ml-1" />
            <span className="text-[10px] text-text-muted">截止</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                const dateVal = e.target.value
                onSetDueDate(dateVal ? new Date(dateVal).toISOString() : undefined)
              }}
              className="h-6 px-1.5 rounded border border-border-default bg-bg-primary text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
            {!!activeNodeData._dueDate && (
              <button
                onClick={() => onSetDueDate(undefined)}
                className="text-text-muted hover:text-status-error"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
