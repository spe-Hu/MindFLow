# 数据模型

MindFlow 同时持有两层数据：浏览器 IndexedDB（Dexie 封装）和 Supabase Postgres。两者 schema 对齐，通过 `lib/sync.ts` 的上行/下行函数互相同步。

## 命名约定

- 本地接口统一加 `Local` 前缀（`LocalProject` / `LocalMindmap` / `LocalTask`）— 在 `apps/web/src/lib/db.ts` 定义。
- 云端表直接用 Supabase 类型（Row / Insert / Update）— 在 `apps/web/src/types/supabase.ts` 定义。
- Migration 文件使用 `NNN_description.sql` 编号，每次 schema 调整追加一个迁移。

## 本地层：Dexie (IndexedDB)

数据库名 `mindflow-db`，当前 schema 版本 = 2（`db.ts#MindFlowDB`）：

```ts
this.version(1).stores({
  projects:  'id, name, color, sort_order, is_archived',
  mindmaps:  'id, project_id',
  tasks:     'id, project_id, node_uid, title, status, priority, due_date',
  settings:  'key',
})
this.version(2).stores({
  projects:  'id, name, color, sort_order, is_archived, last_opened_at',
  ...        // 其余不变
})
```

### 表 1：projects

| 字段 | 类型 | 含义 |
|------|------|------|
| `id` | string | 主键，例：`1700000000000-abc1234` |
| `name` | string | 显示名称（与导图根节点 `text` 双向同步） |
| `color` | enum: `indigo / teal / amber / rose / emerald / violet` | Sidebar 头部色条 |
| `sort_order` | int | Sidebar 拖拽排序位置 |
| `is_archived` | boolean | 归档状态（`Settings → 存储` 内可恢复） |
| `version` | int | 单调递增，用于乐观并发 |
| `last_opened_at` | Date | 最近一次 `setActiveProject` 时间，用作"最近项目"分组依据 |
| `user_id` | uuid \| undefined | 登录时由 `sync.ts#syncProjectToCloud` 注入 |

### 表 2：mindmaps

每个项目最多一张导图（强 1:1，由 `ProjectMindMapPage` 保证）。

| 字段 | 类型 | 含义 |
|------|------|------|
| `id` | string | 主键 |
| `project_id` | string（索引） | 外键 |
| `tree_data` | object | simple-mind-map 标准结构：`{ data: { text, uid, ... }, children: [...] }`，根节点 `uid='root'` |
| `view_state` | object | `layout`（`logicalStructure/mindMap/organizationStructure/...`）+ 缩放/选中节点等 |
| `version` | int | 每次 `data_change` +1 |

> 节点的字段扩展（如 `_isTask`, `_status`, `_priority`, `_dueDate`, `_completedAt`, 颜色）都以 `data` 子对象下划线前缀存储。`syncTasksFromTree` 只读这些字段重建 `tasks` 表。

### 表 3：tasks

| 字段 | 类型 | 含义 |
|------|------|------|
| `id` | string | 主键 = `${project_id}-${node_uid}` |
| `project_id` | string | 索引字段 |
| `node_uid` | string | 同项目内对应导图节点 uid |
| `title` | string | 任务标题（与节点 text 同步） |
| `status` | enum | `todo / in_progress / done / cancelled` |
| `priority` | enum | `low / medium / high / urgent` |
| `due_date` | Date? | 可选截止日 |
| `start_date`, `duration_days` | 用于甘特图排期 | `CalendarPage` / `GanttPage` 读取 |
| `completed_at` | Date? | 状态置为 `done` 时填充 |
| `sort_order` | int | 列表展示用 |
| `pomodoro_count` | number | 番茄钟计数，节点完成时 `updateTaskWithMindmapSync` 内 +1 |
| `attachments` | `AttachmentItem[]` | 由 `lib/attachments.ts` 上传到 Supabase Storage |

### 表 4：settings

键值对，`db.settings.where('key').anyOf(...).toArray()` 是 AI 配置（`lib/aiMindMap.ts`）的事实来源：

- `ai-enabled`, `ai-api-key`, `ai-base-url`, `ai-model`, `ai-prefer-api`

### 完整性工具

`db.ts` 暴露两个诊断函数：

- `getStorageStats()` → `StorageStats`：项目/任务/节点数与估算占用体积，供 Settings → Storage 显示。
- `runHealthCheck()` → `HealthIssue[]`：扫 4 类问题（缺失导图、孤立任务、空项目、`uid` 重复），并通过 `fixHealthIssues` 移除孤立任务。

`cleanupOrphanedTasks()` 在每次 `AppLayout` mount 时异步调用一次（不阻塞）。

## 云端层：Supabase Postgres

`supabase/migrations/` 6 个迁移按版本递进：

| 编号 | 文件 | 作用 |
|------|------|------|
| 001 | `001_initial_schema.sql` | 业务表：`users` / `projects` / `mindmaps` / `mindmap_nodes` / `tasks` / `tags` / `project_tags` / `task_tags` + RLS |
| 002 | `002_alter_uuid_to_text.sql` | 把 `projects.id` 等业务主键由 `uuid` 改 `text`，让本地 string ID 一对一映射 |
| 003 | `003_sort_order_bigint.sql` | `sort_order` 升 `bigint`，避免 `int` 越界 |
| 004 | `004_add_task_columns.sql` | 增加 `pomodoro_count`，修复 sync 报错 |
| 005 | `005_add_shared_links.sql` | 增加 `shared_links` 表 + 公共读取 RLS |
| 006 | `006_add_attachments.sql` | 新增 `tasks.attachments` JSONB + `mindflow-attachments` Storage bucket + Storage RLS |

### 主要表（精简自迁移文件）

**projects** — `id text pk`, `user_id uuid fk users`, `name`, `color`, `icon`, `sort_order int`, `is_archived bool`, `version int`, `last_opened_at timestamptz`, `updated_at` 触发器自动维护。

**mindmaps** — `id text pk`, `project_id text unique fk projects`（强制 1:1）, `user_id uuid fk users`, `tree_data jsonb`, `view_state jsonb`, `version int`.

**tasks** — `id text pk`, `user_id uuid`, `project_id text`, `mindmap_id text`, `node_uid varchar(64)`, `title`, `status`, `priority`, `due_date date`, `pomodoro_count int`, `attachments jsonb`, 唯一索引 `(project_id, node_uid)` 保证节点—任务 1:1。

**mindmap_nodes**（同步用，目前主要在云端，前端尚未直接读写）— 扁平表：`id, project_id, mindmap_id, uid, parent_uid, text, data jsonb, depth, sort_order, is_task bool, task_id text`。

**shared_links** — `token text uniq, snapshot jsonb, created_by uuid fk auth.users, expires_at`, RLS：任何人都能 SELECT（按 token 拉），只有创建者能 DELETE。

### 枚举与类型 (`types/supabase.ts`)

```ts
TaskStatus   = 'todo' | 'in_progress' | 'done' | 'cancelled'
TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
MindmapLayout = 'logicalStructure' | 'mindMap' | 'fishbone'
              | 'rightLogic' | 'organizationStructure' | 'catalogOrganization'
```

`Database.public.Tables` 同时给出 `Row | Insert | Update` 三态，可被 `supabase.from('x').upsert(payload as Insert)` 强类型校验。

## 节点 ⇄ 任务桥（核心映射规则）

写入链路有两条：

1. **导图 → 任务** (`db.ts#syncTasksFromTree`)：遍历 `tree_data`，对每个 `data._isTask === true` 且 `text` 非空的节点生成 `LocalTask`，先 `bulkDelete(project_id)` 再 `bulkPut`。`pomodoro_count` 通过旧任务 uid map 保留以防计数被重置。
2. **任务 → 导图** (`db.ts#updateTaskWithMindmapSync`)：当 UI 改 status/priority 时，`structuredClone(tree_data)` 后递归定位对应节点，写回 `data._status/_priority/_completedAt`，并按 `done` 状态刷色（蓝底/绿底）。`mindmap.version + 1` 触发云端推送。

同步触发点（`stores/syncStore.ts`）：

| 触发时机 | 行为 |
|---------|------|
| 应用启动 2s 后（`AppLayout`） | `scheduleAutoSync()`（push 全量 → pull 全量） |
| `document.visibilitychange = 'visible'` | 同上 |
| `window 'online'` 事件 | 同上，并显示"网络已恢复" toast |
| 手动 Settings → 云端同步 | 调用同一 `doAutoSync` |
| 任何写操作（`upsertProject/upsertTask/syncMindmapToCloud`） | 立即单条 push（30s 节流内被去重） |

`MIN_SYNC_INTERVAL_MS = 30_000` 防止焦点抖动引发风暴；最近一次同步时间持久化在 `localStorage.mindflow-last-sync-time`。

## 登录过渡

`SyncMigrationDialog` 在 `isAuthenticated` 假→真跳变时打开，提示「上传本地数据」或「从云端恢复」，确保用户进站即做出同步决策，本地与云端内容不会长期分裂。

## 公共分享（Snapshot 模式）

`shared_links.snapshot` 是分享时点的全量快照：

```ts
interface ShareSnapshot {
  projectName: string
  treeData:    Record<string, unknown>
  layout:      string
  createdAt:   string
}
```

`SharePage` 用 `simple-mind-map` 的 `readonly: true` 模式渲染快照，不要求登录。后端可在 `expires_at` 之后失效（迁移预留字段）。
