import Dexie, { type Table } from 'dexie'

// --------------------------------------------------
// IndexedDB Schema — Dexie.js
// --------------------------------------------------

export interface LocalProject {
  id: string
  name: string
  color: string
  sort_order: number
  is_archived: boolean
  version: number
  last_opened_at?: Date
  user_id?: string
  /** 项目来源类型 */
  project_type: 'cloud' | 'obsidian'
  /** 本地文件相对路径（仅 obsidian 项目） */
  local_path?: string
  /** 关联的本地目录配置 ID（仅 obsidian 项目） */
  local_dir_id?: string
  /** 最后同步时间（仅 obsidian 项目，用于 LWW 冲突判断） */
  last_synced_at?: Date
  /** 本地脏标记：自上次成功 push 后被修改过 */
  _localDirty?: boolean
  /** 内部同步标记：pull 阶段跳过 Dexie hooks 的 auto-dirty 逻辑 */
  __syncPull?: boolean
}

export interface LocalMindmap {
  id: string
  project_id: string
  tree_data: Record<string, unknown>
  view_state: Record<string, unknown>
  version: number
  /** 本地脏标记：自上次成功 push 后被修改过 */
  _localDirty?: boolean
  /** 内部同步标记：pull 阶段跳过 Dexie hooks 的 auto-dirty 逻辑 */
  __syncPull?: boolean
}

export interface AttachmentItem {
  id: string
  name: string
  size: number
  type: string
  url: string
  path: string
  createdAt: string
}

export interface LocalTask {
  id: string
  project_id: string
  node_uid: string
  title: string
  status: 'todo' | 'in_progress' | 'done' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: Date
  start_date?: Date
  duration_days?: number
  completed_at?: Date
  sort_order: number
  user_id?: string
  pomodoro_count?: number
  attachments?: AttachmentItem[]
  /** 本地脏标记：自上次成功 push 后被修改过 */
  _localDirty?: boolean
  /** 内部同步标记：pull 阶段跳过 Dexie hooks 的 auto-dirty 逻辑 */
  __syncPull?: boolean
}

export interface LocalSetting {
  key: string
  value: unknown
}

/** 离线变更队列记录 */
export interface LocalPendingChange {
  id: string
  table: 'projects' | 'mindmaps' | 'tasks'
  record_id: string
  action: 'upsert' | 'delete'
  payload: Record<string, unknown>
  created_at: Date
  retry_count: number
  error?: string
}

class MindFlowDB extends Dexie {
  projects!: Table<LocalProject, string>
  mindmaps!: Table<LocalMindmap, string>
  tasks!: Table<LocalTask, string>
  settings!: Table<LocalSetting, string>
  pending_changes!: Table<LocalPendingChange, string>

  constructor() {
    super('mindflow-db')
    this.version(1).stores({
      projects: 'id, name, color, sort_order, is_archived',
      mindmaps: 'id, project_id',
      tasks: 'id, project_id, node_uid, title, status, priority, due_date',
      settings: 'key',
    })
    this.version(2).stores({
      projects: 'id, name, color, sort_order, is_archived, last_opened_at',
      mindmaps: 'id, project_id',
      tasks: 'id, project_id, node_uid, title, status, priority, due_date',
      settings: 'key',
    })
    this.version(3)
      .stores({
        projects: 'id, project_type, name, sort_order, is_archived, last_opened_at',
        mindmaps: 'id, project_id',
        tasks: 'id, project_id, node_uid, title, status, priority, due_date',
        settings: 'key',
      })
      .upgrade(async (tx) => {
        // Migrate existing projects: default project_type to 'cloud'
        await tx
          .table('projects')
          .toCollection()
          .modify((project) => {
            if (!project.project_type) {
              project.project_type = 'cloud'
            }
          })
      })

    // ---- version 4: 添加 _localDirty 列（无需修改 store 索引） ----
    this.version(4).stores({
      projects: 'id, project_type, name, sort_order, is_archived, last_opened_at',
      mindmaps: 'id, project_id',
      tasks: 'id, project_id, node_uid, title, status, priority, due_date',
      settings: 'key',
    })

    // ---- version 5: 添加 pending_changes 离线队列 ----
    this.version(5).stores({
      projects: 'id, project_type, name, sort_order, is_archived, last_opened_at',
      mindmaps: 'id, project_id',
      tasks: 'id, project_id, node_uid, title, status, priority, due_date',
      settings: 'key',
      pending_changes: 'id, table, record_id, [table+record_id], created_at',
    })

    // ---- 同步中间件：自动设置 dirty flag + version + updated_at ----
    this._setupSyncHooks()
  }

  private _setupSyncHooks() {
    const tables = [this.projects, this.mindmaps, this.tasks] as const
    for (const table of tables) {
      // creating hook: 新记录也标记为 dirty（首次创建后需要 push）
      // 注：pull 同步显式传入 _localDirty = false 时尊重该值，避免误触发 autoPush
      table.hook('creating', function (_primKey, obj) {
        // 同步 pull 标记：检测并跳过 auto-dirty / version / updated_at
        if ((obj as any).__syncPull) {
          delete (obj as any).__syncPull
          return
        }
        if ((obj as any)._localDirty !== false) {
          ;(obj as any)._localDirty = true
        }
        ;(obj as any).version = ((obj as any).version ?? 0) + 1
        const now = new Date().toISOString()
        // 如果该表有 updated_at 字段则更新（tasks/projects/mindmaps 都有）
        if (table.name !== 'settings') {
          ;(obj as any).updated_at = now
        }
      })

      // updating hook: 已有记录被修改时标记 dirty
      table.hook('updating', function (mods, _primKey, _obj) {
        const out = { ...mods }
        // 同步 pull 标记：检测并跳过 auto-dirty / version / updated_at
        if ((out as any).__syncPull) {
          delete (out as any).__syncPull
          return out
        }
        // 如果 mods 里已经有 _localDirty = false（push 成功后 clear），不覆盖
        if (!('_localDirty' in out) || out._localDirty !== false) {
          out._localDirty = true
        }
        // version 递增
        if (!('version' in out)) {
          // 需要读取当前 version（通过 this.obj 访问）
          const current = this.obj as any
          out.version = (current?.version ?? 0) + 1
        }
        // updated_at
        if (table.name !== 'settings') {
          out.updated_at = new Date().toISOString()
        }
        return out
      })
    }
  }
}

export const db = new MindFlowDB()

// Expose for E2E automation (dev only)
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__mindflowDb = db
}
