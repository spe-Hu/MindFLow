/**
 * Offline Queue — 离线变更队列
 *
 * 当检测到离线状态时，所有原本要发往 Supabase 的写操作
 * 被记录到 IndexedDB `pending_changes` 表中。
 * 联网恢复后，由 sync.ts 按 FIFO 顺序批量回放。
 */

import { db } from '@/lib/db'
import { devWarn } from '@/lib/devConsole'
import { v4 as uuidv4 } from 'uuid'

/** 队列条目 */
export interface PendingChange {
  id: string
  table: 'projects' | 'mindmaps' | 'tasks'
  record_id: string
  action: 'upsert' | 'delete'
  payload: Record<string, unknown>
  created_at: Date
  retry_count: number
  error?: string
}

const MAX_RETRIES = 5

/** 检测当前是否在线 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

/**
 * 将一次变更加入离线队列。
 * 如果当前在线，返回 false（调用方应直接走云端）。
 */
export async function enqueueChange(
  table: PendingChange['table'],
  recordId: string,
  action: PendingChange['action'],
  payload: Record<string, unknown>,
): Promise<boolean> {
  if (isOnline()) return false

  const change: PendingChange = {
    id: uuidv4(),
    table,
    record_id: recordId,
    action,
    payload,
    created_at: new Date(),
    retry_count: 0,
  }

  try {
    await db.pending_changes.put(change)
    return true
  } catch (e) {
    devWarn('[OfflineQueue] Failed to enqueue:', e)
    return false
  }
}

/** 获取队列中待处理的变更数量 */
export async function getPendingCount(): Promise<number> {
  return db.pending_changes.count()
}

/** 获取所有待处理的变更，按 created_at 升序 */
export async function getPendingChanges(): Promise<PendingChange[]> {
  return db.pending_changes.orderBy('created_at').toArray()
}

/** 删除已处理或超重的变更 */
export async function removeChange(id: string): Promise<void> {
  await db.pending_changes.delete(id)
}

/** 标记变更失败（增加重试计数，记录错误） */
export async function markChangeFailed(
  id: string,
  error: string,
): Promise<void> {
  const change = await db.pending_changes.get(id)
  if (!change) return

  if (change.retry_count + 1 >= MAX_RETRIES) {
    // 超过最大重试次数，移动到 dead letter 或直接删除
    devWarn(`[OfflineQueue] Change ${id} exceeded max retries, dropping`)
    await db.pending_changes.delete(id)
  } else {
    await db.pending_changes.update(id, {
      retry_count: change.retry_count + 1,
      error,
    })
  }
}

/** 清空所有队列（登录成功调用迁移时使用） */
export async function clearAllPending(): Promise<void> {
  await db.pending_changes.clear()
}

/** 直接插入 pending_change（内部使用，不检查在线状态） */
export async function dbInsertPendingChange(
  table: PendingChange['table'],
  recordId: string,
  action: PendingChange['action'],
  payload: Record<string, unknown>,
): Promise<void> {
  const change: PendingChange = {
    id: uuidv4(),
    table,
    record_id: recordId,
    action,
    payload,
    created_at: new Date(),
    retry_count: 0,
  }
  await db.pending_changes.put(change)
}
