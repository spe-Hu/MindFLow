import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  /** 柔和背景色调，如 'indigo' | 'blue' | 'amber' | 'emerald' | 'rose' | 'slate' */
  tone?: string
  className?: string
  compact?: boolean
}

const TONE_CLASSES: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
  slate: 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400',
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'slate',
  className,
  compact = false,
}: EmptyStateProps) {
  const iconBg = TONE_CLASSES[tone] || TONE_CLASSES.slate

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-12 px-4',
        className
      )}
    >
      <div
        className={cn(
          'rounded-full flex items-center justify-center mb-3',
          compact ? 'h-10 w-10' : 'h-12 w-12',
          iconBg
        )}
      >
        <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
      </div>
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && (
        <p className="text-xs text-text-muted mt-1 max-w-[280px]">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
