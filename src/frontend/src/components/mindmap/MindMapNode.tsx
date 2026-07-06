import { cn } from '@/lib/utils'

interface MindMapNodeProps {
  node: {
    text: string
    uid: string
    data?: Record<string, unknown>
    _isTask?: boolean
  }
  isActive?: boolean
}

export function MindMapNode({ node, isActive }: MindMapNodeProps) {
  const isTask = Boolean(node._isTask) || Boolean(node.data?._isTask)

  return (
    <div
      className={cn(
        'px-3 py-1.5 rounded-md text-sm font-medium transition-shadow duration-fast',
        'border border-border-default bg-bg-surface',
        isTask && 'border-l-[3px] border-l-priority-medium pl-2.5',
        isActive && 'shadow-md ring-2 ring-primary-ring border-primary'
      )}
    >
      <span className="text-text-primary">{node.text}</span>
      {isTask && (
        <span className="ml-1.5 inline-flex items-center justify-center h-3.5 w-3.5 rounded-sm border border-text-muted">
          <svg className="h-2.5 w-2.5 text-status-success opacity-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </div>
  )
}
