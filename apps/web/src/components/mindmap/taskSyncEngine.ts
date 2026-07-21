import { syncTasksFromTree } from '@/lib/taskTreeSync'
import { devWarn } from '@/lib/devConsole'

/**
 * Task Sync Engine — 纯逻辑模块
 *
 * 将 mindmap tree data 同步到本地 IndexedDB tasks 表。
 * 核心行为（与原 MindMapCanvas.tsx  lines 67~104 一致）：
 * - 防抖 80ms：快速 data_change 只触发一次 sync
 * - 互斥锁：同一 projectId 串行执行，避免并发覆盖
 * - 尾随（trailing）：sync 期间有新数据到达，完成后自动补一次
 */

interface SyncState {
  latestData: Record<string, unknown>
  timer: ReturnType<typeof setTimeout> | null
}

const taskSyncState = new Map<string, SyncState>()
const taskSyncRunning = new Set<string>()

const DEBOUNCE_MS = 80

export function scheduleTasksSync(
  projectId: string,
  treeData: Record<string, unknown>
): void {
  let state = taskSyncState.get(projectId)
  if (!state) {
    state = { latestData: treeData, timer: null }
    taskSyncState.set(projectId, state)
  } else {
    state.latestData = treeData
    if (state.timer) clearTimeout(state.timer)
  }

  state.timer = setTimeout(async () => {
    state!.timer = null
    // 如果上一次同步还在跑，把最新数据再排一次（尾随）
    if (taskSyncRunning.has(projectId)) {
      scheduleTasksSync(projectId, state!.latestData)
      return
    }
    taskSyncRunning.add(projectId)
    try {
      await syncTasksFromTree(projectId, state!.latestData)
    } catch (e) {
      devWarn('[taskSyncEngine] syncTasksFromTree failed:', e)
    } finally {
      taskSyncRunning.delete(projectId)
      // 如果期间又有新的更新，补一次
      if (state!.latestData !== treeData) {
        scheduleTasksSync(projectId, state!.latestData)
      }
    }
  }, DEBOUNCE_MS)
}

/** 重置状态（仅用于测试清理） */
export function __resetTaskSyncState(): void {
  for (const [, s] of taskSyncState) {
    if (s.timer) clearTimeout(s.timer)
  }
  taskSyncState.clear()
  taskSyncRunning.clear()
}
