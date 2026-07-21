# 项目 / 任务 / 生产力视图

围绕「同一个节点也是任务」这一核心，把工作分解、追踪、汇总拆成几个相互独立但共享同一个 `localStorage` 状态的视图。

## 项目管理

### 创建
- **入口 1**：Sidebar 顶部「+」按钮，调 `useUIStore.setNewProjectDialogOpen(true)`。
- **入口 2**：全局快捷键 `Cmd/Ctrl + Shift + N`（在 `AppLayout` 注册）。
- **入口 3**：`HomePage` 中央按钮（首次无项目时自动跳转）。

`components/project/NewProjectDialog.tsx` 流程：

1. 输入名称、选颜色（6 选 1）、选模板（5 个）。
2. `next-sort-order` = 现存最大 + 1（不直接用 `Date.now()`，避免 2026+ 后溢出 PostgreSQL `int`）。
3. 调 `useProjectStore.addProject(project)`，写入 IDB 并自动 `syncProjectToCloud`。
4. 模板化导图（`applyTemplate` 或 `generateMindMapByAI`）→ 写到 `mindmaps` 表 → `syncMindmapToCloud`。
5. 立刻调 `syncTasksFromTree` 把模板中带 `_isTask=true` 的节点入 `tasks`。

### 切换与活跃态
- `useProjectStore.activeProjectId` 由 `setActiveProject(id)` 写入，同时更新 `last_opened_at`。
- Sidebar 拖拽改 `sort_order`，`reorderProjects` 用 IDB 事务批量写。

### 重命名 / 归档 / 删除
- 重命名：点击项目名 → 进入输入态，回车提交；或右键菜单触发。
- 归档：Sidebar 右键菜单或 Settings → 存储。归档项目从普通视图消失，移到 `archivedProjects`。
- 删除：硬删除（同时 deleteProject → 删 `projects + mindmaps + tasks + shared_links`），二次确认对话框。

### 状态管理（store）
- `projects` / `archivedProjects` / `recentProjects` 分别按过滤规则维护。
- `loadProjects` 主流程：读 `db.projects.orderBy('sort_order')`，过滤 `!is_archived`，同时触发 `loadRecentProjects`(前 4 个最近打开)。

## 任务视图

### 三种项目内视图
- **看板**：`pages/ProjectBoardPage.tsx` → `components/task/TaskBoard.tsx` + `TaskCard.tsx`。三列：To Do / In Progress / Done。卡片支持拖拽。
- **列表**：`pages/ProjectListPage.tsx` → `TaskList.tsx`。紧凑列表视图，优先级点 + 状态行内修改。
- **任务筛选**：`TaskFilterBar.tsx` 提供状态 / 优先级 / 截止日期（今天/本周/已过期/无）三种筛选 + 排序。

### 全局任务
- `pages/GlobalTasksPage.tsx` + `components/global/GlobalTaskList.tsx`：跨项目扁平列表，按 `useTaskStore.filters` + `sortBy/sortOrder` 排序；点击条目跳到 `/project/:id?nodeUid=:uid`。
- `pages/GlobalBoardPage.tsx` + `components/global/GlobalTaskBoard.tsx`：按项目分组的看板，每组内有「待办 / 进行中 / 已完成」三列，颜色与项目色一致。
- `pages/DashboardPage.tsx`：5 张统计卡 + 项目进度条 + 本周截止 + 高优任务，概览全局状况。

### 日历视图 (`pages/CalendarPage.tsx`)
月视图 + 周视图双模式，任务按 `due_date` 着色（项目色）。点击任务跳转节点。

### 甘特图 (`pages/GanttPage.tsx`)
按项目分组的时间线视图；任务无 `start_date/duration_days` 时根据优先级套默认时长（urgent=1, high=2, medium=3, low=5 天）。支持周导航与点击定位。

### 视图切换持久化
- 项目视图偏好：`useUIStore.projectViews[projectId] = 'mindmap' | 'list' | 'board' | 'outline'`，在 `uiStore` 内 persist。
- Sidebar 的 `ViewHeader` 在项目页会自动根据偏好切换（在 `ProjectMindMapPage` / `OutlinePage` / `ProjectListPage` / `ProjectBoardPage` 之间）。

## 番茄钟

`stores/pomodoroStore.ts` 持久化焦点 / 休息状态；`components/pomodoro/PomodoroTimer.tsx` 渲染浮动面板。

模式：`focus (25m) → shortBreak (5m) → focus → shortBreak → focus → shortBreak → focus → longBreak (15m)`，每 4 个 focus 一次长休息。

关键事件：
- 用户从 `TaskCard` 上的 `Timer` 图标启用 → `start(taskId, title)`。
- `setInterval(1000)` → `tick()` → 时间归 0 时 `mode` 切换，`sessionsCompleted+1`，触发 `justCompleted=true`。
- 完成 focus 后副作用：`db.updateTaskWithMindmapSync(activeTaskId, { pomodoro_count: +1 })`；toast 通知。
- 完成 break 后：纯提示，不改业务数据。

## 全局搜索 (`components/search/GlobalSearch.tsx`)

- 触发：Header 「全局搜索」按钮 / `Cmd+K` 快捷键（仅快捷键存在 UI 中，但实际触发是 `useUIStore.setSearchOpen`）。
- 命中范围：项目名、导图节点文本、任务标题。
- 跳节点：点击结果后 `/project/:id?nodeUid=:uid`，`ProjectMindMapPage` 通过 URL 参数高亮节点。

## 通知 (Header 铃铛)

`stores/notificationStore.ts#generateFromTasks` 按 `due_date` 把任务分到 `overdue / due_today / due_tomorrow`，排序：overdue 优先。打开通知面板一次性 `markAllRead`。点击任务跳转同搜索。

## 同步状态指示 (Header 云朵)

`stores/syncStore.ts#status` ∈ `idle / syncing / error / offline`，`SyncStatusIndicator` 把状态映射到图标 + tooltip 显示「上次同步 X 秒前」。未登录用户直接隐藏。

## 设置 (`pages/SettingsPage.tsx`)

Tabs（导航 + 内容滚动同步）：
- **账户**：显示当前用户、`退出登录` 按钮。
- **云端同步**：显示同步状态、迁移对话框按钮（`SyncMigrationDialog`）、导出/导入 JSON、健康检查 + 一键修复（`runHealthCheck` + `fixHealthIssues`）。
- **外观**：主题切换（light/dark/system，与 `useTheme()` 协作）、详情面板宽度滑块、侧边栏宽度、自动展开节点详情开关、紧凑模式。
- **AI 助手**：配置 OpenAI 兼容 API（启用、Key、Base URL、模型、是否优先 API）。保存到 `db.settings`。
- **存储**：展示 `getStorageStats()` 项目数 / 任务数 / 估算占用、归档项目列表（恢复 / 永久删除）。
- **快捷键**：罗列所有快捷键。

## 仪表盘 (`pages/DashboardPage.tsx`)

5 张统计卡（项目 / 任务 / 已完成 / 逾期 / 进行中） + 每个项目的进度条 + 本周截止列表 + 高优任务列表。点击统计卡路由到对应视图。

## 共享链接（只读）

入口：`ViewHeader` → 分享按钮 → `ProjectMindMapPage#handleShare`：

1. 调 `createSharedLink(projectId, name, treeData, layout)` 生成 12 字符 token。
2. 把当前 `snapshot` 写入 `shared_links` 表。
3. `buildShareUrl(token)` 拼 `${window.location.origin}/share/${token}` 复制到剪贴板。
4. `SharePage` 根据 token 取 snapshot，`simple-mind-map readonly: true` 渲染，不要求登录。

## HomePage 逻辑

`useEffect` 监听 `projects`：有项目时直接 `navigate('/project/' + 最近打开的 id)`，否则显示空状态 CTA。

## 首页/落地页（`apps/landing`）

与主产品隔离。framer-motion 动画 + Phosphor Icons，sections: Navbar + Hero / Features / HowItWorks / SocialProof / CTA / Footer + 背景 `BackgroundOrbs`。独立 `tailwind.config.js` + `vite.config.ts`。主色调 `#7C5CFC` 与主产品保持一致。
