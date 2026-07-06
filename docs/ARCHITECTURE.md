# 架构文档 - MindFlow v1.1

> MindFlow：融合 XMind 思维导图与滴答清单任务管理的网页版项目推进工具
> 版本：v1.1 MVP（多项目 + 全局任务管理）
> 日期：2026-07-03
> 作者：高见远（架构师）

---

## 1. 技术选型

### 1.1 选型对比矩阵

#### 前端框架

| 方案 | 学习成本 | 生态成熟度 | 部署成本 | 扩展性 | 团队熟悉度 | 总分 |
|------|---------|-----------|---------|--------|----------|------|
| React + Vite | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **25** |
| Vue3 + Vite | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 24 |
| Svelte + Vite | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 17 |

#### 状态管理

| 方案 | 学习成本 | Boilerplate | 调试体验 | TypeScript | 团队熟悉度 | 总分 |
|------|---------|-------------|---------|-----------|----------|------|
| Zustand | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **25** |
| Redux Toolkit | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 20 |
| 原生Context | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 22 |

#### UI 组件库

| 方案 | 可定制性 | 设计质量 | 包体积 | 无障碍 | 生态活跃度 | 总分 |
|------|---------|---------|--------|--------|-----------|------|
| shadcn/ui | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **24** |
| Ant Design | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 19 |
| Headless UI | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 22 |

#### 思维导图集成方案

| 方案 | 集成难度 | 可控性 | 维护成本 | 扩展性 | 总分 |
|------|---------|--------|---------|--------|------|
| npm 引入（推荐） | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **22** |
| iframe 嵌入 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | 14 |
| fork 修改源码 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | 17 |

### 1.2 最终选型

| 领域 | 选型 | 备选 | 选型理由 |
|------|------|------|---------|
| 前端框架 | React 18 + Vite 5 | Vue 3 + Vite | 团队熟悉度高；`simple-mind-map` 是框架无关库，React 封装成熟；shadcn/ui 基于 React 生态 |
| 状态管理 | Zustand | Redux Toolkit | 轻量（<1KB）、TypeScript 友好、API 极简，适合中等复杂度状态 |
| UI 组件库 | shadcn/ui + Tailwind CSS | Ant Design | 源码级控制、无运行时依赖、按需使用、现代设计语言，契合工具类产品调性 |
| 思维导图库 | `simple-mind-map` (npm) | 自研 / fork | 国产活跃开源，MIT 协议，框架无关，功能完备，有源码级扩展能力 |
| 认证服务 | Supabase Auth | Clerk | 与数据库深度集成、免费额度足够、国内访问良好 |
| 数据库 | Supabase PostgreSQL | PlanetScale | 免费 500MB/5GB 出站，实时订阅内置，与 Auth 一体化 |
| 实时同步 | Supabase Realtime | WebSocket 自建 | 原生支持 Broadcast + Postgres Changes，免费 200 并发连接 |
| 文件存储 | Supabase Storage | Cloudflare R2 | 与 Auth & 数据库权限联动，免费 1GB |
| 部署 | Cloudflare Pages | Vercel | 国内访问速度快，原生 SPA fallback，免费无限请求 |
| 本地存储 | IndexedDB (Dexie.js 封装) | localStorage | 结构化存储、大容量（~50MB）、支持按项目分表 |

---

## 2. 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              用户终端                                    │
│                    (浏览器 / 移动端浏览器 / PWA)                          │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                         Cloudflare Pages                          │  │
│  │  静态资源托管 | SPA Fallback | 全球 CDN | Edge Functions (可选)    │  │
│  │                                                                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │  │
│  │  │  React SPA   │  │ shadcn/ui    │  │ Tailwind CSS         │    │  │
│  │  │  + Vite 5    │  │ 组件库       │  │ 原子化样式          │    │  │
│  │  └──────┬───────┘  └──────────────┘  └──────────────────────┘    │  │
│  └─────────┼────────────────────────────────────────────────────────┘  │
└────────────┼───────────────────────────────────────────────────────────┘
             │
             │ ┌──────────────────────────────────────────────────────┐
             │ │                 本地存储层 (IndexedDB)                │
             │ │  mindflow_projects  |  mindflow_project_{id}_mindmap │
             │ │  mindflow_tasks     |  mindflow_project_{id}_config  │
             └─┼──────────────────────────────────────────────────────┘
             │
             │ REST API / WebSocket
             │
┌────────────▼───────────────────────────────────────────────────────────┐
│                          Supabase BaaS                                │
│  ┌─────────────────┐  ┌───────────────┐  ┌─────────────────────────┐  │
│  │ PostgreSQL 14   │  │ Supabase Auth │  │ Supabase Realtime       │  │
│  │ 项目/导图/任务   │  │ OAuth/邮箱/   │  │ • Broadcast (操作事件)   │  │
│  │ 标签/关联表      │  │ 密码登录      │  │ • Postgres Changes      │  │
│  └─────────────────┘  └───────────────┘  └─────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                  Supabase Storage (文件/图片)                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 分层说明

| 层级 | 职责 | 技术实现 |
|------|------|---------|
| 表现层 | 用户界面渲染、交互响应、本地状态管理 | React 18 + shadcn/ui + Tailwind + Zustand |
| 思维导图层 | 思维导图渲染、节点操作、视图状态 | `simple-mind-map` React 封装 |
| 本地存储层 | 项目数据持久化、离线读写、IndexedDB 管理 | Dexie.js (`mindflow_project_{id}` 按项目分表) |
| 桥接层 | 数据转换、任务提取、AuthClient | Supabase Client SDK + 自定义数据转换器 |
| BaaS 层 | 云端持久化、用户认证、实时同步、文件存储 | Supabase（PostgreSQL + Auth + Realtime + Storage） |
| 部署层 | 静态资源托管、CDN 加速、SPA 路由回退 | Cloudflare Pages |

---

## 3. 数据模型

### 3.1 ER 关系图（v1.1 — 多项目架构）

```
┌──────────────────────────────────────────────────────────────┐
│                         projects                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  id | user_id | name | color | icon | sort_order       │  │
│  │  | is_archived | created_at | updated_at              │  │
│  └──────┬─────────────────────────────────────────────────┘  │
└─────────┼────────────────────────────────────────────────────┘
          │ 1
          │
    ┌─────┴─────┬─────────────┬─────────────┐
    │ N         │ N           │ N           │
    ▼           ▼             ▼             ▼
┌────────┐  ┌──────────┐  ┌────────────┐  ┌────────────┐
│mindmaps│  │   tasks  │  │ mindmap_   │  │ project_   │
│(每个项目│  │(从节点  │  │ nodes      │  │ tags       │
│ 仅1张) │  │ 提取)   │  │(扁平化)    │  │(关联)      │
└───┬────┘  └────┬─────┘  └─────┬──────┘  └─────┬──────┘
    │            │              │               │
    │            │              │               │
    │ 1      N   │              │               │
    └────────────►│              │               │
                 │              │               │
                 │              │ M             │ M
                 │              │               │
                 │         ┌────▼──────┐   ┌────▼──────┐
                 │         │task_tags  │   │ tags      │
                 │         └───────────┘   │ (全局)    │
                 │                         └───────────┘
                 │
                 │ 1
                 │
          ┌──────▼──────────┐
          │ global_views    │
          │ (用户级全局视图 │
          │  配置缓存)      │
          └─────────────────┘
```

### 3.2 项目数据关系说明

```
projects                    mindmaps                mindmap_nodes
   │                            │                         │
   │ 1:N                        │ 1:1 (每个项目1张导图)    │ 1:N
   │                            │                         │
   └──► mindmaps.project_id     ├──► root tree: JSONB     └──► 扁平化节点
   │                            │                         │
   └──► tasks.project_id        ├──► view_state: JSONB    └──► is_task=true → tasks
   │                            │                         │
   └──► mindmap_nodes.project_id├──► theme, layout         │
   │                                                        │
   └──► project_tags (标签关联)                              │
```

### 3.3 表设计

#### `users`（Supabase Auth 扩展）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK, FK > auth.users.id | 用户唯一标识 |
| username | varchar(50) | UNIQUE | 用户名 |
| avatar_url | text | nullable | 头像 URL |
| display_name | varchar(100) | nullable | 显示名称 |
| created_at | timestamptz | DEFAULT now() | 创建时间 |
| updated_at | timestamptz | DEFAULT now() | 更新时间 |

#### `projects`（项目表 — v1.1 新增顶层实体）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | 项目 ID |
| user_id | uuid | FK > users.id, NOT NULL | 创建者 |
| name | varchar(200) | NOT NULL | 项目名称 |
| color | varchar(7) | DEFAULT '#4F46E5' | 项目主题色（HEX） |
| icon | varchar(50) | DEFAULT 'folder' | 项目图标（Lucide 图标名） |
| description | text | nullable | 项目描述 |
| sort_order | int | DEFAULT 0 | 侧边栏排序权重 |
| is_archived | boolean | DEFAULT false | 是否归档 |
| version | int | DEFAULT 1 | 数据版本（乐观锁） |
| last_opened_at | timestamptz | DEFAULT now() | 最后打开时间（用于最近项目排序） |
| created_at | timestamptz | DEFAULT now() | 创建时间 |
| updated_at | timestamptz | DEFAULT now() | 更新时间 |

**索引**: `user_id + sort_order`（侧边栏列表排序）, `user_id + last_opened_at`（最近项目）, `is_archived`

#### `mindmaps`（思维导图表 — v1.1 改为 1:1 关联 project）

> 说明：每个项目对应一张核心思维导图。MVP 阶段项目 = 单张导图，远期可扩展为项目下多导图。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | 导图 ID |
| project_id | uuid | FK > projects.id, NOT NULL, UNIQUE | 所属项目（唯一约束 = 每个项目1张图） |
| user_id | uuid | FK > users.id, NOT NULL | 创建者（冗余，方便 RLS） |
| title | varchar(200) | NOT NULL | 导图标题（默认 = 项目名称） |
| root_node_id | varchar(64) | NOT NULL | 根节点 uid |
| layout | varchar(30) | DEFAULT 'logicalStructure' | 布局类型 |
| theme | jsonb | DEFAULT '{}' | 主题配置 |
| tree_data | jsonb | NOT NULL | 完整树形数据结构 |
| view_state | jsonb | DEFAULT '{}' | 视口状态 {scale, x, y} |
| version | int | DEFAULT 1 | 数据版本（乐观锁） |
| last_sync_at | timestamptz | DEFAULT now() | 最后同步时间 |
| created_at | timestamptz | DEFAULT now() | 创建时间 |
| updated_at | timestamptz | DEFAULT now() | 更新时间 |

**索引**: `project_id`（联合唯一）, `user_id`（筛选）

#### `mindmap_nodes`（节点扁平化表 — v1.1 增加 project_id）

> 说明：将树形结构扁平化存储，便于独立查询和同步。每个节点对应思维导图中的一个节点。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK | 记录 ID |
| project_id | uuid | FK > projects.id, NOT NULL | 所属项目（冗余，跨项目查询优化） |
| mindmap_id | uuid | FK > mindmaps.id, NOT NULL | 所属导图 |
| uid | varchar(64) | NOT NULL | 节点在树中的唯一标识 |
| parent_uid | varchar(64) | nullable | 父节点 uid（根节点为 null） |
| text | text | NOT NULL | 节点文本 |
| data | jsonb | NOT NULL | 节点完整 data 对象（样式、图标等） |
| depth | int | NOT NULL | 节点层级深度 |
| sort_order | int | NOT NULL | 同级节点排序 |
| is_task | boolean | DEFAULT false | 是否标记为任务 |
| task_id | uuid | FK > tasks.id, nullable | 关联的任务 ID |
| created_at | timestamptz | DEFAULT now() | 创建时间 |
| updated_at | timestamptz | DEFAULT now() | 更新时间 |

**索引**: `mindmap_id + uid`（联合唯一）, `project_id`（跨项目查询）, `mindmap_id`（筛选）, `parent_uid`, `is_task`

#### `tasks`（任务表 — v1.1 增加 project_id）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK | 任务 ID |
| user_id | uuid | FK > users.id, NOT NULL | 创建者 |
| project_id | uuid | FK > projects.id, NOT NULL | 所属项目 |
| mindmap_id | uuid | FK > mindmaps.id, NOT NULL | 来源导图 |
| node_uid | varchar(64) | NOT NULL | 来源节点 uid |
| title | text | NOT NULL | 任务标题（同步节点文本） |
| status | varchar(20) | DEFAULT 'todo' | 状态：todo / in_progress / done / cancelled |
| priority | varchar(10) | DEFAULT 'medium' | 优先级：low / medium / high / urgent |
| due_date | date | nullable | 截止日期 |
| completed_at | timestamptz | nullable | 完成时间 |
| sort_order | int | DEFAULT 0 | 排序 |
| created_at | timestamptz | DEFAULT now() | 创建时间 |
| updated_at | timestamptz | DEFAULT now() | 更新时间 |

**索引**: `project_id + status`（项目看板筛选）, `user_id + status + priority`（全局任务筛选）, `user_id + due_date`（全局时间筛选）, `project_id + node_uid`（联合唯一）

#### `tags`（标签表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK | 标签 ID |
| user_id | uuid | FK > users.id, NOT NULL | 所有者 |
| name | varchar(50) | NOT NULL | 标签名称 |
| color | varchar(7) | DEFAULT '#3B82F6' | 标签颜色（HEX） |
| created_at | timestamptz | DEFAULT now() | 创建时间 |

**索引**: `user_id + name`（联合唯一）

#### `project_tags`（项目-标签关联 — v1.1 替换 mindmap_tags）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK | 关联 ID |
| project_id | uuid | FK > projects.id | 项目 |
| tag_id | uuid | FK > tags.id | 标签 |
| created_at | timestamptz | DEFAULT now() | 创建时间 |

**联合唯一**: `project_id + tag_id`

#### `task_tags`（任务-标签关联）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK | 关联 ID |
| task_id | uuid | FK > tasks.id | 任务 |
| tag_id | uuid | FK > tags.id | 标签 |
| created_at | timestamptz | DEFAULT now() | 创建时间 |

**联合唯一**: `task_id + tag_id`

---

## 4. API 设计（概要）

所有 API 通过 Supabase Client SDK 直接调用，使用 Row Level Security (RLS) 保护数据。前端无需自建 API 服务。

### 4.1 Supabase 客户端调用规范

| Method | 目标 | 说明 |
|--------|------|------|
| `supabase.auth.signInWithOtp()` | Auth | 邮箱 Magic Link 登录 |
| `supabase.auth.signInWithOAuth()` | Auth | OAuth 登录（GitHub/Google） |
| `supabase.auth.signUp()` | Auth | 注册 |
| `supabase.from('projects')...` | Database | **项目 CRUD** |
| `supabase.from('mindmaps')...` | Database | 导图 CRUD（1:1 关联 project） |
| `supabase.from('tasks')...` | Database | 任务 CRUD + 筛选 |
| `supabase.from('tags')...` | Database | 标签管理 |
| `supabase.channel('room:*').on(...)` | Realtime | 实时同步 |
| `supabase.storage.from('attachments').upload()` | Storage | 文件上传 |

### 4.2 项目级 API

#### 获取项目列表

```typescript
// 侧边栏项目列表（含最近打开排序）
const { data } = await supabase
  .from('projects')
  .select('*, mindmaps(id,updated_at)')
  .eq('user_id', uid)
  .eq('is_archived', false)
  .order('sort_order', { ascending: true })
  .order('last_opened_at', { ascending: false, nullsLast: true })
```

#### 创建项目

```typescript
// 事务：创建项目 + 自动创建一张空白思维导图
const createProject = async (name: string, color?: string) => {
  // Step 1: 创建项目
  const { data: project } = await supabase
    .from('projects')
    .insert({ user_id: uid, name, color: color || '#4F46E5' })
    .select()
    .single()

  // Step 2: 创建空思维导图（默认根节点 text = 项目名称）
  const rootNode = createDefaultRootNode(project.name)
  const { data: mindmap } = await supabase
    .from('mindmaps')
    .insert({
      project_id: project.id,
      user_id: uid,
      title: project.name,
      tree_data: { root: rootNode }
    })
    .select()
    .single()

  return { project, mindmap }
}
```

#### 更新项目（重命名/改色/归档）

```typescript
await supabase
  .from('projects')
  .update({ name: '新名称', color: '#10B981', updated_at: new Date() })
  .eq('id', projectId)
  .eq('user_id', uid)
```

#### 删除项目（级联删除）

```typescript
// Supabase 外键设置 ON DELETE CASCADE
// 删除 project → 自动级联删除 mindmaps / mindmap_nodes / tasks / project_tags
await supabase
  .from('projects')
  .delete()
  .eq('id', projectId)
  .eq('user_id', uid)
```

### 4.3 导图级 API

| 功能 | 查询示例 |
|------|---------|
| 获取项目导图详情 | `from('mindmaps').select('*, mindmap_nodes(*)').eq('project_id', pid).single()` |
| 获取导图节点 | `from('mindmap_nodes').select('*').eq('mindmap_id', mid).order('depth, sort_order')` |
| 更新导图树 | `from('mindmaps').update({ tree_data, version: version + 1 }).eq('id', mid).eq('version', version)` |

### 4.4 任务级 API（含全局查询）

#### 获取项目内任务列表

```typescript
const { data } = await supabase
  .from('tasks')
  .select('*, project:projects(id, name, color), task_tags(tag:tags(*))')
  .eq('project_id', pid)
  .order('sort_order')
```

#### 获取全局任务列表（跨项目聚合 — v1.1 核心接口）

```typescript
const { data } = await supabase
  .from('tasks')
  .select('*, project:projects(id, name, color), task_tags(tag:tags(*))')
  .eq('user_id', uid)
  .order('project_id')
  .order('due_date', { ascending: true, nullsLast: true })
```

#### 全局任务筛选（v1.1）

```typescript
// 按项目筛选
.query.eq('project_id', selectedProjectId)

// 按优先级筛选
.query.in('priority', ['high', 'urgent'])

// 按状态筛选
.query.eq('status', 'todo')

// 按截止日期筛选（今日/本周/已过期）
.query.gte('due_date', today).lte('due_date', weekEnd)
.query.lt('due_date', today)  // 已过期（不显示无 due_date 的）

// 组合筛选：项目A 的高优先级待办
.query
  .eq('project_id', pid)
  .eq('status', 'todo')
  .in('priority', ['high', 'urgent'])

// 组合筛选：所有项目的本周截止任务
.query
  .eq('user_id', uid)
  .gte('due_date', today)
  .lte('due_date', weekEnd)
  .not('due_date', 'is', null)
```

#### 全局看板查询（v1.1）

```typescript
// 获取所有任务并按项目、状态分组
const { data: tasks } = await supabase
  .from('tasks')
  .select('*, project:projects(id, name, color)')
  .eq('user_id', uid)
  .order('project_id')
  .order('sort_order')

// 前端分组渲染
const byStatus = {
  todo: tasks.filter(t => t.status === 'todo'),
  in_progress: tasks.filter(t => t.status === 'in_progress'),
  done: tasks.filter(t => t.status === 'done')
}
```

### 4.5 Realtime 频道设计

| 频道名 | 类型 | 用途 |
|--------|------|------|
| `project:{project_id}` | Broadcast | 在同一项目内广播导图/任务操作事件 |
| `db:projects` | Postgres Changes | 监听当前用户的项目数据变更（created/updated/deleted/archived） |
| `db:tasks` | Postgres Changes | 监听当前用户的任务数据变更 |
| `presence:{project_id}` | Presence | 显示当前编辑该项目的在线用户 |

### 4.6 错误码规范

| 场景 | HTTP Status | 处理策略 |
|------|-------------|---------|
| 网络断开 | 无 | Zustand 状态标记 offline，操作入 IndexedDB 队列 |
| 认证过期 | 401 | 重定向到登录页 |
| 无权限 | 403 | Toast 提示「无权限操作」 |
| 数据冲突（version 不匹配）| 409 | 弹窗提示「数据已被修改，请选择合并或覆盖」 |
| 数据验证失败 | 422 | 表单字段级错误提示 |
| 服务端错误 | 500+ | 全局错误边界 + 友好提示 |
| 项目不存在 | 404 | 侧边栏移除该项目，toast 提示「项目已被删除」 |

---

## 5. 核心流程

### 5.1 项目创建与加载流程

```
用户点击"+ 新建项目"
    │
    ▼
┌────────────────────────┐
│ 1. 弹窗输入项目信息     │
│ - 名称（必填）          │
│ - 颜色（可选，默认主色）│
│ - 图标（可选）          │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 2. 创建项目记录         │
│ INSERT projects         │
│ {user_id, name, color}  │
└────────┬───────────────┘
         │ 返回 project_id
         ▼
┌────────────────────────┐
│ 3. 创建空白思维导图     │
│ INSERT mindmaps         │
│ {project_id,            │
│  tree_data: {root:     │
│   {data:{text:name},   │
│    children:[]}}}       │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 4. 初始化 IndexedDB     │
│ 创建 mindflow_project_  │
│ {id}_mindmap 表         │
│ 存入空树数据             │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 5. 渲染思维导图         │
│ mindMap.setData(tree)   │
│ 侧边栏高亮该项目         │
└────────────────────────┘
```

### 5.2 项目切换流程

```
用户点击侧边栏项目 B
    │
    ▼
┌────────────────────────┐
│ 1. 保存当前项目状态     │
│ - 保存当前导图 tree_data│
│ - 更新 last_opened_at  │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 2. 切换 Zustand 当前    │
│    activeProjectId      │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 3. 从 IndexedDB 加载    │
│ 项目 B 的数据            │
│ - tree_data              │
│ - tasks                  │
│ - view_state             │
└────────┬───────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
命中缓存    未命中（或过期）
    │         │
    ▼         ▼
本地渲染   从 Supabase 加载
直接返回   并存入 IndexedDB
```

### 5.3 节点转任务流程（v1.1 增加 project_id）

```
用户在节点上点击「转为任务」
    │
    ▼
┌────────────────────────┐
│ 1. 节点标记为任务       │
│ mindMap.execCommand(   │
│   'SET_NODE_DATA',     │
│   {                    │
│     ...nodeData,       │
│     _isTask: true      │
│   }                    │
│ )                      │
└────────┬───────────────┘
         │ 触发 data_change 事件
         ▼
┌────────────────────────┐
│ 2. 变更处理器提取任务   │
│ - 遍历 tree 递归提取    │
│   isTask=true 的节点    │
│ - 关联 currentProjectId │
│ - 生成/更新 tasks 记录  │
└────────┬───────────────┘
         │
┌────────▼───────────────┐
│ 3a. 在线：upsert tasks  │
│    表（含 project_id）   │
│ 3b. 离线：变更入项目     │
│    IndexedDB 队列       │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│ 4. 广播实时变更         │
│ channel('project:id').  │
│ send({                  │
│   type: 'task_created', │
│   projectId,            │
│   payload: {...}        │
│ })                      │
└────────────────────────┘
```

### 5.4 全局任务加载流程（v1.1 新增）

```
用户点击侧边栏"全局任务"
    │
    ▼
┌────────────────────────┐
│ 1. 切换路由到           │
│    /global-tasks        │
│ 更新 activeView =       │
│    'global'             │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 2. 判断缓存状态         │
│ 从 IndexedDB 汇总        │
│ 所有项目的 tasks 数据    │
└────────┬───────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
缓存新鲜    缓存过期/无缓存
    │         │
    ▼         ▼
直接展示   从 Supabase 拉取
本地数据   全局任务（跨项目）
           并存入本地缓存
         │
         ▼
┌────────────────────────┐
│ 3. 渲染全局任务列表     │
│ - 按 project 分组       │
│ - 展示项目色标签        │
│ - 默认按 due_date 排序  │
│ - 顶部筛选栏            │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 4. 应用筛选条件         │
│ - project_id            │
│ - priority              │
│ - status                │
│ - due_date range        │
│ 前端本地过滤渲染         │
└────────────────────────┘
```

### 5.5 全局 ↔ 项目双向同步流程（v1.1 新增）

```
用户在全局看板拖拽任务卡片改状态
    │
    ▼
┌────────────────────────┐
│ 1. 本地乐观更新         │
│ - 更新该 task 的 status │
│ - 更新对应节点的        │
│   _checkbox / _isTask   │
│   状态                  │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 2. 写入目标项目         │
│ 的 IndexedDB            │
│ 标记 dirty = true       │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 3. 广播变更             │
│ channel('project:id').  │
│ send({                  │
│   type: 'task_status',  │
│   projectId, nodeUid,   │
│   status: 'in_progress' │
│ })                      │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 4. 同源项目监听器收到   │
│ - 若当前在对应项目视图   │
│   → 更新思维导图节点样式 │
│   → 更新项目看板卡片     │
│ - 若当前在全局视图       │
│   → 更新全局任务列表项   │
│                         │
│ 5. 异步写入 Supabase    │
│    tasks 表             │
└────────────────────────┘
```

### 5.6 实时同步流程（v1.1）

```
用户 A 编辑节点
    │
    ▼
┌────────────────────────┐
│ 1. 本地 MindMap 变更    │
│ 触发 data_change         │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 2. 本地乐观更新         │
│ 更新 Zustand 本地状态   │
│ 更新 IndexedDB          │
│ UI 立即响应             │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ 3. 生成操作日志         │
│ {                       │
│   type: 'node_update', │
│   projectId,            │
│   targetUid,            │
│   changes: {text},     │
│   timestamp,            │
│   seqNumber             │
│ }                       │
└────────┬───────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌────────────┐
│写入DB │ │Broadcast   │
│(兜底) │ │(优先)      │
└───┬───┘ └─────┬──────┘
    │           │
    ▼           ▼
Supabase   项目内其他设备/用户
  DB         收到 broadcast
 变更触发   立即应用变更
 Postgres   更新导图/看板/全局列表
 Changes
```

#### 推荐同步策略（MVP 阶段）

采用 **Broadcast + 周期性 DB 持久化** 的混合策略：

| 同步方式 | 适用场景 | 延迟 | 冲突处理 |
|---------|---------|------|---------|
| Broadcast（优先）| 同一项目内多设备实时协作 | <100ms | 乐观更新 + `version` 序列号校验 |
| Postgres Changes（兜底）| 跨设备同步、离线恢复、全局任务聚合 | 1-3s | Last-Write-Wins |

**冲突处理规则**（MVP）：
1. 每个项目有一个单调递增的 `version` 字段（在 `projects` 表维护）
2. 每次写入时 `version += 1`
3. 客户端收到变更时，如果 `incoming_version <= local_version`，丢弃（已通过 Broadcast 收到）
4. 如果 `incoming_version > local_version + 1`，触发全量重加载

---

## 6. 本地存储设计（IndexedDB — v1.1 核心变更）

### 6.1 数据库结构（Dexie.js）

```typescript
import Dexie, { Table } from 'dexie'

class MindFlowDB extends Dexie {
  projects!: Table<ProjectLocal, string>   // 项目元数据列表
  globalTasks!: Table<TaskLocal, string>   // 全局任务聚合缓存
  globalViewState!: Table<GlobalViewState, string> // 全局视图筛选状态

  constructor() {
    super('MindFlowDB')
    this.version(1).stores({
      // 项目元数据索引（用于侧边栏列表渲染）
      projects: 'id, sort_order, last_opened_at, is_archived',
      // 全局任务缓存（用于全局视图快速加载）
      globalTasks: 'id, project_id, status, priority, due_date, updated_at',
      // 全局视图状态持久化
      globalViewState: 'key'
    })
  }
}
```

### 6.2 按项目动态表（v1.1）

```typescript
// 每个项目创建时，动态注册该项目的 IndexedDB 表
const registerProjectTable = (projectId: string) => {
  const tableName = `mindflow_project_${projectId}`

  db.version(db.verno + 1).stores({
    [tableName]: 'uid, parent_uid, depth, is_task, updated_at'
  })

  return db.table(tableName)
}

// 动态表数据模型
interface ProjectNodeLocal {
  uid: string
  parent_uid: string | null
  text: string
  data: Record<string, any>  // 完整节点 data（含 _isTask/_priority/_dueDate）
  depth: number
  sort_order: number
  is_task: boolean
  updated_at: number
}
```

### 6.3 存储策略

| 存储位置 | 数据内容 | 读写时机 | 清理策略 |
|---------|---------|---------|---------|
| `projects` 表 | 项目元数据（id/name/color/icon/排序） | 打开 app 时全量加载 | 归档项目保留，删除项目清除 |
| `mindflow_project_{id}` 表 | 该项目的完整节点树 | 项目切换时加载当前项目，导图变更时写入 | 项目删除时 drop 该表 |
| `globalTasks` 表 | 所有任务的聚合缓存（含 project_id/color） | 加载全局视图时写入 | 每次加载全局视图时全量刷新 |
| `globalViewState` 表 | 全局视图的筛选条件/排序/列宽 | 切换筛选时写入 | 长期保留 |

### 6.4 IndexedDB 容量监控

```typescript
// 检测存储空间，超限提示清理
const checkStorageQuota = async () => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const { usage, quota } = await navigator.storage.estimate()
    const ratio = usage! / quota!
    if (ratio > 0.8) {
      // 触发清理提示
      promptCleanupOldProjects()
    }
  }
}
```

---

## 7. 项目数据隔离方案

### 7.1 数据隔离层级

| 隔离层级 | 实现方式 | 保证 |
|---------|---------|------|
| **用户级** | Supabase RLS 策略：`auth.uid() = user_id` | 用户 A 无法读写用户 B 的任何数据 |
| **项目级** | 所有表含 `project_id` 字段，查询自带 `eq('project_id', pid)` | 项目间数据互不干扰 |
| **客户端** | Zustand `activeProjectId` 状态，组件按此筛选 | UI 永远不会渲染非当前项目的数据 |

### 7.2 Supabase RLS 策略（v1.1）

```sql
-- projects 表：用户只能读写自己的项目
CREATE POLICY "用户只能访问自己的项目" ON projects
  FOR ALL
  USING (auth.uid() = user_id);

-- mindmaps 表：通过 project_id 的 user_id 间接约束
CREATE POLICY "用户只能访问自己项目的导图" ON mindmaps
  FOR ALL
  USING (auth.uid() = user_id);

-- tasks 表：同上
CREATE POLICY "用户只能访问自己项目的任务" ON tasks
  FOR ALL
  USING (auth.uid() = user_id);

-- 全局任务视图：RLS 自动限制只返回当前用户的任务
```

### 7.3 客户端数据隔离

```typescript
// Zustand store 中按项目分片存储
interface ProjectData {
  treeData: MindMapData
  tasks: Task[]
  viewState: ViewState
}

interface AppState {
  activeProjectId: string | null
  projects: Record<string, ProjectData>  // 以 project_id 为 key
  globalViewState: GlobalViewState
}
```

---

## 8. 风险与约束

### 8.1 技术风险

| 风险项 | 严重度 | 可能性 | 应对策略 |
|--------|--------|--------|---------|
| `simple-mind-map` 低维护状态 | 中 | 高 | 库已进入低维护，但功能稳定。MVP 阶段直接使用 npm 版本。若后续有严重 Bug，考虑 fork 维护或替换 |
| 富文本节点在导出时的兼容性 | 低 | 中 | PDF 导出大节点可能丢失内容，MVP 阶段依赖 PNG/SVG 导出作为兜底 |
| Supabase Realtime 并发连接上限 | 低 | 低 | 免费额度 200 并发峰值连接，个人工具场景足够。如接近上限，降级为轮询同步 |
| 思维导图 JSON 数据膨胀 | 中 | 中 | 单导图节点数超过 1000 时 JSON 体积可能 > 1MB。MVP 阶段限制单导图节点数，后续评估分页加载 |
| 浏览器兼容性（SVG 特性） | 低 | 低 | `simple-mind-map` 基于 SVG.js，现代浏览器均支持。不支持 IE |
| IndexedDB 存储上限（~50MB） | 中 | 中 | MVP 阶段监控存储用量，超限提示导出清理；云端同步后此问题缓解 |
| 按项目分表导致 IndexedDB 表过多 | 低 | 低 | Dexie.js 动态表管理，项目删除时 `dropTable`；20 个项目 = 20 张动态表，性能可接受 |
| 全局任务聚合查询性能 | 低 | 低 | 有 `user_id` + `status` + `priority` 复合索引，10 项目 × 100 任务 = 1000 行，PostgreSQL 无压力 |

### 8.2 性能约束

| 约束项 | 阈值 | 超出时的表现 | 优化策略 |
|--------|------|------------|---------|
| 单导图节点数 | 建议 < 500 | 渲染卡顿 | 开启 `openPerformance` 模式（仅渲染可视区域节点） |
| 项目数量 | 建议 < 20 | 侧边栏滚动困难 | IndexedDB 动态表管理，远程分页加载 |
| 全局任务聚合 | 10 项目 × 100 任务 < 1s | 列表加载慢 | IndexedDB 全局缓存 + 增量更新 |
| 项目切换时间 | < 300ms | 用户感知卡顿 | IndexedDB 项目级缓存，切换即渲染 |
| 初始加载时间 | < 2s | 用户流失 | 项目列表缓存至 IndexedDB，导图按需加载 |
| 实时同步消息大小 | < 50KB | 消息截断 | 大图变更仅同步节点 UID，图片走 Storage |
| 移动端触控体验 | 必须可用 | 误触/无法双指缩放 | 开启 `TouchEvent` 插件，禁用部分复杂手势 |
| 内存占用 | < 200MB | 页面崩溃 | `maxNodeCacheCount` 设为 500（默认 1000） |

### 8.3 安全约束

| 约束项 | 实现方式 |
|--------|---------|
| 数据隔离 | Supabase RLS 策略：用户只能读写自己的 projects / mindmaps / tasks 记录 |
| 项目隔离 | 所有查询必须带 `project_id` / `user_id` 条件，防止跨项目数据泄露 |
| 项目共享 | MVP 阶段不支持共享，所有项目默认私有。远期通过 `project_collaborators` 表扩展 |
| 文件上传 | Storage bucket 限制上传类型（jpg/png/pdf）和大小（< 5MB），文件名随机化 |
| XSS 防护 | 思维导图节点富文本需经过 DOMPurify 清洗后渲染 |
| API Key 安全 | Supabase anon/public key 可安全前端暴露，仅允许 RLS 限定的操作 |
| 敏感操作 | 删除项目、删除账户等操作需二次确认 |
| 本地存储加密 | IndexedDB 数据使用 Dexie Encryption 插件做基础加密（可选） |

---

## 9. 附录 A：simple-mind-map 关键 API 速查

### 构造函数

```javascript
import MindMap from 'simple-mind-map'

const mindMap = new MindMap({
  el: containerElement,      // 必填，DOM 容器
  data: { data: {text}, children: [] },  // 根节点数据
  layout: 'logicalStructure', // 或 'mindMap', 'fishbone', ...
  theme: 'default',
  themeConfig: {},
  readonly: false,
  // ... 更多见文档
})
```

### 核心方法

```javascript
// 数据操作
mindMap.getData()                    // 获取完整数据（含配置）
mindMap.getData(false)               // 仅获取节点数据
mindMap.setData(newData)             // 全量替换，重置视图
mindMap.updateData(newData)          // 增量更新，保留视图

// 命令操作
mindMap.execCommand('INSERT_CHILD_NODE', node, data)
mindMap.execCommand('INSERT_SIBLING_NODE', node, data)
mindMap.execCommand('REMOVE_NODE', node)
mindMap.execCommand('UPDATE_NODE_TEXT', node, '新文本')
mindMap.execCommand('SET_NODE_DATA', data)

// 节点查找
const node = mindMap.renderer.findNodeByUid('uid')
const node = mindMap.renderer.findNodeByData('text', '文本')

// 导出（需先注册 Export 插件）
mindMap.doExport.png()               // 导出 PNG
mindMap.doExport.svg()               // 导出 SVG
mindMap.doExport.pdf()               // 导出 PDF（需注册 ExportPDF）
mindMap.doExport.xmind()             // 导出 XMind（需注册 ExportXMind）
mindMap.doExport.json('name', true)  // 导出 JSON
mindMap.doExport.md()                // 导出 Markdown

// 事件监听
mindMap.on('data_change', (data) => { /* ... */ })
mindMap.on('node_click', (node) => { /* ... */ })
mindMap.on('node_active', (node) => { /* ... */ })
mindMap.on('scale', (scale) => { /* ... */ })
```

### React 封装参考

```tsx
import { useEffect, useRef } from 'react'
import MindMap from 'simple-mind-map'
import Export from 'simple-mind-map/src/plugins/Export.js'

MindMap.usePlugin(Export)

export function MindMapEditor({ data, onChange }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mindMapRef = useRef<MindMap | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const mindMap = new MindMap({
      el: containerRef.current,
      data: data,
    })
    mindMapRef.current = mindMap

    mindMap.on('data_change', (newData) => {
      onChange(newData)
    })

    return () => {
      mindMap.destroy()
      mindMapRef.current = null
    }
  }, [])  // 依赖 data 时需小心，建议 data 只用于初始值

  return <div ref={containerRef} className="w-full h-full" />
}
```

---

## 10. 附录 B：simple-mind-map 数据结构规范

### 完整思维导图数据

```typescript
interface MindMapData {
  root: NodeData        // 根节点
  theme: {              // 主题
    template: string
    config: Record<string, any>
  }
  layout: string         // 布局类型
  config: Record<string, any>  // 实例配置覆盖
  view: {               // 视口变换
    scale: number
    x: number
    y: number
  } | null
}
```

### 节点数据结构

```typescript
interface NodeData {
  data: {
    text: string                   // 节点文本（必填）
    richText?: boolean             // 是否富文本
    expand?: boolean               // 是否展开（默认 true）
    uid?: string                   // 唯一 ID（自动分配）
    icon?: string[]                // 图标数组
    image?: string                 // 图片 URL
    imageTitle?: string
    imageSize?: { width: number; height: number; custom?: boolean }
    hyperlink?: string
    hyperlinkTitle?: string
    note?: string                  // 备注
    tag?: (string | { text: string; style?: Record<string, any> })[]
    generalization?: Array<{ text: string; richText?: boolean }>
    associativeLineTargets?: string[]
    associativeLineText?: string
    checkbox?: boolean             // 待办复选框
    // ...样式字段及其他属性
    // 自定义字段以 _ 开头
    _isTask?: boolean              // MindFlow 自定义：是否为任务
    _priority?: 'low' | 'medium' | 'high' | 'urgent'
    _dueDate?: string              // ISO 8601 日期
  }
  children: NodeData[]             // 子节点，递归结构
}
```

---

## 11. 附录 C：部署配置

### Cloudflare Pages 构建配置

| 配置项 | 值 |
|--------|-----|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node version | `20` (环境变量 `NODE_VERSION`) |

### SPA Fallback

Cloudflare Pages 默认已启用 SPA fallback（所有不存在的路由回退到 `index.html`）。如需自定义，可在构建输出目录放置 `_redirects`：

```
/* /index.html 200
```

### Supabase 环境变量

| 变量名 | 来源 | 用途 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase Project Settings | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Project Settings | 前端匿名 API Key |

### 前端路由设计（v1.1）

| 路由 | 视图 | 说明 |
|------|------|------|
| `/` | 主页/引导 | 无项目时显示引导，有项目时自动跳转最近打开的项目 |
| `/project/:projectId` | 项目导图视图 | 默认进入思维导图 |
| `/project/:projectId/board` | 项目看板视图 | 三列看板 |
| `/global-tasks` | 全局任务列表视图 | 跨项目任务聚合列表 |
| `/global-tasks/board` | 全局看板视图 | 跨项目看板分色 |
| `/settings` | 设置页 | 主题/数据管理/账户 |

---

> 本文档为 MindFlow v1.1 MVP 阶段的架构设计，核心变更：引入 `projects` 作为顶层实体，支持多项目管理和全局任务聚合，IndexedDB 按项目分表存储，系统架构增加本地存储层。
