import { create } from 'zustand'
import {
  syncProjectToCloud,
  syncMindmapToCloud,
  syncTaskToCloud,
  fetchAllFromCloud,
} from '@/lib/sync'
import { useAuthStore } from './authStore'
import { useProjectStore } from './projectStore'
import { db } from '@/lib/db'
import { devLog, devWarn } from '@/lib/devConsole'

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

interface SyncState {
  status: SyncStatus
  lastSyncTime: string | null
  lastError: string | null

  setStatus: (status: SyncStatus) => void
  setLastSyncTime: (time: string) => void
  setLastError: (error: string | null) => void
  reset: () => void

  // 核心：双向同步（先 push 本地 → 再 pull 云端）
  doAutoSync: () => Promise<void>
}

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
let lastSyncTimestamp = 0
const MIN_SYNC_INTERVAL_MS = 30_000 // 30 秒最小间隔

export const useSyncStore = create<SyncState>((set) => ({
  status: navigator.onLine ? 'idle' : 'offline',
  lastSyncTime: localStorage.getItem('mindflow-last-sync-time'),
  lastError: null,

  setStatus: (status) => set({ status }),
  setLastSyncTime: (time) => {
    localStorage.setItem('mindflow-last-sync-time', time)
    set({ lastSyncTime: time })
  },
  setLastError: (lastError) => set({ lastError }),
  reset: () => set({ status: navigator.onLine ? 'idle' : 'offline', lastError: null }),

  doAutoSync: async () => {
    const { user } = useAuthStore.getState()
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
        // Step 1: Push 本地全部数据到云端
        const [projects, mindmaps, tasks] = await Promise.all([
          db.projects.toArray(),
          db.mindmaps.toArray(),
          db.tasks.toArray(),
        ])

        const pushErrors: string[] = []
        for (const p of projects) {
          try { await syncProjectToCloud(p) } catch (e: any) { pushErrors.push(e.message) }
        }
        for (const m of mindmaps) {
          try { await syncMindmapToCloud(m) } catch (e: any) { pushErrors.push(e.message) }
        }
        for (const t of tasks) {
          try { await syncTaskToCloud(t) } catch (e: any) { pushErrors.push(e.message) }
        }

        // Step 2: Pull 云端数据到本地
        const cloud = await fetchAllFromCloud()
        await db.transaction('rw', [db.projects, db.mindmaps, db.tasks], async () => {
          // 以云端为准覆盖本地
          if (cloud.projects.length > 0) await db.projects.bulkPut(cloud.projects)
          if (cloud.mindmaps.length > 0) await db.mindmaps.bulkPut(cloud.mindmaps)
          if (cloud.tasks.length > 0) await db.tasks.bulkPut(cloud.tasks)
        })

        // 刷新 UI（通过 projectStore 的 loadProjects）
        await useProjectStore.getState().loadProjects()

        const isoNow = new Date().toISOString()
        localStorage.setItem('mindflow-last-sync-time', isoNow)
        set({ status: 'idle', lastSyncTime: isoNow, lastError: null })

        if (pushErrors.length > 0) {
          devWarn('[Sync] Push completed with warnings:', pushErrors)
        }
        devLog(`[Sync] Auto-sync complete: ${projects.length} projects, ${mindmaps.length} mindmaps, ${tasks.length} tasks.`)
      } catch (err: any) {
        console.error('[Sync] Auto-sync failed:', err)
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
