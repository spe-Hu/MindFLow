import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLocalWorkspaceStore } from '@/stores/localWorkspaceStore'

// ============================================================
// Mock 
// ============================================================

vi.mock('@/lib/db', () => ({
  db: {
    settings: {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    },
    projects: {
      delete: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
    mindmaps: {
      where: vi.fn(() => ({ delete: vi.fn().mockResolvedValue(undefined) })),
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
    tasks: {
      where: vi.fn(() => ({ delete: vi.fn().mockResolvedValue(undefined) })),
    },
    transaction: vi.fn((_mode, _tables, cb) => cb()),
  },
  getProjects: vi.fn().mockResolvedValue([]),
  upsertProject: vi.fn().mockResolvedValue(undefined),
  deleteProject: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/localFileSync', () => ({
  isFileSystemAccessSupported: vi.fn(() => true),
  requestLocalDirectory: vi.fn(),
  scanDirectoryForSmmMd: vi.fn().mockResolvedValue({ files: [], errors: [] }),
  readObsidianFile: vi.fn().mockResolvedValue({ content: '', lastModified: 0 }),
  checkPermission: vi.fn().mockResolvedValue('granted'),
}))

// Mock crypto.randomUUID for predictable IDs
beforeEach(() => {
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'test-uuid-1234') })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  // Reset zustand store
  useLocalWorkspaceStore.setState(useLocalWorkspaceStore.getInitialState?.() || {
    dirs: [], filesByDir: {}, obsidianProjects: {}, isScanning: false,
    syncState: 'idle', lastError: null, syncIntervalMs: 5000, _syncTimer: null,
  })
})

// ============================================================
// Tests
// ============================================================

describe('useLocalWorkspaceStore', () => {
  describe('initial state', () => {
    it('has empty dirs and idle syncState', () => {
      const s = useLocalWorkspaceStore.getState()
      expect(s.dirs).toEqual([])
      expect(s.syncState).toBe('idle')
      expect(s._syncTimer).toBeNull()
    })
  })

  describe('startAutoSync / stopAutoSync', () => {
    it('starts interval timer', () => {
      const store = useLocalWorkspaceStore.getState()
      store.startAutoSync()
      const state = useLocalWorkspaceStore.getState()
      expect(state._syncTimer).not.toBeNull()
      store.stopAutoSync()
      expect(useLocalWorkspaceStore.getState()._syncTimer).toBeNull()
    })

    it('does not start duplicate timers', () => {
      const store = useLocalWorkspaceStore.getState()
      store.startAutoSync()
      const t1 = useLocalWorkspaceStore.getState()._syncTimer
      store.startAutoSync()
      const t2 = useLocalWorkspaceStore.getState()._syncTimer
      expect(t1).toBe(t2)
      store.stopAutoSync()
    })
  })

  describe('setSyncInterval', () => {
    it('updates interval and restarts timer', () => {
      const store = useLocalWorkspaceStore.getState()
      store.startAutoSync()
      const t1 = useLocalWorkspaceStore.getState()._syncTimer
      store.setSyncInterval(10000)
      const t2 = useLocalWorkspaceStore.getState()._syncTimer
      // Timer should be different after restart
      expect(useLocalWorkspaceStore.getState().syncIntervalMs).toBe(10000)
      expect(t1).not.toBe(t2)
      store.stopAutoSync()
    })
  })
})
