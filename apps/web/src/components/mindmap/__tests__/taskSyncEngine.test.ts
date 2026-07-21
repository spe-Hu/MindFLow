import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock must be declared before any imports (hoisted by vitest)
// Use a variable inside vi.mock factory — no top-level references allowed
vi.mock('@/lib/taskTreeSync', () => ({
  syncTasksFromTree: vi.fn().mockResolvedValue(undefined),
}))

// Import after mock setup
const { syncTasksFromTree: mockSyncTasksFromTree } = await import('@/lib/taskTreeSync')
import { scheduleTasksSync, __resetTaskSyncState } from '../taskSyncEngine'

describe('taskSyncEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(mockSyncTasksFromTree).mockClear()
    __resetTaskSyncState()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should debounce rapid calls and only sync the latest tree data', async () => {
    const data1 = { data: { text: 'first' } }
    const data2 = { data: { text: 'second' } }

    scheduleTasksSync('project-A', data1)
    scheduleTasksSync('project-A', data2)

    expect(mockSyncTasksFromTree).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(100)

    expect(mockSyncTasksFromTree).toHaveBeenCalledTimes(1)
    expect(mockSyncTasksFromTree).toHaveBeenCalledWith('project-A', data2)
  })

  it('should handle independent debouncing per project', async () => {
    const dataA = { data: { text: 'project A' } }
    const dataB = { data: { text: 'project B' } }

    scheduleTasksSync('project-A', dataA)
    scheduleTasksSync('project-B', dataB)

    await vi.advanceTimersByTimeAsync(100)

    expect(mockSyncTasksFromTree).toHaveBeenCalledTimes(2)
    expect(mockSyncTasksFromTree).toHaveBeenCalledWith('project-A', dataA)
    expect(mockSyncTasksFromTree).toHaveBeenCalledWith('project-B', dataB)
  })

  it('should queue a trailing sync while an existing sync is running', async () => {
    let resolveSync!: () => void
    const syncPromise = new Promise<void>((resolve) => { resolveSync = resolve })
    vi.mocked(mockSyncTasksFromTree).mockImplementationOnce(() => syncPromise)

    const data1 = { data: { text: 'first' } }
    const data2 = { data: { text: 'second' } }

    scheduleTasksSync('project-A', data1)
    await vi.advanceTimersByTimeAsync(100)
    expect(mockSyncTasksFromTree).toHaveBeenCalledTimes(1)

    // While first sync is still running, queue a second sync
    scheduleTasksSync('project-A', data2)
    await vi.advanceTimersByTimeAsync(100)
    expect(mockSyncTasksFromTree).toHaveBeenCalledTimes(1)

    resolveSync!()
    await vi.advanceTimersByTimeAsync(100)

    expect(mockSyncTasksFromTree).toHaveBeenCalledTimes(2)
    expect(mockSyncTasksFromTree).toHaveBeenNthCalledWith(2, 'project-A', data2)
  })

  it('should allow multiple rapid trailing syncs to coalesce', async () => {
    let resolveSync!: () => void
    const syncPromise = new Promise<void>((resolve) => { resolveSync = resolve })
    vi.mocked(mockSyncTasksFromTree).mockImplementationOnce(() => syncPromise)

    const data1 = { data: { text: 'first' } }
    const data2 = { data: { text: 'second' } }
    const data3 = { data: { text: 'third' } }

    scheduleTasksSync('project-A', data1)
    await vi.advanceTimersByTimeAsync(100)

    scheduleTasksSync('project-A', data2)
    scheduleTasksSync('project-A', data3)
    await vi.advanceTimersByTimeAsync(100)
    expect(mockSyncTasksFromTree).toHaveBeenCalledTimes(1)

    resolveSync!()
    await vi.advanceTimersByTimeAsync(200)

    expect(mockSyncTasksFromTree).toHaveBeenCalledTimes(2)
    expect(mockSyncTasksFromTree).toHaveBeenNthCalledWith(2, 'project-A', data3)
  })
})
