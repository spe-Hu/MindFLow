# 思维导图模块

这是 MindFlow 的核心特性。`apps/web/src/components/mindmap/`、`pages/ProjectMindMapPage.tsx`、`pages/OutlinePage.tsx` 与 `lib/aiMindMap.ts` / `lib/templates.ts` / `lib/outline.ts` 共同构成「节点即任务」的同实体画布。

## 关键入口

- **`components/mindmap/MindMapCanvas.tsx`**（35KB）— simple-mind-map 引擎的 React 封装。
- **`components/mindmap/NodeDetailSidebar.tsx`**（32KB）— 节点详情面板（任务字段、Markdown 注释、附件、番茄钟、版本/颜色/优先级）。
- **`pages/ProjectMindMapPage.tsx`** — 项目视图外壳，调度数据保存 + Node 详情面板。
- **`pages/OutlinePage.tsx`** + **`components/outline/OutlineEditor.tsx`** — 大纲模式的同源编辑界面。

## MindMapCanvas

`simple-mind-map` 是框架无关的 SVG 思维导图库。本组件做了 5 件事：

1. **插件注册**（模块顶层，只执行一次）：

   ```ts
   MindMap.usePlugin(Export)
   MindMap.usePlugin(ExportPDF)
   MindMap.usePlugin(KeyboardNavigation)
   MindMap.usePlugin(Select)
   ```

2. **Instance 单例**：通过 `mindMapRef` 持久化。`initMindMap` 的依赖刻意留空，避免 React 重建 canvas 时闪烁；`projectId` 变化时调用 `instance.setData(latestTree)` 平滑切换，失败回退 `reinit`。
3. **暴露 imperative API**：`zoomIn/zoomOut/resetZoom/getZoom/updateActiveNode` 通过 `forwardRef + useImperativeHandle` 暴露给 `ViewHeader` 调用。
4. **保存回调**：`onDataChange(data, viewState?)` 在每次 `data_change` 后调用，外层 `ProjectMindMapPage` 写 IndexedDB + 推云端。`ProjectMindMapPage` 还会在根节点文本变化时把 `data.text` 同步回 `project.name`。
5. **任务同步防抖**（模块级 Map）：

   ```ts
   const taskSyncState = new Map<string, { latestData; timer }>()
   const taskSyncRunning = new Set<string>()
   ```

   快速键入（Tab + Enter）会触发毫秒级多次 `data_change`，这里用 80ms debounce + 互斥锁保证 `syncTasksFromTree` 不会并发跑。最终一帧仍在 sync 中时，会追加尾随（trailing）调用，确保最终状态一致。

### 可用布局

| key | 中文 | 适合 |
|-----|------|------|
| `logicalStructure` | 逻辑图（默认） | 标准项目树 |
| `mindMap` | 思维导图 | 发散创意 |
| `organizationStructure` | 组织结构 | 层级汇报 |
| `fishbone` | 鱼骨图 | 因果分析（schema 内已支持，UI 未展示切换） |

### 工具栏能力

- 增删节点（拖拽 / Tab / Enter）
- 转换为任务（toggle `data._isTask`，同时设默认颜色 `#eff6ff/#93c5fd/#1e40af`）
- 优先级 / 截止日期（写入 `_priority` / `_dueDate`）
- 删除选中节点、全部展开/折叠、Select 插件批量选
- 导出：PNG / SVG / Markdown / PDF / JSON（在 `Export` 菜单弹出）
- 缩放（View 接口 `view.enlarge/narrow/fit`） + 键盘导航（KeyboardNavigation 插件）

## NodeDetailSidebar

点击节点后，`useImperativeHandle` 把当前节点的 `data` 暴露到 `activeNodeData` state。面板有三个 Tab：

1. **任务**：复选框切换 `status`，优先级下拉写 `_priority`，日期选择器写 `_dueDate` → 统一调 `db.upsertTask` 写库并触发 mindmap 反向同步。
2. **注释**（`MarkdownPreview`）：轻量自研 Markdown 渲染（行内 `**bold** *italic* code [link](url)` + 列表）— 链接 URL 走 `safeLinkUrl` 拒绝 `javascript:/data:` 等危险协议。
3. **附件**（`attachments.ts`）：图片/PDF/纯文本，最大 5MB，目录 `${userId}/${taskId}/${uuid}.${ext}`，公开读 + 鉴权写 RLS（迁移 006）。

完成一个 focus 模式的番茄钟时（`PomodoroTimer` 内 effect），会调 `db.updateTaskWithMindmapSync(activeTaskId, { pomodoro_count: newCount })` → 画布上对应节点的 `data` 也被回写（`outline.ts` 的解析侧再读能拿到）。

## 数据保存：ProjectMindMapPage 协调三向写入

```
data_change 触发
   ├─► handleDataChange(data, viewState?)
   │      └─► db.mindmaps.update/set → syncMindmapToCloud
   └─► scheduleTasksSync(projectId, data)  // mindmap 内部
          └─► syncTasksFromTree(projectId, data)  // 重建 tasks 表
```

`handleViewStateChange(viewState)` 只更新 `view_state`（布局/选中节点），不重写 `tree_data`。

## 节点 ⇄ 任务 同源同步规则

- 导图节点 `data._isTask = true` 是任务的充要条件。`syncTasksFromTree` 在遍历时只挑这些节点。
- 任务 ID = `${projectId}-${nodeUid}`，DB 内 `[project_id+node_uid]` 唯一索引也保证不重复。
- 节点被删除时，`syncTasksFromTree` 会一次性 `bulkDelete` 该项目所有旧任务后再 `bulkPut` 当前仍带 `_isTask` 的部分，达到清理孤儿任务的目的。`AppLayout` 启动时再额外跑一次 `cleanupOrphanedTasks` 兜底（防止写入路径异常）。
- `runHealthCheck` 提供 `duplicate_node_uid` 检测，错误级而非警告，强制开发者手动修。

## Outline 双向编辑

`OutlinePage` 调 `OutlineEditor`，把同棵 `tree_data` 渲染成可点击编辑的扁平行：

- 缩进 = 层级，2 空格 = 1 级（与 `outline.ts#extractIndent` 一致）。
- 任务行通过前缀 `[ ]`/`[x]` 表示状态；`!高/!中/!低/!紧急` 表优先级；`@YYYY-MM-DD` 表截止日。
- 折叠/展开：`data.expand === false` 隐藏在嵌套子节点。
- 编辑后 `onTreeChange` 回调传回 `ProjectMindMapPage`，调用同一写库链路，因此导图和大纲永远不分歧。

`outline.ts` 也在 `ProjectMindMapPage` 内被用作「导图 → Markdown 文本」导出（节点形式直接复用 `treeToOutline`），保证导出内容与界面一致。

## AI 辅助生成 (`lib/aiMindMap.ts`)

`NewProjectDialog` 有一个 AI 开关。点击后调 `generateMindMapByAI({ theme })`：

1. 加载 `db.settings` 中的 `AIConfig`（base URL / apiKey / model / preferApi / enabled）。
2. 若 `enabled && apiKey && preferApi`：调 OpenAI 兼容接口 (`/chat/completions`)，用 `SYSTEM_PROMPT` 让模型返回标准 JSON，清理 markdown 代码块后返回。
3. API 失败或未配置 → 回退到本地引擎：`detectThemeType(theme)` 根据关键词命中 `product-dev / thesis / event-planning / weekly-plan / generic` 之一，决定走 `applyTemplate` 或 `createGenericTree`。
4. `tree_data` 落地后，照常 `syncTasksFromTree` → 自动产生一批初始任务。

## 模板系统 (`lib/templates.ts`)

`PROJECT_TEMPLATES` 5 个：`blank / product-dev / thesis / event-planning / weekly-plan`。每个模板由 `createNode(text, children, { isTask, priority, dueDays })` 构成。`applyTemplate` 把模板 `structuredClone` 后写根节点 `text = projectName`，返回纯 tree_data。`NewProjectDialog` 的颜色选择 + 模板缩略图就来自这里。
