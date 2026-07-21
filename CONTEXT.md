# MindFlow Domain Glossary

## Core Entities

### Project

MindFlow 中的核心工作单元，承载一张思维导图及其派生任务。每个 Project 有唯一的 `project_type` 属性标识数据来源。

**Attributes**:
- `id`: uuid — 唯一标识
- `name`: string — 项目名称（对 Obsidian 项目 = 文件名）
- `project_type`: `'cloud' | 'obsidian' | 'local'` — 项目来源类型
  - `cloud`: 数据完全托管在 Supabase，通过 MindFlow 创建和管理
  - `obsidian`: 数据来源于本地 `.smm.md` 文件，通过 Native File System API 同步
  - `local`（预留）: 纯本地项目，不透传云端
- `color`, `icon`, `is_archived`, etc. — 与现有项目一致

### Cloud Project

通过 MindFlow UI 创建的纯云端项目。数据持久化在 **Supabase PostgreSQL**，支持多设备同步、协作（远期）。所有现有项目均为 Cloud Project。

### Obsidian Project

通过扫描本地 `.smm.md` 文件生成的项目。每个 `.smm.md` 文件对应一个 Obsidian Project。数据**双向同步**于本地文件和 MindFlow 内存状态之间，云端仅缓存（不走 Supabase `mindmaps`/`tasks` 表，或走但标记为 `project_type='obsidian'`）。

### Local Workspace

侧边栏上的 UI 区域，与 "项目（云端）" 列表平级。用于组织和管理所有 **Obsidian Projects**。支持展开/折叠，内部列出所有已发现的 `.smm.md` 文件。

> **注意**：Local Workspace 是一个纯 UI 概念，不是数据实体。它不对应数据库表，而是运行时从 `registeredLocalFolders` 状态派生的视图。

### File-backed Project

泛指数据有本地文件背书的项目类型。当前仅包含 **Obsidian Projects**，未来可能扩展支持其他文件格式（如 `.xmind`, `.opml`）。

## Data Concepts

### smm.md

Obsidian 中 simple-mind-map 插件生成的思维导图文件格式。标准 Markdown 文件，包含：
- YAML Frontmatter（`path`, `tags`）
- `# metadata` 区块（Base64 编码的 simple-mind-map JSON 数据）
- `# textdata` 区块（纯文本节点列表，用于 diff）

MindFlow 通过解析 `metadata` 区块中的 Base64 JSON 获取完整导图结构。

### Task Marker

在思维导图节点上标识"这是一个任务"的方式。MindFlow 支持两种 Task Marker：

1. **Checkbox Marker** — `node.data.checkbox: boolean`。由 simple-mind-map 插件原生支持，勾选后标记为完成。
2. **Markdown Checkbox Marker** — 节点文本匹配 `^- \[(.?)\] (.+)$`。兼容标准 Markdown 任务列表语法。

两种 Marker 在同步时都转换为 MindFlow 内部的 `_isTask: true` + `_status` 表示。

## Synchronization Concepts

### Sync Round

一次完整的双向同步周期（5 秒/次）。流程：
1. 遍历所有已注册的本地目录
2. 对每个 `.smm.md` 文件，比较文件 `lastModified` 与内部 `lastSyncedAt`
3. 若本地更新 → 读取文件 → 解析 → 覆盖内存状态
4. 若 MindFlow 内存有未同步修改 → 序列化 → 写回文件
5. 更新 `lastSyncedAt`

### Last-Write-Wins (LWW)

冲突解决策略。当 Sync Round 检测到本地文件和 MindFlow 内存在同一次轮询窗口内都被修改过时，以**后发生的时间戳为准**，覆盖较早的修改。

## State

### Registered Local Folder

用户通过 Native File System API 授权给 MindFlow 访问的本地目录。在 IndexedDB `settings` 表中持久化存储（仅存目录句柄的序列化标识，实际权限由浏览器管理）。

### Directory Handle

Native File System API 返回的 `FileSystemDirectoryHandle` 对象。用于递归遍历目录、读取 `.smm.md` 文件、写入修改后的内容。权限生命周期由浏览器控制，可能过期需重新授权。
