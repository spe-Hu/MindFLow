// ============================================================
// cloudSync.ts — Supabase 网络层封装
// 职责：所有 Supabase API 调用、字段白名单过滤、分页、错误分类
// ============================================================

import { supabase } from '@/lib/supabase'
import { devLog, devWarn } from '@/lib/devConsole'

// ---- Table → 云端已知字段白名单（替换 sync.ts 中的 hack fallback）----
interface FieldWhitelist {
  [table: string]: Set<string>
}

export const CLOUD_FIELD_WHITELIST: FieldWhitelist = {
  projects: new Set([
    'id', 'user_id', 'name', 'color', 'icon', 'sort_order',
    'is_archived', 'version', 'last_opened_at', 'updated_at',
  ]),
  mindmaps: new Set([
    'id', 'project_id', 'user_id', 'title', 'root_node_id',
    'tree_data', 'view_state', 'version', 'last_sync_at', 'updated_at',
  ]),
  tasks: new Set([
    'id', 'user_id', 'project_id', 'mindmap_id', 'title', 'status',
    'node_uid', 'priority', 'due_date', 'completed_at', 'sort_order',
    'updated_at', 'pomodoro_count', 'attachments',
  ]),
}

// ---- 错误类型分类 ----
export type CloudErrorType =
  | 'SCHEMA_MISMATCH'
  | 'NETWORK'
  | 'AUTH'
  | 'CONFLICT'
  | 'RATE_LIMIT'
  | 'FK_CONSTRAINT'
  | 'UNKNOWN'

export interface CloudError {
  type: CloudErrorType
  message: string
  retryable: boolean
  retryAfterMs?: number
  original?: unknown
}

function classifyError(err: any): CloudError {
  const msg = String(err?.message ?? err)
  const code = err?.code

  // 认证
  if (code === 'PGRST301' || /JWT|auth|unauthorized/i.test(msg)) {
    return { type: 'AUTH', message: msg, retryable: false, original: err }
  }

  // 限流
  if (code === '429' || /rate.limi|too many/i.test(msg)) {
    return { type: 'RATE_LIMIT', message: msg, retryable: true, retryAfterMs: 2000, original: err }
  }

  // 外键约束（NOT NULL / CHECK / UNIQUE 等约束的 "violates" 不要误匹配）
  if (/foreign\s*key|violates\s*foreign|fkey/i.test(msg)) {
    return { type: 'FK_CONSTRAINT', message: msg, retryable: false, original: err }
  }

  // Schema / 字段不存在（PostgREST 代码区分）
  if (code === 'PGRST204' || /column.*does not exist|unknown field|schema cache/i.test(msg)) {
    return { type: 'SCHEMA_MISMATCH', message: msg, retryable: true, original: err }
  }

  // 网络
  if (!navigator.onLine || /network|fetch|ECONNREFUSED|timeout/i.test(msg)) {
    return { type: 'NETWORK', message: msg, retryable: true, original: err }
  }

  return { type: 'UNKNOWN', message: msg, retryable: false, original: err }
}

// ---- 字段白名单过滤 ----
export function whitelistFields<T extends Record<string, any>>(
  record: T,
  table: string
): Record<string, any> {
  const allowed = CLOUD_FIELD_WHITELIST[table]
  if (!allowed) {
    devWarn(`[cloudSync] No whitelist for table "${table}", passing all fields`)
    return { ...record }
  }
  const out: Record<string, any> = {}
  for (const key of Object.keys(record)) {
    if (allowed.has(key)) out[key] = record[key]
  }
  return out
}

// ---- 工具：从表中移除已知不存在的字段并重试 ----
export function filterFieldsByError<T extends Record<string, any>>(
  record: T,
  errorMsg: string
): T | null {
  // 匹配多种 PostgREST / Postgres 错误格式：
  // 1. "column X does not exist"
  // 2. "unknown field X"
  // 3. "Could not find the 'X' column of 'table' in the schema cache" (PostgREST schema cache)
  const patterns = [
    /column\s+"?([^"\s]+)"?\s+does not exist/i,
    /unknown field\s+"?([^"\s]+)/i,
    /Could not find the ['"]([^'"]+)['"] column/i,
  ]
  let badField: string | null = null
  for (const pattern of patterns) {
    const match = errorMsg.match(pattern)
    if (match?.[1]) {
      badField = match[1]
      break
    }
  }
  if (!badField) return null

  const filtered = { ...record }
  delete (filtered as any)[badField]
  devLog(`[cloudSync] Removing unknown field "${badField}" and retrying`)
  return filtered
}

// ---- 分页拉取 ----
interface FetchAllOptions {
  table: string
  userId: string
  pageSize?: number
  orderBy?: string
}

export async function fetchAllFromCloud(
  opts: FetchAllOptions
): Promise<{ records: any[]; error?: CloudError }> {
  const { table, userId, pageSize = 500 } = opts
  const all: any[] = []
  let page = 0

  while (true) {
    const from = page * pageSize
    const to = from + pageSize - 1

    if (!navigator.onLine) {
      return { records: [], error: { type: 'NETWORK', message: 'Offline', retryable: true } }
    }

    const { data, error } = await (supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(from, to) as any)

    if (error) {
      return { records: [], error: classifyError(error) }
    }

    const batch = data ?? []
    all.push(...batch)

    if (batch.length < pageSize) break
    page++
  }

  return { records: all }
}

// ---- Upsert（含白名单 + fallback） ----
interface UpsertOptions {
  table: string
  record: Record<string, any>
  onConflict?: string
}

export async function upsertToCloud(
  opts: UpsertOptions
): Promise<{ error?: CloudError }> {
  const { table, record, onConflict = 'id' } = opts
  const userId = record.user_id
  if (!userId) {
    return { error: { type: 'AUTH', message: 'Missing user_id', retryable: false } }
  }

  if (!navigator.onLine) {
    return { error: { type: 'NETWORK', message: 'Offline', retryable: true } }
  }

  let payload = whitelistFields(record, table)

  const doUpsert = async (data: any) => {
    return (supabase.from(table).upsert(data, { onConflict }) as any)
  }

  // Try 1: 白名单后的 payload
  let currentPayload = payload
  let { error: currentErr } = await doUpsert(currentPayload)
  if (!currentErr) return {}

  let currentCloudErr = classifyError(currentErr)

  // 循环处理多个未知字段（schema drift 时常见）
  while (currentCloudErr.type === 'SCHEMA_MISMATCH') {
    const filtered = filterFieldsByError(currentPayload, currentCloudErr.message)
    if (!filtered) break
    devLog(`[cloudSync] Removing unknown field, retrying...`)
    const { error: retryErr } = await doUpsert(filtered)
    if (!retryErr) {
      devLog(`[cloudSync] Upsert succeeded after removing unknown field(s)`)
      return {}
    }
    currentPayload = filtered
    currentCloudErr = classifyError(retryErr)
  }

  if (currentCloudErr.type === 'FK_CONSTRAINT') {
    devWarn(`[cloudSync] FK constraint for ${table}:`, currentCloudErr.message)
    return { error: currentCloudErr }
  }

  return { error: currentCloudErr }
}

// ---- Delete ----
export async function deleteFromCloud(
  table: string,
  id: string
): Promise<{ error?: CloudError }> {
  if (!navigator.onLine) {
    return { error: { type: 'NETWORK', message: 'Offline', retryable: true } }
  }
  const { error } = await (supabase.from(table).delete().eq('id', id) as any)
  if (error) return { error: classifyError(error) }
  return {}
}

// ---- 批量 upsert（用于初始迁移 / 全量 push） ----
export async function batchUpsertToCloud(
  table: string,
  records: Record<string, any>[],
  onConflict = 'id'
): Promise<{ pushed: number; failed: Array<{ id: string; error: CloudError }> }> {
  const failed: Array<{ id: string; error: CloudError }> = []
  let pushed = 0

  for (const record of records) {
    const { error } = await upsertToCloud({ table, record, onConflict })
    if (error) {
      failed.push({ id: record.id ?? 'unknown', error })
    } else {
      pushed++
    }
  }

  return { pushed, failed }
}

// ---- Realtime 订阅 ----
export type RealtimeChangeType = 'INSERT' | 'UPDATE' | 'DELETE'

export interface RealtimeChangeEvent {
  table: string
  type: RealtimeChangeType
  record: any
  oldRecord?: any
}

export function subscribeToChanges(
  userId: string,
  tables: string[],
  onChange: (event: RealtimeChangeEvent) => void
): () => void {
  const channel = supabase.channel('db-changes')

  for (const table of tables) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
      (payload: any) => {
        onChange({
          table,
          type: payload.eventType as RealtimeChangeType,
          record: payload.new,
          oldRecord: payload.old,
        })
      }
    )
  }

  channel.subscribe((status: any) => {
    devLog('[cloudSync] Realtime subscription status:', status)
  })

  return () => {
    supabase.removeChannel(channel)
  }
}

// ---- Incremental Sync via change_log ----

export interface ChangeLogEntry {
  id: string
  user_id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: Record<string, unknown>
  created_at: string
}

/**
 * 查询自给定时间以来的 change_log 增量记录
 * @param userId 用户 ID
 * @param since 上次同步时间（ISO 8601）
 * @returns 变更记录列表（按 created_at 升序）
 */
export async function fetchChangeLog(
  userId: string,
  since: string,
): Promise<{ data: ChangeLogEntry[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('change_log')
    .select('*')
    .eq('user_id', userId)
    .gt('created_at', since)
    .order('created_at', { ascending: true })

  if (error) {
    devWarn('[cloudSync] fetchChangeLog error:', error)
    return { data: null, error: new Error(error.message) }
  }

  return { data: data as ChangeLogEntry[], error: null }
}

/**
 * 获取最近一次 sync 的 checkpoint（用户级）
 */
export async function getLastSyncCheckpoint(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'last_sync_checkpoint')
    .single()

  if (error || !data) return null
  return data.value as string
}

/**
 * 保存 sync checkpoint（用户级）
 */
export async function setLastSyncCheckpoint(
  userId: string,
  checkpoint: string,
): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .upsert(
      { user_id: userId, key: 'last_sync_checkpoint', value: checkpoint },
      { onConflict: 'user_id,key' },
    )

  if (error) {
    devWarn('[cloudSync] setLastSyncCheckpoint error:', error)
  }
}
