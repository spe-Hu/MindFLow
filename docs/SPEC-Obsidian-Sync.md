# SPEC: Obsidian 本地思维导图双向同步集成

<!--
Related ADR: docs/adr/0001-local-obsidian-sync.md
Related Issue: https://github.com/spe-Hu/MindFLow/issues/1
-->

## Status
ready-for-agent

---

## Problem Statement

用户在本地 Obsidian 中使用 simple-mind-map 插件维护大量思维导图（`.smm.md` 格式）。当前 MindFlow 是纯云端 SPA，数据完全托管在 Supabase，无法与本地 Obsidian 思维导图产生任何关联。用户希望：

1. 在 MindFlow 中浏览和编辑本地 Obsidian 的思维导图；
2. 两边修改后自动同步，延迟可接受几秒级别；
3. 思维导图节点上的任务标记（checkbox）能自动转换为 MindFlow 的任务系统；
4. 不改变现有的 Cloudflare Pages + Supabase 云端架构。

---

## Solution

在 MindFlow 中引入**本地工作空间（Local Workspace）**概念，作为现有云端项目的并列层级。用户可选择一个本地 Obsidian 目录进行授权，MindFlow 通过浏览器 Native File System API 扫描该目录下的 `.smm.md` 文件，将每个文件呈现为一个独立的 Obsidian Project。修改后的内容通过轮询自动写回本地文件，同时保持与 MindFlow 任务系统的双向映射。

---

## User Stories

1. 作为在日常工作中使用 Obsidian 做笔记的用户，我想在 MindFlow 侧边栏看到一个「本地工作空间」区域，列出我授权的本地 Obsidian 目录下的所有思维导图文件，以便统一管理本地和云端的工作内容。

2. 作为 Obsidian 用户，我想点击本地工作空间中的 `.smm.md` 文件，让它在 MindFlow 中以思维导图形式打开并支持编辑，以便在浏览器中也能操作本地导图。

3. 作为 Obsidian 用户，我想在 MindFlow 中编辑某个 Obsidian Project 的节点后，修改能自动同步回本地 `.smm.md` 文件（几秒延迟可接受），以便两边的内容保持一致。

4. 作为 Obsidian 用户，我想在本地 Obsidian 中修改某个思维导图后，打开 MindFlow 时能看到最新内容已自动同步过来（几秒延迟可接受），以便无需手动刷新。

5. 作为同时使用 Obsidian checkbox 和 Markdown `- [ ]` 任务语法的用户，我想让这两种标记都被 MindFlow 识别为任务节点，并显示在看板和全局任务列表中，以便统一任务管理。

6. 作为在 MindFlow 中将节点标记为「转为任务」的用户，我想这个任务状态也能同步回本地 `.smm.md` 文件，并在 Obsidian 中正确显示为 checkbox，以便两边任务状态一致。

7. 作为需要在多设备访问 MindFlow 的用户，我想知道 Obsidian 同步功能仅在支持 Native File System API 的浏览器（Chrome/Edge）上可用，在不支持的浏览器上能优雅降级并给出提示，以便不产生困惑。

8. 作为在本地和 MindFlow 中同时快速修改同一个节点的用户，我想系统能以最后写入为准（Last-Write-Wins），无需弹窗让我手动选择，以免打断工作流。

9. 作为有多个 Obsidian 知识库目录的用户，我想在 MindFlow 中配置多个本地目录，每个目录作为独立的文件夹层级显示，以便按主题组织本地思维导图。

10. 作为担心数据安全的用户，我想 MindFlow 仅在获得我明确的目录授权后才读写本地文件，且浏览器会在一定时间后自动回收权限，以便我有控制权。

11. 作为首次使用本地同步功能的用户，我想在设置页或通过侧边栏的引导看到一个「添加本地目录」按钮，并有一次性的权限授权流程说明，以便快速上手。

12. 作为在 MindFlow 中重命名或删除本地 Obsidian Project 的用户，我想这些操作不会直接重命名或删除本地文件（只做 MindFlow 内的展示调整），以免误删本地数据。

13. 作为在 MindFlow 中更改 Obsidian Project 节点任务状态的用户，我想这个状态变更能立即反映在 MindFlow 的任务看板中（乐观更新），并在下一次轮询时写回本地文件，以便即时反馈。

14. 作为使用全局任务视图的用户，我想 Obsidian Project 中的任务也能出现在全局任务列表和看板中，与云端项目的任务一样可筛选、排序和拖拽，以便统一任务管理体验。

15. 作为在网络断开的场景下使用 MindFlow 的用户，我想 Obsidian 本地同步不受影响（因为不依赖网络），而云端同步会正常进入离线状态，以便我的工作不会中断。

---

## Implementation Decisions

### 1. Schema Changes

#### 1.1 `LocalProject` 扩展 `project_type` 字段

```typescript
export interface LocalProject {
  id: string
  name: string
  color: string
  sort_order: number
  is_archived: boolean
  version: number
  last_opened_at?: Date
  user_id?: string
  project_type: 'cloud' | 'obsidian' // 新增，默认 'cloud'
  local_path?: string                // 新增，本地文件路径（相对授权的目录）
  local_dir_id?: string              // 新增，关联的本地目录配置 ID
  last_synced_at?: Date              // 新增，最后同步时间
}
```

Rationale:
- `project_type` 区分数据来源：云端项目走 Supabase，Obsidian 项目走本地文件；
- `local_path` 记录相对路径，用于在轮询时定位文件；
- `last_synced_at` 用于 LWW 冲突判断。

#### 1.2 IndexedDB Settings 表新增本地目录注册记录

```typescript
interface LocalDirectoryConfig {
  id: string          // 目录配置唯一 ID
  name: string        // 用户自定义名称（如"知识库"）
  handle_token: string // FileSystemDirectoryHandle 的序列化标识（IndexedDB 原生支持存储 FileSystemHandle）
  path?: string       // 目录路径（仅用于展示）
  created_at: Date
}
```

Rationale:
- IndexedDB 支持直接存储 `FileSystemHandle`（Chromium 特有），重启后可恢复权限（但可能过期）；
- 通过 `settings` 表以 key-value 存多个 `local-dir:{id}` 记录，避免 schema 迁移。

#### 1.3 Dexie Schema Migration

升级到 `version(3)`，新增 `local_dirs` 虚拟表索引（实际仍用 settings 表存储，但通过 typed interface 约束）：

```typescript
this.version(3).stores({
  projects: 'id, project_type, name, sort_order, is_archived, last_opened_at',
  mindmaps: 'id, project_id',
  tasks: 'id, project_id, node_uid, title, status, priority, due_date',
  settings: 'key',
})
```

### 2. New Modules

#### 2.1 `lib/smmMdParser.ts` — .smm.md 解析与序列化

纯逻辑模块，无浏览器 API 依赖，可完全单元测试。

职责：
- `parseSmmMd(content: string): { metadata: MindMapData, textdata: string[], frontmatter: Record<string, unknown> }` — 解析 `.smm.md` 文件内容，提取 Base64 metadata、textdata、YAML frontmatter；
- `serializeSmmMd(data: MindMapData, originalContent: string): string` — 将修改后的 MindMapData 序列化回 `.smm.md` 格式，保留原始文件的 YAML frontmatter 和 textdata 区域不变；
- `extractTasksFromTree(tree: NodeData[]): OutlineLine[]` — 从树中提取任务节点，支持 `data.checkbox` 和 Markdown checkbox 双格式；
- `mergeTaskMarkersIntoTree(tree: NodeData[], tasks: TaskUpdate[]): NodeData[]` — 将 MindFlow 任务状态写回树节点。

Base64 解码/编码逻辑：
- metadata 区块内容经过 Base64 编码存储；
- 解码后得到的是 simple-mind-map 原生 JSON 格式，与 MindFlow 内部的 `tree_data` 格式一致，可直接使用。

Markdown checkbox 正则：
```typescript
const MARKDOWN_CHECKBOX_RE = /^- \[(.)\] (.+)$/
// 匹配组 1: 空格(' ') 或 'x'  组 2: 任务文本
```

#### 2.2 `stores/localWorkspaceStore.ts` — 本地工作空间状态管理

Zustand store，管理本地目录注册、Obsidian Projects 列表、轮询状态和同步状态。

```typescript
interface LocalWorkspaceState {
  directories: LocalDirectoryConfig[]          // 已注册的本地目录
  obsidianProjects: LocalProject[]             // 扫描到的所有 Obsidian Projects
  isScanning: boolean
  syncStatus: 'idle' | 'syncing' | 'error'
  lastError: string | null

  // Actions
  registerDirectory: (handle: FileSystemDirectoryHandle, name: string) => Promise<void>
  unregisterDirectory: (dirId: string) => Promise<void>
  scanDirectories: () => Promise<void>          // 手动触发扫描
  startPolling: () => void                      // 启动 5s 轮询
  stopPolling: () => void                       // 停止轮询
  refreshPermission: (dirId: string) => Promise<boolean>  // 重新请求权限
}
```

Rationale:
- 独立的 store 避免污染 projectStore 的云端逻辑；
- Obsidian Projects 仍需存入 `db.projects` 表（带 `project_type='obsidian'`），以便全局任务查询时能统一筛选。

#### 2.3 `lib/localFileSync.ts` — Native File System API 封装 + 轮询调度器

职责：
- `requestDirectoryAccess(): Promise<FileSystemDirectoryHandle>` — 调用 `showDirectoryPicker()`；
- `scanDirectory(handle): Promise<{ fileHandle, relativePath, lastModified }[]>` — 递归扫描目录下所有 `.smm.md` 文件；
- `readSmmMdFile(fileHandle): Promise<string>` — 读取文件内容；
- `writeSmmMdFile(fileHandle, content): Promise<void>` — 写入文件内容（通过 `createWritable`）；
- `createSyncRound(directories, onFileChanged): () => void` — 返回一个轮询函数和 cleanup 函数。

轮询（Sync Round）流程：

```
每 5 秒执行一次:
  1. 遍历所有已注册目录
  2. 对每个目录递归扫描 .smm.md 文件
  3. 对每个文件:
     a. 检查 lastModified > db.projects 中该项目的 last_synced_at
     b. 若本地更新 → 读取 → parseSmmMd → 更新 db.projects + db.mindmaps + db.tasks
     c. 检查该项目的本地修改标记 (dirty=true)
     d. 若 MindFlow 有未同步修改 → 序列化 → writeSmmMdFile
     e. 更新 last_synced_at
  4. 报告 syncStatus
```

#### 2.4 `components/local/LocalWorkspacePanel.tsx` — 本地工作空间侧边栏面板

职责：
- 渲染在 Sidebar 中「本地工作空间」区域；
- 显示已注册的目录列表（可展开/折叠）；
- 目录下显示所有 `.smm.md` 文件作为项目项；
- 提供「添加本地目录」按钮；
- 每个文件项支持：点击打开、hover 显示完整路径、未同步标记（dirty indicator）。

### 3. Modified Modules

#### 3.1 `lib/db.ts` — 扩展项目类型支持

- `getProjects()` 默认仍返回所有项目（含 Obsidian），但 caller 可按 `project_type` 筛选；
- `getCloudProjects()` 新增，仅返回 `project_type='cloud'`；
- `upsertProject()` 支持 `project_type` 字段；
- `deleteProject()` 对 `project_type='obsidian'` 的项目，**不删除本地文件**，只清除 IndexedDB 记录和本地目录映射。

#### 3.2 `stores/projectStore.ts` — 兼容 Obsidian Projects

- `loadProjects()` 需将 `db.projects` 中所有项目（含云端和 Obsidian）加载到状态；
- Sidebar 渲染时按 `project_type` 分组（云端 vs 本地工作空间）；
- `setActiveProject()` 对 Obsidian 项目，需先检查本地文件权限是否仍有效（`queryPermission`），若失效提示用户重新授权。

#### 3.3 `components/layout/Sidebar.tsx` — 新增 Local Workspace 区域

Side-by-side 结构：

```
┌─────────────────────────────┐
│  [Logo] MindFlow      [<]   │  ← Brand Header
├─────────────────────────────┤
│  📂 本地工作空间        ▼    │  ← 新增：可折叠区域
│    ├─ 📄 file1.smm.md       │
│    ├─ 📄 file2.smm.md       │
│    └─ ➕ 添加本地目录       │
├─────────────────────────────┤
│  📁 项目（云端）             │  ← 现有区域
│    ├─ 🟣 MindFlow v1.1      │
│    ├─ 🔵 内容矩阵规划       │
│    └─ 🟢 自动驾驶大模型     │
├─────────────────────────────┤
│  [Nav Icons]                 │
│  [User Avatar]               │
└─────────────────────────────┘
```

设计要求：
- Local Workspace 区域可展开/折叠（使用 Collapsible 组件）；
- Obsidian 项目使用文件图标（`FileText`）而非项目色头像；
- 未同步（dirty）的项目显示一个点状指示器；
- 权限失效时显示警告图标，hover 提示"点击重新授权"。

#### 3.4 `components/mindmap/MindMapCanvas.tsx` — 支持 Obsidian 项目的 data_change 回写

- 现有 `data_change` 事件处理器已支持将节点变更同步到 `db.tasks`；
- 对 `project_type='obsidian'` 的项目，新增逻辑：将变更标记为 `dirty`（存入内存或 store），等待下一次 Sync Round 写回本地文件；
- 注意：不能立即写文件（避免高频 I/O），而是延后到轮询周期统一写。

#### 3.5 `pages/SettingsPage.tsx` — 新增本地同步设置面板

新增「本地同步」Tab：
- 显示已注册的本地目录列表（路径、名称、状态）；
- 每个目录可「移除」（仅移除 MindFlow 内的映射，不删本地文件）；
- 「重新授权」按钮（用于权限过期场景）；
- 同步间隔设置（默认 5s，可调节 3s/5s/10s/30s）；
- 浏览器兼容性提示（非 Chromium 浏览器显示"此功能不可用"）。

### 4. Conflict Resolution: Last-Write-Wins (LWW)

每轮 Sync Round 中，对每个 Obsidian Project 的执行顺序：

```
let localMtime = file.lastModified
let dbLastSynced = project.last_synced_at?.getTime() || 0
let mindflowDirty = project._dirty || false  // 内存标记

if (localMtime > dbLastSynced && !mindflowDirty):
  // 只有本地改了 → 拉取本地覆盖 MindFlow
  pullFromLocal()
else if (localMtime <= dbLastSynced && mindflowDirty):
  // 只有 MindFlow 改了 → 推送覆盖本地
  pushToLocal()
else if (localMtime > dbLastSynced && mindflowDirty):
  // 两边都改了 → LWW：比较实际时间戳
  if (localMtime > project._lastMindflowEditAt):
    pullFromLocal()  // 本地较晚 → 本地优先
    // MindFlow 本地未同步的修改被丢弃（静默覆盖）
  else:
    pushToLocal()    // MindFlow 较晚 → MindFlow 优先
else:
  // 都没改 → 跳过
```

注意：`_dirty` 和 `_lastMindflowEditAt` 是运行时内存状态，不持久化到 IndexedDB（只在当前会话有效）。页面刷新后若两边都有未同步修改，以文件 `lastModified` 为准（即本地优先）。

### 5. Task Marker Dual-Format Support

**读取（Obsidian → MindFlow）：**

优先级：先检查 `data.checkbox`，再检查 Markdown checkbox。

```typescript
function detectTaskFromNode(node: NodeData): TaskInfo | null {
  const data = node.data || {}

  // 格式 1: simple-mind-map checkbox
  if (data.checkbox === true) {
    return {
      title: data.text,
      status: data.checkbox ? 'done' : 'todo',  // 注意：checkbox=true 表示完成
      // priority 可能来自 data._priority 或文本解析
    }
  }

  // 格式 2: Markdown checkbox
  const match = MARKDOWN_CHECKBOX_RE.exec(data.text)
  if (match) {
    const isChecked = match[1] === 'x'
    const title = match[2]
    return {
      title,
      status: isChecked ? 'done' : 'todo',
    }
  }

  return null
}
```

注意：`data.checkbox` 在 simple-mind-map 中的语义是"是否显示复选框并勾选"。如果用户取消勾选，`checkbox` 会被设为 `false` 或被删除（取决于插件实现）。需要兼容两种情况。

**写入（MindFlow → Obsidian）：**

优先输出 `data.checkbox` 属性（simple-mind-map 原生支持），同时保留原始节点文本（不移除 `- [ ]` 前缀，如果原本就有的话）。

策略：
- 如果原始节点已有 `data.checkbox` 属性 → 直接更新其值；
- 如果原始节点没有 `data.checkbox` 但节点文本以 `- [ ]` 开头 → 更新方括号内容；
- 如果都没有 → 添加 `data.checkbox = true/false`。

### 6. Browser Compatibility & Permission Management

**兼容性检测：**
```typescript
const isFileSystemAccessSupported = 'showDirectoryPicker' in window
```

- 支持：Chrome 86+, Edge 86+, Opera 72+
- 不支持：Safari, Firefox → 全局隐藏「本地工作空间」入口和设置项，显示友好提示

**权限生命周期：**
- 首次：用户通过 `showDirectoryPicker()` 主动选择目录 → 浏览器授予 read/write 权限；
- 持久化：权限通过 `queryPermission()` 检测，若返回 `'prompt'` 或 `'denied'` → 显示重新授权引导；
- 过期处理：权限通常会在浏览器关闭后一段时间或清除站点数据后失效。失效时 Sidebar 中该项目显示警告态，点击触发 `showDirectoryPicker()` 重新选择同一目录恢复权限。

**序列化 Handle：**
- IndexedDB 可以直接存入 `FileSystemDirectoryHandle` 对象（原生支持），无需自定义序列化；
- 从 IndexedDB 读取后可直接调用 `handle.queryPermission()` 和 `handle.values()`。

### 7. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          MindFlow SPA                            │
│                       (Cloudflare Pages)                         │
│                                                                  │
│  ┌─────────────────┐    ┌──────────────────┐   ┌─────────────┐ │
│  │ Sidebar         │───▶│ localWorkspace-  │   │ projectStore│ │
│  │ (Local Workspace│    │    Store         │   │             │ │
│  │  + Cloud Panel) │    └────────┬─────────┘   └─────────────┘ │
│  └─────────────────┘             │                            │
│                                  ▼                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Sync Round (5s interval)                                 │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │ │
│  │  │ scan dir │─▶│ read file│─▶│ parseSmm │               │ │
│  │  │ (NFS API)│  │ (NFS API)│  │  Md      │               │ │
│  │  └──────────┘  └──────────┘  └──────────┘               │ │
│  │       │                           │                      │ │
│  │       ▼                           ▼                      │ │
│  │  ┌──────────────────────────────────────────────┐       │ │
│  │  │  LWW Decision: pull from local or            │       │ │
│  │  │  push to local (write via createWritable)    │       │ │
│  │  └──────────────────────────────────────────────┘       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                           │                                    │
│                           ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  IndexedDB (Dexie)                                        │ │
│  │  • projects (project_type='obsidian')                     │ │
│  │  • mindmaps (project_id → tree_data)                      │ │
│  │  • tasks  (project_id → task nodes)                       │ │
│  │  • settings (local-dir config handles)                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐ │
│  │ MindMapCanvas       │  │ TaskBoard / Global Tasks        │ │
│  │ (simple-mind-map)   │  │ (re-use existing components)    │ │
│  └─────────────────────┘  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                          Native File System API
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                        本地文件系统                             │
│  /Users/wentao.hu/Knowledge/.../MindMap 2026-07-06.smm.md      │
│  /Users/wentao.hu/Knowledge/.../系统设计思维导图.smm.md         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Decisions

### What makes a good test

只测试**外部行为**，不测试实现细节。即：给定一组输入（文件内容、store 状态、用户操作），验证输出（UI 渲染、文件写入、store 状态）是否正确。不测试内部轮询定时器、不测试私有函数。

### Test seams

**Seam 1: `lib/smmMdParser.ts` — 纯逻辑，最高优先级**

这是整个 feature 中最稳定、最重要的 seam。所有 `.smm.md` 解析/序列化逻辑都在这里，完全无浏览器依赖，可用 Vitest 做密集单元测试。

测试用例：
- 解析一个有效的 `.smm.md` 文件，验证 Base64 解码后的树结构正确；
- 解析包含 `data.checkbox=true` 的节点，正确识别为任务；
- 解析包含 `- [ ] task name` 的节点文本，正确识别为任务；
- 序列化后的输出保留原始 YAML frontmatter 和 textdata；
- 修改树后的序列化，metadata 区正确更新且其他区域不变。

**Seam 2: `stores/localWorkspaceStore.ts` — Store 级集成测试**

用 mock 的 `FileSystemDirectoryHandle` 和 `FileSystemFileHandle` 对象模拟文件系统，测试 store 的扫描、同步、冲突处理逻辑。

Prior art: 项目中目前无 store 级测试先例，但 Zustand store 的 plain 函数接口天然适合测试。

**Seam 3: `components/local/LocalWorkspacePanel.tsx` — 组件级测试**

Mock `localWorkspaceStore` 状态，测试组件在不同状态下的渲染（空态、有目录、权限失效、扫描中）。

Prior art: 项目中目前无组件级单元测试，但 shadcn/ui 组件已有成熟测试模式可参考。

**Seam 4: E2E 测试 — 需浏览器 File System Access API**

由于 Native File System API 需要真实浏览器交互（文件选择对话框），E2E 测试难以完全自动化。建议：
- 在现有 Playwright E2E 框架中，通过 `page.evaluate()` 注入 mock 的 `window.showDirectoryPicker` 来走通完整链路；
- 或标记为手动测试项，在发布前人工验证。

### 不需要测试的

- 具体的 5 秒轮询间隔（实现细节，可配置）；
- `FileSystemDirectoryHandle.values()` 的内部遍历行为（浏览器 API）；
- UI 的 tooltip 显示文字（太细，维护成本高）。

---

## Out of Scope

1. **Obsidian 插件开发** — 不在 Obsidian 侧开发任何插件，所有同步逻辑在 MindFlow 侧完成；
2. **实时同步** — 不实现 WebSocket/SSE 级别的实时推送，5 秒轮询已是可满足需求的机制；
3. **冲突合并（Merge）** — 不实现节点级合并，LWW 会静默覆盖，这是已明确的决策；
4. **非 `.smm.md` 格式** — 不支持 XMind、FreeMind、OPML 等其他思维导图格式的导入；
5. **本地图片/附件同步** — 节点中的图片路径只做文本保留，不实际复制或同步图片文件；
6. **多用户协作** — Obsidian Projects 本质上是本地单用户文件，不涉及多用户实时协作；
7. **Safari/Firefox 支持** — 若未来浏览器支持 File System Access API，可扩展，但不在本次范围内。

---

## Further Notes

### 实际 Obsidian `.smm.md` 格式参考

```markdown
---
path: 05_知识库构建/02_大模型训练全流程/MindMap 2026-07-06 20.50.55.smm.md
tags:
  - simplemindmap
---
> 请勿修改除YAML外的任何信息
# metadata
```metadata
<base64-encoded-json>
```
# svgdata
```svgData
```
# linkdata
# textdata
根节点 ^d4e3024c-8502-4b0e-b5e0-1a3c1c8162b5
二级节点 ^a245bd03-2c51-4dd2-8ec8-9bc0ae7d625a
分支主题 ^9a1860d1-6bc8-4b69-ba8b-e7fe59e369dd
```

Base64 解码后得到 simple-mind-map JSON：`{ data: { text: '根节点', uid: '...' }, children: [...] }`。

### 性能考虑

- 单轮 Sync Round 递归扫描目录是 I/O 密集型操作，若目录下文件很多（>1000），可能阻塞主线程。建议：
  - 使用 `yield` / `setTimeout` 分片执行，每处理 20 个文件让出一次事件循环；
  - 或考虑 Web Worker 执行文件 I/O（但 File System Access API 在 Worker 中可用性需验证）；
  - 首次加载时显示"正在扫描本地文件..."进度提示。

### 安全风险

- Native File System API 的 `showDirectoryPicker()` 会显示完整的系统文件选择器，用户必须手动选择目录，不存在自动扫描用户文件系统的风险；
- MindFlow 代码开源，用户可审计本地同步逻辑是否超出授权目录范围；
- 写入操作使用 `createWritable()`，每次写入前有明确的序列化校验，避免写入损坏内容。

### 未来扩展

- **桌面壳（Tauri/Electron）**：若将来需要更好的本地文件支持，桌面壳可无缝替换 Native File System API 层，上层逻辑（parser、store、sync round）完全复用；
- **Git 同步**：可通过扩展 Local Workspace 支持 Git-backed 目录，实现多设备文件同步的另一种方案。
