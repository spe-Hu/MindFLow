import { create } from 'zustand'
import {
  doAutoSync as _doAutoSync,
  pullFromCloud,
  pushDirtyRecords,
  subscribeToRealtime,
  unsubscribeFromRealtime,
  scheduleAutoPush as _scheduleAutoPush,
} from '@/lib/sync'
import { devLog, devWarn } from '@/lib/devConsole'

type SyncStatus = 'idle' | 'pushing' | 'pulling' | 'syncing' | 'error' | 'offline'

/** Injected dependencies — decouple syncStore from auth/project stores */
interface SyncDeps {
  getUser: () => { id: string } | null
  refreshProjects: () => Promise<void>
}

interface ConflictInfo {
  table: string
  id: string
  localUpdatedAt: string
  cloudUpdatedAt: string
  localVersion: number
  cloudVersion: number
}

interface SyncState {
  status: SyncStatus
  lastSyncTime: string | null
  lastError: string | null
  deps: SyncDeps | null
  conflicts: ConflictInfo[]

  setStatus: (status: SyncStatus) => void
  setLastSyncAt: (date: Date) => void
  setSyncError: (error: string) => void
  setLastError: (error: string | null) => void
  setDeps: (deps: SyncDeps) => void
  reset: () => void
  addConflict: (conflict: ConflictInfo) => void
  clearConflicts: () => void

  // 核心：双向同步（先 push dirty → 再 pull 云端 + updated_at 比较）
  doAutoSync: () => Promise<void>
}

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
let lastSyncTimestamp = 0
const MIN_SYNC_INTERVAL_MS = 30_000 // 30 秒最小间隔

/** Test helper: reset module-level state between tests */
export function __resetSyncState() {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer)
    syncDebounceTimer = null
  }
  lastSyncTimestamp = 0
  safeSetItem('mindflow-last-sync-time', '1970-01-01T00:00:00.000Z')
  useSyncStore.getState().setLastSyncAt(new Date(0))
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // noop in SSR / test env
  }
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: typeof navigator !== 'undefined' && navigator.onLine ? 'idle' : 'offline',
  lastSyncTime: safeGetItem('mindflow-last-sync-time'),
  lastError: null,
  deps: null,
  conflicts: [],

  setStatus: (status) => set({ status }),
  setLastSyncAt: (date) => {
    const iso = date.toISOString()
    safeSetItem('mindflow-last-sync-time', iso)
    set({ lastSyncTime: iso })
  },
  setSyncError: (lastError) => set({ lastError, status: 'error' }),
  setLastError: (lastError) => set({ lastError }),
  setDeps: (deps) => set({ deps }),
  reset: () => set({ status: typeof navigator !== 'undefined' && navigator.onLine ? 'idle' : 'offline', lastError: null, conflicts: [] }),
  addConflict: (conflict) => set((s) => ({ conflicts: [...s.conflicts, conflict] })),
  clearConflicts: () => set({ conflicts: [] }),

  doAutoSync: async () => {
    const { deps } = get()
    const user = deps?.getUser()
    const refreshProjects = deps?.refreshProjects

    if (!user) return
    if (!navigator.onLine) {
      set({ status: 'offline' })
      return
    }

    // 防抖：最小间隔 30 秒
    const now = Date.now()
    if (now - lastSyncTimestamp < MIN_SYNC_INTERVAL_MS) {
      return
    }
    lastSyncTimestamp = now

    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer)
    }

    syncDebounceTimer = setTimeout(async () => {
      syncDebounceTimer = null
      set({ status: 'syncing', lastError: null })

      try {
        // 走 sync.ts 中的核心同步逻辑（push dirty + pull with updated_at comparison）
        await _doAutoSync()

        // 刷新 UI（通过注入的 refreshProjects）
        if (refreshProjects) {
          await refreshProjects()
        }

        const isoNow = new Date().toISOString()
        safeSetItem('mindflow-last-sync-time', isoNow)
        set({ status: 'idle', lastSyncTime: isoNow })
        devLog('[SyncStore] Auto-sync complete')
      } catch (err: any) {
        devWarn('[SyncStore] Auto-sync failed:', err)
        set({ status: 'error', lastError: err.message || '同步失败' })
      }
    }, 500)
  },
}))

// 导出防抖调度入口（可被多处调用，只执行一次）
export function scheduleAutoSync() {
  const { doAutoSync } = useSyncStore.getState()
  void doAutoSync()
}

// 轻量 push debounce（3s），只 push dirty，不做 pull
export function scheduleAutoPush() {
  _scheduleAutoPush()
}

// Dev-only: expose for E2E testing
if (typeof window !== 'undefined') {
  ;(window as any).__syncStore = useSyncStore
  ;(window as any).__scheduleAutoSync = scheduleAutoSync
  ;(window as any).__resetSyncState = __resetSyncState
}
