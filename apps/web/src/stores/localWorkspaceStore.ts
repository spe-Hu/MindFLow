/**
 * Local Workspace Store — 本地工作空间状态管理
 *
 * 管理已授权的本地目录、自动扫描轮询、权限检测
 */

import { create } from 'zustand'
import type { LocalProject } from '@/lib/db'
import { db, getProjects, upsertProject, deleteProject } from '@/lib/db'
import { parseSmmMd } from '@/lib/smmMdParser'
import { devLog, devWarn } from '@/lib/devConsole'
import { syncDirtyProjectToLocal, getDirtyProjectIds } from '@/lib/localSyncEngine'
import {
  requestLocalDirectory,
  scanDirectoryForSmmMd,
  readObsidianFile,
  checkPermission,
  type ObsidianFile,
} from '@/lib/localFileSync'

// ============================================================
// Types
// ============================================================

export interface LocalWorkspaceDir {
  id: string
  name: string
  handle: FileSystemDirectoryHandle
}

interface LocalWorkspaceState {
  /** 已注册目录 */
  dirs: LocalWorkspaceDir[]
  /** 目录 ID → 扫描到的文件列表 */
  filesByDir: Record<string, ObsidianFile[]>
  /** 项目 ID → ObsidianFile（反向索引，用于写回） */
  fileByProjectId: Record<string, ObsidianFile>
  /** 项目 ID → LocalProject（仅 obsidian 项目） */
  obsidianProjects: Record<string, LocalProject>
  /** 是否在扫描中 */
  isScanning: boolean
  /** 同步状态 */
  syncState: 'idle' | 'syncing' | 'error'
  /** 最后错误信息 */
  lastError: string | null
  /** 扫描轮询间隔（毫秒），默认 5000 */
  syncIntervalMs: number
  /** 内部：轮询定时器 ID */
  _syncTimer: ReturnType<typeof setInterval> | null

  // Actions
  /** 初始化：从 IndexedDB 恢复已注册目录 */
  init: () => Promise<void>
  /** 注册新目录 */
  registerDirectory: () => Promise<void>
  /** 注销目录 */
  unregisterDirectory: (dirId: string) => Promise<void>
  /** 手动扫描单个目录 */
  scanDirectory: (dirId: string) => Promise<void>
  /** 启动自动轮询 */
  startAutoSync: () => void
  /** 停止自动轮询 */
  stopAutoSync: () => void
  /** 检查各目录权限状态 */
  checkPermissions: () => Promise<Record<string, boolean>>
  /** 设置轮询间隔 */
  setSyncInterval: (ms: number) => void
  /** 写回所有 dirty 项目 */
  syncDirtyToLocal: () => Promise<void>
}

// settings key for persisting directory handles
const SETTINGS_KEY = 'local_workspace_dirs'

// ============================================================
// Helpers
// ============================================================

function genId(): string {
  return crypto.randomUUID()
}

/** 从文件名生成项目 ID（稳定映射） */
function projectIdForFile(dirId: string, relativePath: string): string {
  return `obs-${dirId}-${btoa(encodeURIComponent(relativePath)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`
}

// ============================================================
// Store
// ============================================================

export const useLocalWorkspaceStore = create<LocalWorkspaceState>((set, get) => ({
  dirs: [],
  filesByDir: {},
  fileByProjectId: {},
  obsidianProjects: {},
  isScanning: false,
  syncState: 'idle',
  lastError: null,
  syncIntervalMs: 5000,
  _syncTimer: null,

  init: async () => {
    try {
      const record = await db.settings.get(SETTINGS_KEY)
      if (!record || !record.value) return

      const saved = record.value as { dirs: Array<{ id: string; name: string }> }
      // FileSystemHandle 本身在 IndexedDB structured clone 中保存了引用
      // 但如果浏览器权限已过期，句柄会失效，需要后续 checkPermissions 检测
      const handles = (record.value as any)?.handles as FileSystemDirectoryHandle[] | undefined
      const dirRecords = saved.dirs || []

      // Note: handles 可能以独立字段存储
      const restoredDirs: LocalWorkspaceDir[] = []
      for (const d of dirRecords) {
        // 尝试从 record.value.handles 中按索引恢复句柄
        // 如果恢复失败则跳过（用户需要重新授权）
        const handle = handles?.find((h) => h?.name === d.name)
        if (handle) {
          restoredDirs.push({ id: d.id, name: d.name, handle })
        }
      }

      set({ dirs: restoredDirs })

      // 首次扫描所有目录
      for (const dir of restoredDirs) {
        await get().scanDirectory(dir.id)
      }

      // 启动自动轮询
      get().startAutoSync()
    } catch (err) {
      devWarn('[localWorkspaceStore] init failed:', err)
      set({ lastError: err instanceof Error ? err.message : String(err) })
    }
  },

  registerDirectory: async () => {
    set({ syncState: 'syncing', lastError: null })
    try {
      const handle = await requestLocalDirectory()
      if (!handle) {
        set({ syncState: 'idle' })
        return
      }

      const dirId = genId()
      const dirName = handle.name

      // Save to state
      set((state) => ({
        dirs: [...state.dirs, { id: dirId, name: dirName, handle }],
      }))

      // Persist to settings
      await persistDirs(get().dirs)

      // Scan immediately
      await get().scanDirectory(dirId)

      // Ensure auto-sync is running
      if (!get()._syncTimer) {
        get().startAutoSync()
      }
    } catch (err) {
      devWarn('[localWorkspaceStore] registerDirectory failed:', err)
      set({ syncState: 'error', lastError: err instanceof Error ? err.message : String(err) })
    }
  },

  unregisterDirectory: async (dirId: string) => {
    const state = get()
    const dir = state.dirs.find((d) => d.id === dirId)
    if (!dir) return

    // Remove associated projects from IndexedDB (but not local files)
    const projectsToRemove = Object.values(state.obsidianProjects).filter(
      (p) => p.local_dir_id === dirId
    )
    for (const project of projectsToRemove) {
      await deleteObsidianProject(project.id)
    }

    // Update state
    set((s) => ({
      dirs: s.dirs.filter((d) => d.id !== dirId),
      filesByDir: { ...s.filesByDir, [dirId]: undefined },
      obsidianProjects: Object.fromEntries(
        Object.entries(s.obsidianProjects).filter(([, p]) => p.local_dir_id !== dirId)
      ) as Record<string, LocalProject>,
    }))

    // Persist updated dir list
    await persistDirs(get().dirs)
  },

  scanDirectory: async (dirId: string) => {
    const state = get()
    const dir = state.dirs.find((d) => d.id === dirId)
    if (!dir) return

    // Check permission first
    const perm = await checkPermission(dir.handle)
    if (perm !== 'granted') {
      devWarn('[localWorkspaceStore] Permission not granted for dir:', dir.name)
      return
    }

    set({ isScanning: true })
    try {
      const { files, errors } = await scanDirectoryForSmmMd(dir.handle)
      if (errors.length > 0) {
        devWarn('[localWorkspaceStore] Scan errors:', errors)
      }

      set((s) => {
        const nextFileByProjectId = { ...s.fileByProjectId }
        // Remove old entries for this directory
        for (const [path] of previousPaths) {
          if (!currentPaths.has(path)) {
            const pid = projectIdForFile(dirId, path)
            delete nextFileByProjectId[pid]
          }
        }
        // Add / update current entries
        for (const file of files) {
          const pid = projectIdForFile(dirId, file.relativePath)
          nextFileByProjectId[pid] = file
        }
        return {
          filesByDir: { ...s.filesByDir, [dirId]: files },
          fileByProjectId: nextFileByProjectId,
        }
      })

      // Detect new / removed / updated files
      const previousFiles = state.filesByDir[dirId] || []
      const previousPaths = new Map(previousFiles.map((f) => [f.relativePath, f]))
      const currentPaths = new Map(files.map((f) => [f.relativePath, f]))

      // Removed: in previous but not in current
      for (const [path, prevFile] of previousPaths) {
        if (!currentPaths.has(path)) {
          const pid = projectIdForFile(dirId, path)
          await deleteObsidianProject(pid)
        }
      }

      // New or updated: in current
      for (const file of files) {
        const pid = projectIdForFile(dirId, file.relativePath)
        const prev = previousPaths.get(file.relativePath)

        if (!prev || prev.lastModified !== file.lastModified) {
          // New or modified: parse and upsert
          await upsertObsidianProject(dirId, file, pid)
        }
      }

      set({ syncState: 'idle', lastError: null })
    } catch (err) {
      devWarn('[localWorkspaceStore] scanDirectory failed:', err)
      set({ syncState: 'error', lastError: err instanceof Error ? err.message : String(err) })
    } finally {
      set({ isScanning: false })
    }
  },

  startAutoSync: () => {
    const state = get()
    if (state._syncTimer) return

    const timer = setInterval(() => {
      // 1. Write dirty projects back to local first
      get().syncDirtyToLocal().catch(() => {})
      // 2. Scan all directories
      const { dirs } = get()
      for (const dir of dirs) {
        get().scanDirectory(dir.id)
      }
    }, state.syncIntervalMs)

    set({ _syncTimer: timer })
    devLog('[localWorkspaceStore] Auto-sync started, interval:', state.syncIntervalMs, 'ms')
  },

  syncDirtyToLocal: async () => {
    if (typeof window === 'undefined') return
    const { fileByProjectId } = get()
    const dirtyIds = getDirtyProjectIds()
    if (dirtyIds.length === 0) return

    for (const pid of dirtyIds) {
      const file = fileByProjectId[pid]
      if (!file) {
        devWarn('[localWorkspaceStore] syncDirtyToLocal: no file for project', pid)
        continue
      }
      try {
        await syncDirtyProjectToLocal(pid, () => file)
      } catch (err) {
        devWarn('[localWorkspaceStore] syncDirtyToLocal failed for', pid, err)
      }
    }
  },

  stopAutoSync: () => {
    const timer = get()._syncTimer
    if (timer) {
      clearInterval(timer)
      set({ _syncTimer: null })
      devLog('[localWorkspaceStore] Auto-sync stopped')
    }
  },

  checkPermissions: async () => {
    const results: Record<string, boolean> = {}
    for (const dir of get().dirs) {
      try {
        const perm = await checkPermission(dir.handle)
        results[dir.id] = perm === 'granted'
      } catch {
        results[dir.id] = false
      }
    }
    return results
  },

  setSyncInterval: (ms: number) => {
    set({ syncIntervalMs: ms })
    // Restart timer with new interval
    const wasRunning = get()._syncTimer !== null
    get().stopAutoSync()
    if (wasRunning) {
      get().startAutoSync()
    }
  },
}))

// ============================================================
// Internal Helpers
// ============================================================

async function persistDirs(dirs: LocalWorkspaceDir[]): Promise<void> {
  await db.settings.put({
    key: SETTINGS_KEY,
    value: {
      dirs: dirs.map((d) => ({ id: d.id, name: d.name })),
      handles: dirs.map((d) => d.handle),
    },
  })
}

/** 从 IndexedDB 删除 obsidian 项目（只删本地 IndexedDB，不删本地文件） */
async function deleteObsidianProject(projectId: string): Promise<void> {
  try {
    await db.transaction('rw', db.projects, db.mindmaps, db.tasks, async () => {
      await db.projects.delete(projectId)
      await db.mindmaps.where('project_id').equals(projectId).delete()
      await db.tasks.where('project_id').equals(projectId).delete()
    })
  } catch (err) {
    devWarn('[localWorkspaceStore] deleteObsidianProject failed:', err)
  }
}

/** 解析 Obsidian 文件并 upsert 为 LocalProject + LocalMindmap */
async function upsertObsidianProject(
  dirId: string,
  file: ObsidianFile,
  projectId: string
): Promise<void> {
  const { content } = await readObsidianFile(file)
  const parsed = parseSmmMd(content)

  const project: LocalProject = {
    id: projectId,
    name: file.name,
    color: '#059669',
    sort_order: 0,
    is_archived: false,
    version: 1,
    last_opened_at: new Date(),
    project_type: 'obsidian',
    local_path: file.relativePath,
    local_dir_id: dirId,
    last_synced_at: new Date(file.lastModified),
  }

  await db.projects.put(project)

  const mindmapId = projectId // 1:1 mapping
  const existingMindmap = await db.mindmaps.get(mindmapId)
  await db.mindmaps.put({
    id: mindmapId,
    project_id: projectId,
    tree_data: parsed.metadata as Record<string, unknown>,
    view_state: existingMindmap?.view_state || {},
    version: (existingMindmap?.version || 0) + 1,
  })
}
