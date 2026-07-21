import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { SyncMigrationDialog } from '@/components/sync/SyncMigrationDialog'
import { Toaster } from '@/components/ui/sonner'
import { useProjectStore } from '@/stores/projectStore'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { scheduleAutoSync, useSyncStore } from '@/stores/syncStore'
import { cleanupOrphanedTasks } from '@/lib/taskTreeSync'
import { toast } from 'sonner'

export function AppLayout() {
  const loadProjects = useProjectStore((s) => s.loadProjects)
  const setNewProjectDialogOpen = useUIStore((s) => s.setNewProjectDialogOpen)
  const offlineToastIdRef = useRef<string | number | null>(null)
  const hasAutoSyncedRef = useRef(false)

  useEffect(() => {
    loadProjects()
    // Async data integrity cleanup - non-blocking
    cleanupOrphanedTasks().catch(() => { /* ignore */ })
    // Inject sync dependencies to break implicit cross-store coupling
    useSyncStore.getState().setDeps({
      getUser: () => useAuthStore.getState().user,
      refreshProjects: () => useProjectStore.getState().loadProjects(),
    })
  }, [loadProjects])

  // --- Auto sync: app startup (debounced) ---
  useEffect(() => {
    if (hasAutoSyncedRef.current) return
    const t = setTimeout(() => {
      hasAutoSyncedRef.current = true
      const { user } = useAuthStore.getState()
      if (user && navigator.onLine) {
        scheduleAutoSync()
      }
    }, 2000) // 延迟 2 秒，避免与初始化竞争
    return () => clearTimeout(t)
  }, [])

  // --- Auto sync: window re-focus ---
  useEffect(() => {
    const handleVis = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        scheduleAutoSync()
      }
    }
    document.addEventListener('visibilitychange', handleVis)
    return () => document.removeEventListener('visibilitychange', handleVis)
  }, [])

  // Global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      // Cmd/Ctrl + Shift + N → New Project
      if (isMod && e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        const target = e.target as HTMLElement
        const tag = target.tagName.toLowerCase()
        const isEditing = tag === 'input' || tag === 'textarea' || target.isContentEditable
        if (isEditing) return
        e.preventDefault()
        setNewProjectDialogOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setNewProjectDialogOpen])

  // Network status listener
  useEffect(() => {
    const handleOffline = () => {
      useSyncStore.getState().setStatus('offline')
      offlineToastIdRef.current = toast.info('已切换到离线模式', {
        description: '数据将保存在本地，恢复联网后自动同步',
        duration: 6000,
        id: 'network-offline',
      })
    }

    const handleOnline = () => {
      useSyncStore.getState().setStatus('idle')
      if (offlineToastIdRef.current != null) {
        toast.dismiss(offlineToastIdRef.current)
      }
      toast.success('网络已恢复', {
        description: '数据正在与云端同步',
        duration: 4000,
        id: 'network-online',
      })
      // NEW: 真正触发自动同步
      scheduleAutoSync()
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    // Initial state check
    if (!navigator.onLine) {
      handleOffline()
    }

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <GlobalSearch />
      <SyncMigrationDialog />
      <Toaster position="bottom-right" />
    </div>
  )
}
