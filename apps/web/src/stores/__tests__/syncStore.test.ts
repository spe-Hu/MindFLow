import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================
// Stub globals BEFORE modules that reference them are imported
// ============================================================
const lsMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(globalThis, 'localStorage', {
  value: lsMock,
  writable: true,
  configurable: true,
})
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
  writable: true,
  configurable: true,
})

// ============================================================
// Mock modules (hoisted by vitest)
// ============================================================
vi.mock('@/lib/devConsole', () => ({
  devLog: vi.fn(),
  devWarn: vi.fn(),
  devError: vi.fn(),
}))

vi.mock('@/lib/sync', () => ({
  syncProjectToCloud: vi.fn(),
  syncMindmapToCloud: vi.fn(),
  syncTaskToCloud: vi.fn(),
  fetchAllFromCloud: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    projects: { toArray: vi.fn() },
    mindmaps: { toArray: vi.fn() },
    tasks: { toArray: vi.fn() },
    transaction: vi.fn((_mode: string, _tables: string[], cb: () => Promise<void>) => cb()),
  },
}))

// Import mocked modules dynamically to get the mock handles
const { syncProjectToCloud, syncMindmapToCloud, syncTaskToCloud, fetchAllFromCloud } =
  await import('@/lib/sync')
const { db } = await import('@/lib/db')

// Import target store (after mocks and global stubs are ready)
import { useSyncStore, __resetSyncState } from '../syncStore'

describe('useSyncStore.doAutoSync', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    __resetSyncState()
    lsMock.clear()

    // Reset store to known initial state
    useSyncStore.setState({
      status: 'idle',
      lastSyncTime: null,
      lastError: null,
      deps: null,
    })
    useSyncStore.getState().setDeps({
      getUser: () => ({ id: 'user-1' }),
      refreshProjects: vi.fn(),
    })

    // Default mocks: everything succeeds
    vi.mocked(syncProjectToCloud).mockReset().mockResolvedValue(undefined)
    vi.mocked(syncMindmapToCloud).mockReset().mockResolvedValue(undefined)
    vi.mocked(syncTaskToCloud).mockReset().mockResolvedValue(undefined)
    vi.mocked(fetchAllFromCloud).mockReset().mockResolvedValue({
      projects: [],
      mindmaps: [],
      tasks: [],
    })
    vi.mocked(db.projects.toArray).mockReset().mockResolvedValue([])
    vi.mocked(db.mindmaps.toArray).mockReset().mockResolvedValue([])
    vi.mocked(db.tasks.toArray).mockReset().mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // --------------------------------------------------
  // Bug 2 regression: push errors must surface as error status
  // --------------------------------------------------
  it('should set status to error when push has failures', async () => {
    const tasks = [
      { id: 't1', title: '用户调研', project_id: 'p1', node_uid: 'n1', status: 'todo', priority: 'high', sort_order: 0 },
      { id: 't2', title: '数据监控', project_id: 'p1', node_uid: 'n2', status: 'todo', priority: 'medium', sort_order: 1 },
      { id: 't3', title: '后端开发', project_id: 'p1', node_uid: 'n3', status: 'in_progress', priority: 'high', sort_order: 2 },
      { id: 't4', title: '前端开发', project_id: 'p1', node_uid: 'n4', status: 'todo', priority: 'medium', sort_order: 3 },
    ]
    vi.mocked(db.tasks.toArray).mockResolvedValue(tasks as any)
    vi.mocked(syncTaskToCloud).mockRejectedValue(
      new Error("Could not find the 'attachments' column of 'tasks' in the schema cache")
    )
    vi.mocked(db.projects.toArray).mockResolvedValue([])
    vi.mocked(db.mindmaps.toArray).mockResolvedValue([])

    useSyncStore.getState().doAutoSync()
    await vi.advanceTimersByTimeAsync(500)

    const state = useSyncStore.getState()
    expect(state.status).toBe('error')
    expect(state.lastError).toContain('云端同步失败')
    expect(state.lastError).toContain('共 4 项失败')
    // Pull should still have been attempted despite push failures
    expect(fetchAllFromCloud).toHaveBeenCalledTimes(1)
  })

  it('should set status to idle when everything succeeds', async () => {
    useSyncStore.getState().doAutoSync()
    await vi.advanceTimersByTimeAsync(500)

    const state = useSyncStore.getState()
    expect(state.status).toBe('idle')
    expect(state.lastError).toBeNull()
    expect(state.lastSyncTime).not.toBeNull()
  })

  it('should skip sync when offline', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      writable: true,
      configurable: true,
    })

    useSyncStore.getState().doAutoSync()
    await vi.advanceTimersByTimeAsync(500)

    const state = useSyncStore.getState()
    expect(state.status).toBe('offline')
  })
})
