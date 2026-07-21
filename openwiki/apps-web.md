# apps/web — 主应用

`apps/web` 是 MindFlow 的运行时核心。技术栈：React 19 + Vite 8 + TypeScript 6 + Zustand 5 + Dexie 4 + Supabase JS。Tailwind 3 + shadcn/ui 提供视觉系统。

## 应用启动

入口：`apps/web/src/main.tsx` 调 `createRoot(...).render(<App />)`。

```
createRoot
└── BrowserRouter
    └── ErrorBoundary
        └── <Routes>
            ├── /share/:token          ← 公共页（无需登录）
            ├── /auth                  ← 未登录重定向
            └── AppLayout (登录或本地模式)
                ├── /                  ← HomePage（有项目则自动跳最近项目）
                ├── /dashboard
                ├── /project/:id
                ├── /project/:id/outline
                ├── /project/:id/list
                ├── /project/:id/board
                ├── /global-tasks
                ├── /global-tasks/board
                ├── /calendar
                ├── /gantt
                └── /settings
```

路由级懒加载在 `App.tsx` 顶部声明，每个页面用 `React.lazy(() => import(...))` 单独 chunk，`Suspense` 提供 `Loader2` 转圈占位。

## 应用外壳 (`AppLayout`)

`components/layout/AppLayout.tsx` 完成这些副作用（仅登录路径下）：

1. **数据加载**：`useProjectStore.loadProjects()` + `cleanupOrphanedTasks()`。
2. **自动同步三触发点**：
   - 启动后 2s（用 `setTimeout` + 一次性 ref）。
   - `document.visibilitychange → visible`。
   - `window 'online'`（并显示 "网络已恢复" toast）。
3. **网络/离线提示**：`useSyncStore.status` 跟随 `navigator.onLine`，离线时 toast `已切换到离线模式`，恢复后立即触发同步。
4. **全局快捷键**：`Cmd/Ctrl + Shift + N` 打开新建项目弹窗（编辑态跳过，避免劫持输入框）。
5. **全局「NewProjectDialog」「PomodoroTimer」挂载**：始终在主区域内，独立打开/关闭，与具体路由解耦。

`Header`（`components/layout/Header.tsx`）：横向 48px 顶栏，依次为折叠侧栏按钮、品牌、全局搜索、通知钟、云同步指示器、PWA 安装、用户菜单。

`Sidebar`（`components/layout/Sidebar.tsx`，23KB）：左侧导航，包含

- 主导航：仪表盘 / 项目列表 / 全局任务 / 日历 / 甘特图 / 设置。
- "最近编辑"：前 4 个 `last_opened_at` 非空的项目。
- 项目列表：拖拽排序、行内重命名（点击项目名进入输入态）、右键菜单（重命名/归档/删除）+ 二次确认。
- 底部用户卡片：显示 `display_name` 与「已登录 / 本地模式 / 未登录」状态。

`NotificationPanel`（`components/layout/NotificationPanel.tsx`）：根据 `useTaskStore.allTasks` 实时分桶 `overdue / due_today / due_tomorrow`，点条目跳到 `/project/:id?nodeUid=...` 并定位导图节点。

`ViewHeader`（`components/layout/ViewHeader.tsx`）：项目视图上下文，每页共享布局（缩放/分享按钮/归档恢复）。

## 状态层（Zustand）

`stores/` 7 个 store，按职责切分，避免大块单一：

| Store | 关键字段 | 来源 |
|-------|----------|------|
| `useAuthStore` | `user`, `session`, `isAuthenticated`, `isLocalMode` | `supabase.auth.*` + persist |
| `useProjectStore` | `projects`, `archivedProjects`, `recentProjects`, `activeProjectId` | `lib/db.ts` helpers |
| `useTaskStore` | `projectTasks`, `allTasks`, `filters`, `sortBy`, `sortOrder` | `taskStore#applyFiltersAndSort` |
| `useSyncStore` | `status`, `lastSyncTime`, `lastError` | 模块级 `syncDebounceTimer` + `lastSyncTimestamp` |
| `useUIStore` | `sidebarCollapsed`, `sidebarWidth`, `detailSidebarWidth`, `theme`, `autoOpenSidebar`, `isSearchOpen`, `compactMode`, `projectViews` | persist |
| `usePomodoroStore` | `activeTaskId`, `taskTitle`, `timeLeft`, `isRunning`, `mode` (`focus/shortBreak/longBreak`), `sessionsCompleted` | persist |
| `useNotificationStore` | `notifications[]`, `isOpen`, `unreadCount` | 内存 |

`Auth` 与 `UI` 走 `persist` 中间件，`partialize` 限制落 `localStorage` 的子集（不保存 session，由 supabase auth 管理）。

## 公共基础设施 (`lib/`)

| 文件 | 内容 | 依赖方 |
|------|------|--------|
| `db.ts` | Dexie 初始化 + CRUD 帮手 + 数据完整性 | 几乎所有页面 |
| `sync.ts` | 上行/下行 `from('projects'/'mindmaps'/'tasks').upsert/delete` + `migrateLocalDataToCloud`、`fetchAllFromCloud` | `syncStore`、`ProjectMindMapPage`、`SettingsPage` |
| `supabase.ts` | `createClient<Database>(...)` 单例 | 所有 Supabase 调用 |
| `templates.ts` | 5 个 `PROJECT_TEMPLATES` + `applyTemplate/createNode` | `NewProjectDialog`、`aiMindMap` |
| `aiMindMap.ts` | 主题语义识别 + 本地规则引擎 + 可选 OpenAI 兼容 API | `NewProjectDialog`（AI 开关） |
| `outline.ts` | 树↔大纲文本互转 + 任务标记语法 (`[ ] / [x] / !高 / @YYYY-MM-DD`) | `OutlinePage`、`OutlineEditor` |
| `share.ts` | `createSharedLink` / `getSharedLink` / `deleteSharedLink` / `getProjectSharedLinks` / `buildShareUrl` | `ProjectMindMapPage`, `SharePage` |
| `attachments.ts` | Supabase Storage 上传/删除 + 文件大小与 MIME 校验 | `NodeDetailSidebar` |
| `sanitize.ts` | `sanitizeText`/`sanitizeUrl`/`safeLinkUrl` — DOMPurify wrapper | `NodeDetailSidebar`（Markdown 链接） |
| `devConsole.ts` | `devLog/devWarn/devError`，仅 dev 输出，prod tree-shaken | 散落 |
| `utils.ts` | `cn()` className 合并工具 | 几乎所有组件 |

## Vite 配置要点 (`apps/web/vite.config.ts`)

- 别名 `'@'` → `./src`，便于 `@/lib/db` 风格引用。
- `VitePWA({ registerType: 'autoUpdate', skipWaiting, clientsClaim, manifest, runtimeCaching: Google Fonts CacheFirst })`。
- `workbox.globPatterns` 预缓存所有 js/css/html/svg/png/ico/woff2。

## 主题与设计系统

- 主色：`primary` 色阶 (50–900)，`DEFAULT = '#7C5CFC'`（紫色调）。
- 项目色：6 种预设 (`indigo / teal / amber / rose / emerald / violet`)，应用于任务卡片头部、Sidebar 项目条目、看板列背景。
- 优先级色：`priority.high/medium/low/urgent` 对应红/橙/蓝/深红。
- 状态色：`status.success/warning/error`。
- 暗色模式：`tailwind.config.js` 用 `darkMode: ['class', '[data-theme="dark"]']`；`useTheme()` 钩子把当前主题写到 `document.documentElement[data-theme]`。
- 字体：默认 Geist Variable (`@fontsource-variable/geist`)；HTML 头部额外预连接 Google Fonts（仅在请求时拉取，由 Workbox 缓存）。
- `tw-animate-css` 提供 `animate-spin/pulse` 等快捷类。

## 已知工程细节

- 大文件：`MindMapCanvas.tsx`（35KB）、`NodeDetailSidebar.tsx`（32KB）、`ProjectList.tsx`（11KB）。每个都被独立 lazy chunk 隔离。
- `oxlint` 替代 ESLint，启用 React Hooks 规则。
- `tsconfig.app.json` 与 `tsconfig.node.json` 分离，绑定 Vite 编译上下文。
- 没有真实的 CDN 资源路径；所有静态资源引用走相对 `/favicon.svg`、`/icons.svg`、`/_redirects`。
- `apps/web/public/_redirects` 用于 SPA fallback（部署到 Cloudflare Pages / Netlify 时使用）。
