import { useState, useRef, useEffect } from 'react'
import { Cloud, CloudOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useSyncStore } from '@/stores/syncStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

export function SyncStatusIndicator() {
  const { status, lastSyncTime, lastError } = useSyncStore()
  const user = useAuthStore((s) => s.user)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // 未登录时不显示
  if (!user) return null

  // Click outside to close tooltip
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltipOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const formatTime = (iso: string | null) => {
    if (!iso) return '尚未同步'
    const d = new Date(iso)
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diffSec < 60) return `${diffSec} 秒前`
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} 小时前`
    return d.toLocaleDateString('zh-CN')
  }

  const statusConfig = {
    idle: {
      icon: Cloud,
      color: 'text-text-muted',
      hover: 'hover:text-status-success',
      bg: 'hover:bg-bg-elevated',
      label: '已同步',
    },
    syncing: {
      icon: Loader2,
      color: 'text-primary-600',
      hover: '',
      bg: '',
      label: '同步中…',
    },
    error: {
      icon: AlertCircle,
      color: 'text-status-error',
      hover: 'hover:text-status-error',
      bg: 'hover:bg-red-50',
      label: '同步出错',
    },
    offline: {
      icon: CloudOff,
      color: 'text-text-muted',
      hover: 'hover:text-status-warning',
      bg: 'hover:bg-bg-elevated',
      label: '离线模式',
    },
  }

  const cfg = statusConfig[status]
  const Icon = cfg.icon

  return (
    <div className="relative" ref={tooltipRef}>
      <button
        onClick={() => setTooltipOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 h-7 px-2 rounded-md text-xs transition-colors',
          cfg.color,
          cfg.bg
        )}
        title={cfg.label}
      >
        <Icon className={cn('h-3.5 w-3.5', status === 'syncing' && 'animate-spin')} />
        <span className="hidden sm:inline">{cfg.label}</span>
      </button>

      {tooltipOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 p-4 rounded-xl bg-bg-surface border border-border-default shadow-lg z-50">
          <div className="flex items-center gap-2 mb-3">
            <Icon className={cn('h-4 w-4', cfg.color, status === 'syncing' && 'animate-spin')} />
            <span className="text-sm font-medium text-text-primary">{cfg.label}</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">上次同步</span>
              <span className="text-text-primary">{formatTime(lastSyncTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">同步状态</span>
              <span className={cn(
                status === 'idle' && 'text-status-success',
                status === 'syncing' && 'text-primary-600',
                status === 'error' && 'text-status-error',
                status === 'offline' && 'text-status-warning',
              )}>
                {status === 'idle' && '一切正常'}
                {status === 'syncing' && '正在同步'}
                {status === 'error' && '同步失败'}
                {status === 'offline' && '离线'}
              </span>
            </div>
            {lastError && (
              <div className="mt-2 p-2 rounded-md bg-red-50 text-status-error text-[11px]">
                {lastError}
              </div>
            )}
            <div className="pt-2 border-t border-border-default">
              <p className="text-text-muted leading-relaxed">
                {navigator.onLine
                  ? '所有修改会自动同步到云端。如果多台设备同时使用，数据以最新上传的为准。'
                  : '当前处于离线模式，所有数据会保存在本地。恢复联网后自动同步。'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
