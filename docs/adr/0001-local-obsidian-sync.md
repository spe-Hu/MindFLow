---
status: accepted
date: 2026-07-17
decision-makers: wentao.hu (product owner), 大黄 (AI architect)
consulted: —
informed: —
related-spec: docs/SPEC-Obsidian-Sync.md
related-issue: https://github.com/spe-Hu/MindFLow/issues/1
---

# ADR-0001: 本地 Obsidian 思维导图双向同步集成

## Context / Problem Statement

MindFlow 当前是一个纯云端托管的 SPA（Cloudflare Pages + Supabase），所有数据通过 Supabase 持久化。用户（wentao.hu）在本地 Obsidian 中使用 simple-mind-map 插件维护大量思维导图（`.smm.md` 格式），希望能在 MindFlow 中打开这些本地文件，并在两边之间实现双向同步——即本地和云端的修改能自动保持一致。

核心诉求：
1. 思维导图兼顾任务管理、思路整理和知识管理；
2. 日常编辑在本地 Obsidian 完成；
3. 云端（MindFlow）作为备份、协作和跨设备访问的延伸；
4. 两边修改后自动同步，延迟可接受几秒级别。

## Decision

### 1. 架构定位：Native File System API + 轮询（Polling）

保持 MindFlow 的 Cloudflare SPA 架构不变，不引入 Electron/Tauri 桌面壳。通过浏览器的 **Native File System API**（File System Access API）获取用户授权的本地目录读写权限。

- **目录选择**：用户首次使用时通过 `showDirectoryPicker()` 选择一个 Obsidian 知识库目录（或子目录）。
- **权限持久化**：Chromium-系浏览器会记住授权，下次访问时自动恢复（通过 `queryPermission` 检测）。
- **同步触发**：轮询机制，每 **5 秒** 递归扫描已映射目录下的 `.smm.md` 文件，比较 `lastModified` 时间戳。
- **写入策略**：MindFlow 端的修改通过 `createWritable()` 直接写回本地文件；云端数据照常走 Supabase。

### 2. 侧边栏层级：新增 "Local Workspace"

在项目侧边栏中，与现有 "项目" 列表平级，新增一个可展开/折叠的 **"本地工作空间（Local Workspace）"** 区域：

```
📁 本地工作空间
  ├─ 📄 MindMap 2026-07-06 20.50.55.smm.md  → 项目 #obs1
  ├─ 📄 系统设计思维导图.smm.md             → 项目 #obs2
  └─ 📄 2026-Q3 规划.smm.md                → 项目 #obs3

📁 项目（云端）
  ├─ 🟣 MindFlow v1.1
  ├─ 🔵 内容矩阵规划
  └─ 🟢 自动驾驶大模型
```

- 每个 `.smm.md` 文件在 MindFlow 中表现为一个 **独立项目**；
- 项目类型标记为 `project_type = 'obsidian'`（区别于现有云端项目的 `'cloud'`）；
- Local Workspace 支持展开/折叠、文件列表滚动。

### 3. 冲突解决：Last-Write-Wins (LWW)

双边同时修改同一个节点时，以**时间戳为准，后写覆盖先写**。不引入合并算法或冲突弹窗。

- 每个 `.smm.md` 文件在内存中维护一个 `syncVersion`（基于文件 `lastModified` + 内容 hash）；
- 每次同步周期比较本地文件 `lastModified` 与 MindFlow 内部记录的 `lastSyncedAt`；
- 如果本地文件更新 → 解析并覆盖 MindFlow 内存状态；
- 如果 MindFlow 有未同步的修改 → 序列化后写回本地文件；
- 如果两边同时有更新（在轮询窗口内），以实际 `lastModified` 时间戳较大的为准。

### 4. 任务节点标记：双格式支持

MindFlow 识别 Obsidian 思维导图中的任务节点，采用两种策略：

| 格式 | 来源 | 识别方式 | 转换为 MindFlow 任务 |
|------|------|---------|---------------------|
| **simple-mind-map checkbox** | Obsidian simple-mind-map 插件自带 | `node.data.checkbox === true` | `node.data._isTask = true`，状态 checkbox 决定 `done/todo` |
| **Markdown checkbox** | 用户在节点文本中手动书写 | 节点文本匹配正则 `^- \[(.)\] (.+)$` | 提取文本和完成状态，映射为 `_isTask = true` + `_status` |

双向同步时，MindFlow 优先输出 `data.checkbox`（兼容 simple-mind-map 渲染），同时保留 Markdown checkbox 的解析能力作为兜底。

### 5. 数据转换：`.smm.md` ↔ `simple-mind-map` JSON

Obsidian 的 `.smm.md` 文件格式：
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
```

- `metadata` 代码块中包含 Base64 编码的 `simple-mind-map` JSON 数据；
- MindFlow 同步时需要：**解码 Base64 → 解析 JSON → 转换为 MindFlow 内部 `tree_data` 格式**；
- 写回时需要：**将 MindFlow `tree_data` 序列化 → Base64 编码 → 写回 `.smm.md` 的 metadata 块**；
- 保留 YAML Frontmatter 和 `# textdata` 区域不被破坏（这些是 Obsidian 兼容所需）。

## Consequences

### 正向影响

1. **不改变现有架构**：MindFlow 仍然是 Cloudflare SPA，无需引入桌面壳或本地代理；
2. **渐进式集成**：用户按需选择是否启用本地同步，不干扰现有云端工作流；
3. **知识管理闭环**：Obsidian（知识沉淀）↔ MindFlow（任务执行），形成完整工作流。

### 负向影响

1. **浏览器兼容性**：Native File System API 仅限 Chromium-系浏览器（Chrome / Edge）；Safari/Firefox 不支持，这些用户无法使用本地同步功能；
2. **权限生命周期**：浏览器可能在一段时间后回收目录权限，用户需要重新授权；
3. **文件格式耦合**：MindFlow 需要硬编码解析 `.smm.md` 的 Base64 metadata 格式，Obsidian 插件版本升级可能破坏兼容性；
4. **轮询开销**：5 秒一次的全目录递归扫描在文件数量大时（>100 个 `.smm.md`）可能有性能开销；
5. **LWW 的数据丢失风险**：用户在两边快速交替修改同一个节点时，较早的修改会被静默覆盖，无冲突提示。

### 备选方案回顾

| 方案 | 为什么被否决 |
|------|------------|
| Electron/Tauri 桌面壳 | 破坏 Cloudflare Pages 部署架构，违背 "不改变现有架构" 原则 |
| 本地代理服务（Node.js watcher） | 增加用户配置负担，需要常驻后台进程 |
| Obsidian 插件实时推送 | 需要开发并维护 Obsidian 插件，工作量翻倍；且 Obsidian 端无法主动推送到 Cloudflare SPA |
| WebSocket / SSE 双向实时 | SPA 无法作为服务端接收连接，技术上不可行 |
| Git-based 同步 | 引入 Git 依赖，对非技术用户不友好，且冲突处理更复杂 |
