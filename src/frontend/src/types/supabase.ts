// ============================================
// MindFlow v1.1 — Supabase Database Types
// ============================================
// 生成日期：2026-07-03
// 用途：前端 TypeScript 类型定义，兼容 supabase-js 类型生成
// 作者：高见远（架构师）
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// --------------------------------------------
// 枚举类型（业务约定）
// --------------------------------------------

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type MindmapLayout =
  | 'logicalStructure'
  | 'mindMap'
  | 'fishbone'
  | 'rightLogic'
  | 'organizationStructure'
  | 'catalogOrganization'

// --------------------------------------------
// Database 类型定义
// --------------------------------------------

export interface Database {
  public: {
    Tables: {
      // ---------- users (auth.users 扩展) ----------
      users: {
        Row: {
          id: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ---------- projects (项目表) ----------
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          icon: string
          description: string | null
          sort_order: number
          is_archived: boolean
          version: number
          last_opened_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          icon?: string
          description?: string | null
          sort_order?: number
          is_archived?: boolean
          version?: number
          last_opened_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          icon?: string
          description?: string | null
          sort_order?: number
          is_archived?: boolean
          version?: number
          last_opened_at?: string
          created_at?: string
          updated_at?: string
        }
      }

      // ---------- mindmaps (思维导图表) ----------
      mindmaps: {
        Row: {
          id: string
          project_id: string
          user_id: string
          title: string
          root_node_id: string
          layout: string
          theme: Json
          tree_data: Json
          view_state: Json
          version: number
          last_sync_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          title: string
          root_node_id: string
          layout?: string
          theme?: Json
          tree_data: Json
          view_state?: Json
          version?: number
          last_sync_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          title?: string
          root_node_id?: string
          layout?: string
          theme?: Json
          tree_data?: Json
          view_state?: Json
          version?: number
          last_sync_at?: string
          created_at?: string
          updated_at?: string
        }
      }

      // ---------- mindmap_nodes (节点扁平化表) ----------
      mindmap_nodes: {
        Row: {
          id: string
          project_id: string
          mindmap_id: string
          uid: string
          parent_uid: string | null
          text: string
          data: Json
          depth: number
          sort_order: number
          is_task: boolean
          task_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          mindmap_id: string
          uid: string
          parent_uid?: string | null
          text: string
          data?: Json
          depth: number
          sort_order?: number
          is_task?: boolean
          task_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          mindmap_id?: string
          uid?: string
          parent_uid?: string | null
          text?: string
          data?: Json
          depth?: number
          sort_order?: number
          is_task?: boolean
          task_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ---------- tasks (任务表) ----------
      tasks: {
        Row: {
          id: string
          user_id: string
          project_id: string
          mindmap_id: string
          node_uid: string
          title: string
          status: TaskStatus
          priority: TaskPriority
          due_date: string | null
          completed_at: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          mindmap_id: string
          node_uid: string
          title: string
          status?: TaskStatus
          priority?: TaskPriority
          due_date?: string | null
          completed_at?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          mindmap_id?: string
          node_uid?: string
          title?: string
          status?: TaskStatus
          priority?: TaskPriority
          due_date?: string | null
          completed_at?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }

      // ---------- tags (标签表) ----------
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          created_at?: string
        }
      }

      // ---------- project_tags (项目-标签关联) ----------
      project_tags: {
        Row: {
          id: string
          project_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          tag_id?: string
          created_at?: string
        }
      }

      // ---------- task_tags (任务-标签关联) ----------
      task_tags: {
        Row: {
          id: string
          task_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          tag_id?: string
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
  }
}

// --------------------------------------------
// 便捷类型别名（供前端直接使用）
// --------------------------------------------

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type Mindmap = Database['public']['Tables']['mindmaps']['Row']
export type MindmapInsert = Database['public']['Tables']['mindmaps']['Insert']
export type MindmapUpdate = Database['public']['Tables']['mindmaps']['Update']

export type MindmapNode = Database['public']['Tables']['mindmap_nodes']['Row']
export type MindmapNodeInsert = Database['public']['Tables']['mindmap_nodes']['Insert']
export type MindmapNodeUpdate = Database['public']['Tables']['mindmap_nodes']['Update']

export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export type Tag = Database['public']['Tables']['tags']['Row']
export type TagInsert = Database['public']['Tables']['tags']['Insert']
export type TagUpdate = Database['public']['Tables']['tags']['Update']

export type ProjectTag = Database['public']['Tables']['project_tags']['Row']
export type ProjectTagInsert = Database['public']['Tables']['project_tags']['Insert']

export type TaskTag = Database['public']['Tables']['task_tags']['Row']
export type TaskTagInsert = Database['public']['Tables']['task_tags']['Insert']
