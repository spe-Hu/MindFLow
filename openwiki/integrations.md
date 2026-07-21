# 集成层：Supabase / 同步 / 分享 / 附件 / AI / 安全

## Supabase 客户端

`apps/web/src/lib/supabase.ts` 创建并配置单一 client：

```ts
createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken, persistSession, detectSessionInUrl },
  realtime: { params: { eventsPerSecond: 10 } },
})
```

`auth.persistSession=true` 让 supabase-js 自动把 session 写 `localStorage`，`useAuth.useEffect` 在 `onAuthStateChange` 上订阅三类事件：`SIGNED_IN`（重新 `initSession`）、`SIGNED_OUT`（清空 store）、`TOKEN_REFRESHED`（只更新 session）。

环境变量：`apps/web/.env.example` 仅声明 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 两个占位符。不配置也能跑（无云端能力）。

## 同步层

`apps/web/src/stores/syncStore.ts` 是同步协调中枢，对外只暴露两个入口：

- `useSyncStore.doAutoSync()`：核心双向同步。
- `scheduleAutoSync()`：全局可调用的 debounced 入口，启动/聚焦/网络恢复都走它。

`doAutoSync` 流程：

1. 用户未登录 / 离线 → 早退。
2. 模块级 `lastSyncTimestamp` 节流 30s；同一时间只跑一次（`syncDebounceTimer` 重入）。
3. **Push 阶段**：从 Dexie 读全部 `projects / mindmaps / tasks`，并行 `upsert` 上云（单条失败收集到 `pushErrors`，不阻塞其他）。
4. **Pull 阶段**：`fetchAllFromCloud()` 拉全部云端数据，`db.transaction('rw', ...)` 中 `bulkPut` 覆盖本地（云端为权威）。
5. 结束后调用 `useProjectStore.loadProjects()` 刷新 UI，写 `mindflow-last-sync-time`。

手动同步入口：`SettingsPage → 云端同步` 调用同一 `doAutoSync`。

`lib/sync.ts` 提供单条同步原语：`syncProjectToCloud`、`syncMindmapToCloud`、`syncTaskToCloud` 与对应 `deleteXxxFromCloud`，被 `lib/db.ts` 的 `upsertXxx/deleteXxx` 在每个写操作后调用，形成 `IDB → cloud` 的即时链路。

## 共享链接

`lib/share.ts` 是独立模块，提供：

| 函数 | 行为 |
|------|------|
| `createSharedLink(projectId, projectName, treeData, layout)` | 生成 12 字符 token，snapshot 存 `shared_links` 表 |
| `getSharedLink(token)` | 通过 token 单行 select，无需登录；带过期校验 |
| `getProjectSharedLinks(projectId)` | 项目下当前用户的所有分享链接（管理用） |
| `deleteSharedLink(token)` | 撤销链接 |
| `buildShareUrl(token)` | `${window.location.origin}/share/${token}` |

`SharePage` 路由 `/share/:token`，公开访问；`simple-mind-map readonly: true`，附禁止 mousewheelAction='zoom' / `enableFreeDrag: false` 等只读配置。

迁移 005 加了 RLS：任何人可 SELECT（按 token 拉），创建者才能 INSERT/DELETE。

## 附件系统

`lib/attachments.ts` 在登录且在线前提下工作。

约束：
- `BUCKET = 'mindflow-attachments'`
- `MAX_SIZE = 5MB`
- 允许 MIME：`image/png | image/jpeg | image/gif | image/webp | application/pdf | text/plain`

路径约定：`${userId}/${taskId}/${uuid}.${ext}`。Storage 策略（迁移 006）：
- 公开读。
- 认证用户上传/更新/删除时强制 `storage.foldername(name)[0] = auth.uid()::text`。

`uploadAttachment` 成功后把元数据 `{ id, name, size, type, url, path, createdAt }` 写入 `tasks.attachments` JSONB 数组，`NodeDetailSidebar` 内渲染 `<img>` 或下载链接。删除同时调 `deleteAttachment(path)` 并 splice 数组。

## AI 生成

`lib/aiMindMap.ts` 实现"双轨"引擎：

```
generateMindMapByAI({ theme, preferApi? })
    │
    ├─ 加载 AIConfig (db.settings 中的 ai-* 键)
    │
    ├─ 若 preferApi / apiKey 命中 → callLLMForMindMap
    │      └─ POST {baseUrl}/chat/completions（OpenAI 协议）
    │
    └─ 回退 detectThemeType(theme) → applyTemplate / createGenericTree
```

LLM 调用包装了 `SYSTEM_PROMPT`，模型被要求按 simple-mind-map 标准 JSON 返回（含 `_isTask / _status / _priority / _dueDate`），并指示清理 ```json 标记后 parse。

UI 侧：`NewProjectDialog` 的「AI 智能生成」开关触发，落地后模板走相同的 `syncTasksFromTree` 流程把 AI 标记的任务同步进 `tasks`。

## 安全与消毒

`lib/sanitize.ts`：

- `sanitizeText(s)`：DOMPurify `ALLOWED_TAGS: []`、`ALLOWED_ATTR: []`，剥掉所有 HTML。
- `sanitizeUrl(s)`：仅允许 `http(s):` 与 `mailto:`。
- `safeLinkUrl(s)`：guard 列表拒绝 `javascript: / data: / vbscript: / blob: / file:`。

`NodeDetailSidebar` 解析 Markdown 链接时调用 `safeLinkUrl`，避免节点里写 `<a href=javascript:...>` 触发 XSS。

`lib/devConsole.ts` 把 `console.log/warn/error` 包成 `devLog/devWarn/devError`，仅 dev 输出。生产构建靠 `import.meta.env.DEV` 让 Vite 把这些调用整条 tree-shake 掉。

## 键盘快捷键汇总

- `Cmd/Ctrl + Shift + N`：新建项目（`AppLayout` 注册）。
- 全局搜索按钮在 Header 上有 `Cmd+K` 视觉提示；搜索弹窗本身由 `useUIStore.setSearchOpen(true)` 触发，目前未自动绑定键位（Yak 行为，按需补）。
- simple-mind-map 内部：`Tab` 加子节点，`Enter` 加同级，`Delete` 删节点 — 由 `KeyboardNavigation` 插件处理。

## PWA & 离线

- `vite-plugin-pwa` (`registerType: 'autoUpdate'`) + Workbox precache。
- Google Fonts 走 CacheFirst（一年 max-age）。
- `skipWaiting: true` + `clientsClaim: true` 让新 SW 立即接管。
- `usePWA` 钩子暴露 `installPrompt` / `isInstalled` / `install()`，Header 在 `installPrompt` 非空时显示"安装 PWA"按钮。

## 真实环境能力清单

需要在生产部署前就绪的：

| 能力 | 当前状态 |
|------|---------|
| Supabase 项目 | 仅在 `.env.local` 注入；密钥不入仓 |
| Storage bucket | 迁移 006 创建 `mindflow-attachments` |
| 公开分享路由 | `/share/:token` 已就位，未登录可用 |
| 离线模式（IndexedDB） | 默认开启，无需任何配置 |
| AI 配置 | UI 已实现；API 调用走用户自填 Key，不在仓库内 |
| 暗色模式 | `useTheme()` + CSS 变量已联动 |
| PWA 安装 | 浏览器触发 `beforeinstallprompt` 后可装 |
