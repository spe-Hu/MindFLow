# 架构

MindFlow 运行时是单页 React 应用，本地优先 + 可选云同步，由 Zustand 状态层协调多源数据。

## 技术栈

| 层级 | 选型 | 备注 |
|------|------|------|
| 渲染 | React 19 + Vite 8 + TypeScript 6 | 路由级懒加载 |
| 状态 | Zustand 5（含 persist 中间件） | 6 个独立 store + 持久化子集 |
| 本地存储 | Dexie 4（IndexedDB 封装） | 4 表结构 + 数据完整性检查 |
| 云端 | Supabase JS 2.x | Auth + Postgres + Storage + Realtime |
| 思维导图引擎 | simple-mind-map 0.14 | 加载 `KeyboardNavigation` / `Export` / `ExportPDF` / `Select` 4 个插件 |
| UI 组件 | shadcn/ui + Tailwind CSS 3 | 自研封装（`apps/web/src/components/ui/*`） |
| Markdown / XSS | DOMPurify 3 | 仅允许受信任协议 |
| 番茄钟 | 自研 Zustand store + SVG 进度环 | 时间刻度由 `setInterval` 驱动 |
| PWA | vite-plugin-pwa（Workbox） | `autoUpdate` + Google Fonts CacheFirst |
| 落地页动效 | framer-motion 12（仅在 `apps/landing`） | 与主应用隔离 |

## 运行时数据流

```
┌──────────────────────────────────────────────────────────────────┐
│                          React UI 层                              │
│  pages/* ─┐                                                      │
│            ├─► components/* ──► Zustand stores ──► React 重渲染   │
│  hooks/* ─┘                                                       │
└────────────┬───────────────────────────────────────────────────┬─┘
             │ useEffect 副作用                                  │ view_state 直写
             ▼                                                   ▼
┌────────────────────────────────┐                ┌────────────────────────┐
│   Zustand Stores               │                │  simple-mind-map       │
│   authStore                    │                │  MindMapCanvas         │
│   projectStore ──► lib/db.ts   │                │  + 4 个 plugin         │
│   taskStore     (Dexie)        │  tree_data ◄──►│  (focus/keyboard/      │
│   syncStore     ▲              │                │   export/select)       │
│   uiStore       │              │                │                        │
│   pomodoroStore │  push upsert │                └────────────────────────┘
│   notification  ▼              │
│   Store                        │                ┌────────────────────────┐
└────────────┬───────────────────┘                │  React Router v7       │
             │                                    │  /project/:id          │
             ▼                                    │  /project/:id/outline  │
┌────────────────────────────────┐                │  /global-tasks         │
│  Supabase JS                   │                │  /share/:token (公共)  │
│  - auth (signInWithPassword)   │                └────────────────────────┘
│  - from('projects').upsert()   │
│  - storage.from('mindflow-…').upload()
│  - shared_links queries        │
└────────────────────────────────┘
```

## 模块清单（apps/web）

| 目录 | 职责 |
|------|------|
| `pages/` | 顶层路由组件：项目视图（导图/列表/看板/大纲）、全局视图（日历/甘特/看板/任务）、仪表盘、设置、登录、只读分享 |
| `components/layout/` | 应用外壳：`AppLayout`、`Header`、`Sidebar`、`ViewHeader`、`NotificationPanel` |
| `components/mindmap/` | 思维导图核心：`MindMapCanvas`（35KB,核心）、`NodeDetailSidebar`（32KB,含 Markdown 渲染/附件上传） |
| `components/task/` | 项目看板三列、`TaskCard`、`TaskFilterBar` |
| `components/global/` | 跨项目看板/列表（带项目分色头部） |
| `components/project/` | `NewProjectDialog`（含模板选择 + AI 生成开关）、`ProjectList` |
| `components/outline/` | 大纲编辑器，contentEditable 行级编辑，树↔扁平化互转 |
| `components/pomodoro/` | 浮动番茄钟面板 |
| `components/search/` | 全局 Cmd+K 搜索覆盖项目/节点/任务 |
| `components/sync/` | `SyncMigrationDialog`（登录后引导迁移）、`SyncStatusIndicator`（Header 中云朵图标） |
| `components/ui/` | shadcn/ui 风格原子组件（button、dialog、select、tabs、tooltip 等）、`ErrorBoundary` |
| `stores/` | 全部 Zustand store |
| `lib/` | 基础设施：`db`、`sync`、`supabase`、`templates`、`aiMindMap`、`outline`、`share`、`attachments`、`sanitize`、`devConsole` |
| `hooks/` | `useAuth`（订阅 supabase auth 事件）、`useTheme`（同步 `data-theme` 属性到文档根）、`usePWA`（捕获 `beforeinstallprompt`） |
| `types/` | Supabase generated-style 数据库类型 + Insert/Update 类型 |

## 关键共享不变量

1. **`project_id` 是稳定的 string ID**（`${Date.now()}-${random}`）而不是 UUID，云端 `projects.id` 也保持 `text` 而非 `uuid`，便于本地/云端对接。`migration 002_alter_uuid_to_text.sql` 记录这次调整。
2. **思维导图节点 `uid` 在项目内唯一**，靠 Dexie 索引与 `mindmaps.tree_data` 中的双向位置维护。`runHealthCheck` 会扫重复。
3. **任务 ID = `${projectId}-${nodeUid}`**（在 `syncTasksFromTree` 内），保证一个节点对应唯一任务行，重建任务集不会产生重复。
4. **写顺序：IDB → 云端**。`upsertTask/upsertProject` 先写 IndexedDB 再尝试 push，云端失败不阻塞本地。
5. **同步策略：推送优于拉取**。`syncStore.doAutoSync()` 先 push 全部本地行 → 再 pull 云端覆盖本地，避免反向丢失。

## 启动序列

`main.tsx → App → useAuth() → useTheme()`：

1. `useAuth.initSession()` 调 `supabase.auth.getSession()`，根据 `users` 扩展表填充 `useAuthStore.user`。
2. `useAuthStore.subscribe` 监听 `SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED`。
3. `App` 看 `isAuthenticated || isLocalMode`，未登录则 `<Navigate to="/auth" />`。
4. `AppLayout`（已登录路径）`useEffect` 里调用 `projectStore.loadProjects()` 与 `cleanupOrphanedTasks()`（数据完整性），并注册 3 个同步触发点（启动 2s 后、窗口可见性变化、网络恢复）。
5. 注册全局快捷键：`Cmd/Ctrl + Shift + N` 打开新建项目弹窗（`AppLayout.tsx`）。
6. `PomodoroTimer` 与 `NewProjectDialog` 始终挂在应用层（`App.tsx` 的兄弟级），独立打开/关闭。

## 错误兜底

- 顶层 `<ErrorBoundary>` 捕获整棵子树崩溃，显示「刷新 / 返回首页」两个按钮（`components/ui/ErrorBoundary.tsx`）。
- Dev-only：`window.__mindflowDb = db`（`db.ts` 末尾）让 E2E 测试可以清空 IndexedDB。
- 同步失败：`useSyncStore.status = 'error'`，Header 同步指示器变红色并悬停弹错误详情。

## 性能小贴士

- 在 `db.ts` 顶部若干 `devWarn` 而非 `console.warn`，生产构建被 Vite tree-shaking 完全剔除。
- `new RegExp(...)` 与 `Date.parse` 频繁的代码路径集中在 `outline.ts` / `aiMindMap.ts` / `notificationStore.ts`，使用 `Map`/字典缓存避免 N²。
- MindMapCanvas 通过 `Module-level Map` 维护每个项目的 debounced `syncTasksFromTree`，避免毫秒级连按 Tab 触发并发。
