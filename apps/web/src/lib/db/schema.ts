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
}

export interface LocalMindmap {
  id: string
  project_id: string
  tree_data: Record<string, unknown>
  view_state: Record<string, unknown>
  version: number
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
}

export interface LocalSetting {
  key: string
  value: unknown
}

class MindFlowDB extends Dexie {
  projects!: Table<LocalProject, string>
  mindmaps!: Table<LocalMindmap, string>
  tasks!: Table<LocalTask, string>
  settings!: Table<LocalSetting, string>

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
  }
}

export const db = new MindFlowDB()

// Expose for E2E automation (dev only)
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__mindflowDb = db
}
