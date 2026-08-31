import { useState, useRef, useEffect } from 'react'
import { Search, Menu, LogOut, Settings, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { usePWA } from '@/hooks/usePWA'
import { NotificationPanel } from './NotificationPanel'
import { SyncStatusIndicator } from '@/components/sync/SyncStatusIndicator'

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const navigate = useNavigate()
  const { toggleSidebar, sidebarCollapsed } = useUIStore()
  const { user, logout } = useAuthStore()
  const { installPrompt, install } = usePWA()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayName = user?.display_name || user?.username || '用户'
  const avatarUrl = user?.avatar_url

  return (
    <header
      className={cn(
        'h-12 flex items-center justify-between px-4 border-b border-border-default bg-bg-surface shrink-0',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <Menu className="h-5 w-5 text-text-secondary" />
        </Button>
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <span className="text-sm font-semibold text-text-primary">MindFlow</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => useUIStore.getState().setSearchOpen(true)}
          className="hidden md:flex items-center gap-2 h-8 px-3 rounded-md bg-bg-elevated border border-border-default text-text-muted text-xs hover:border-text-muted transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>全局搜索</span>
          <kbd className="hidden lg:inline-flex items-center justify-center h-5 px-1.5 rounded bg-bg-surface border border-border-default text-[10px] font-mono text-text-muted ml-2">
            Cmd+K
          </kbd>
        </button>

        <NotificationPanel />

        <SyncStatusIndicator />

        {installPrompt && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={install}
            title="安装到桌面"
            aria-label="安装到桌面"
          >
            <Download className="h-4 w-4 text-text-secondary" />
          </Button>
        )}

        {/* User Avatar / Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-7 w-7 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary-200 transition-all"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-text-secondary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 w-48 bg-bg-surface border border-border-default rounded-lg shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2.5 border-b border-border-default">
                <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
                {user?.username && (
                  <p className="text-xs text-text-muted truncate">@{user.username}</p>
                )}
              </div>
              <div className="p-1">
                <button
                  onClick={() => { setMenuOpen(false); navigate('/settings') }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  设置
                </button>
                <button
                  onClick={() => { setMenuOpen(false); logout() }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-status-error hover:bg-status-error/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
