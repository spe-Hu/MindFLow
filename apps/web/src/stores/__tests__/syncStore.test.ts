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
  doAutoSync: vi.fn(),
  pullFromCloud: vi.fn(),
  pushDirtyRecords: vi.fn(),
  subscribeToRealtime: vi.fn(),
  unsubscribeFromRealtime: vi.fn(),
}))

// Import mocked modules dynamically to get the mock handles
const { doAutoSync: _doAutoSyncMock } = await import('@/lib/sync')

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

    // Default mock: everything succeeds
    vi.mocked(_doAutoSyncMock).mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // --------------------------------------------------
  // Bug 10 regression: doAutoSync errors must surface as error status
  // --------------------------------------------------
  it('should set status to error when doAutoSync throws', async () => {
    vi.mocked(_doAutoSyncMock).mockRejectedValue(
      new Error('Push failed: task t1: schema mismatch; task t2: schema mismatch')
    )

    useSyncStore.getState().doAutoSync()
    await vi.advanceTimersByTimeAsync(500)

    const state = useSyncStore.getState()
    expect(state.status).toBe('error')
    expect(state.lastError).toContain('Push failed')
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
