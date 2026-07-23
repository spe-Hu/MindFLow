import { create } from 'zustand'
import {
  syncProjectToCloud,
  syncMindmapToCloud,
  syncTaskToCloud,
  fetchAllFromCloud,
} from '@/lib/sync'
import { db } from '@/lib/db'
import { devLog, devWarn } from '@/lib/devConsole'

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

/** Injected dependencies — decouple syncStore from auth/project stores */
interface SyncDeps {
  getUser: () => { id: string } | null
  refreshProjects: () => Promise<void>
}

interface SyncState {
  status: SyncStatus
  lastSyncTime: string | null
  lastError: string | null
  deps: SyncDeps | null

  setStatus: (status: SyncStatus) => void
  setLastSyncTime: (time: string) => void
  setLastError: (error: string | null) => void
  setDeps: (deps: SyncDeps) => void
  reset: () => void

  // 核心：双向同步（先 push 本地 → 再 pull 云端）
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

  setStatus: (status) => set({ status }),
  setLastSyncTime: (time) => {
    safeSetItem('mindflow-last-sync-time', time)
    set({ lastSyncTime: time })
  },
  setLastError: (lastError) => set({ lastError }),
  setDeps: (deps) => set({ deps }),
  reset: () => set({ status: typeof navigator !== 'undefined' && navigator.onLine ? 'idle' : 'offline', lastError: null }),

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
          // 以云端为准：先删除本地多余记录，再写入云端数据
          if (cloud.projects.length > 0) {
            const localIds = (await db.projects.toArray()).map((p) => p.id)
            const cloudIds = new Set(cloud.projects.map((p) => p.id))
            const toDelete = localIds.filter((id) => !cloudIds.has(id))
            if (toDelete.length > 0) await db.projects.bulkDelete(toDelete)
            await db.projects.bulkPut(cloud.projects)
          }
          if (cloud.mindmaps.length > 0) {
            const localIds = (await db.mindmaps.toArray()).map((m) => m.id)
            const cloudIds = new Set(cloud.mindmaps.map((m) => m.id))
            const toDelete = localIds.filter((id) => !cloudIds.has(id))
            if (toDelete.length > 0) await db.mindmaps.bulkDelete(toDelete)
            await db.mindmaps.bulkPut(cloud.mindmaps)
          }
          if (cloud.tasks.length > 0) {
            const localIds = (await db.tasks.toArray()).map((t) => t.id)
            const cloudIds = new Set(cloud.tasks.map((t) => t.id))
            const toDelete = localIds.filter((id) => !cloudIds.has(id))
            if (toDelete.length > 0) await db.tasks.bulkDelete(toDelete)
            await db.tasks.bulkPut(cloud.tasks)
          }
        })

        // 刷新 UI（通过注入的 refreshProjects）
        if (refreshProjects) {
          await refreshProjects()
        }

        const isoNow = new Date().toISOString()
        safeSetItem('mindflow-last-sync-time', isoNow)

        if (pushErrors.length > 0) {
          const summary = pushErrors.slice(0, 3).join('; ')
          const more = pushErrors.length > 3 ? ` 等共 ${pushErrors.length} 项失败` : ''
          const errorMsg = `云端同步失败: ${summary}${more}`
          devWarn('[Sync] Push completed with errors:', pushErrors)
          set({ status: 'error', lastSyncTime: isoNow, lastError: errorMsg })
        } else {
          set({ status: 'idle', lastSyncTime: isoNow, lastError: null })
        }

        devLog(`[Sync] Auto-sync complete: ${projects.length} projects, ${mindmaps.length} mindmaps, ${tasks.length} tasks.`)
      } catch (err: any) {
        devWarn('[Sync] Auto-sync failed:', err)
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
