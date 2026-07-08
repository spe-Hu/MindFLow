# MindFlow MVP 自动迭代记录

## 2026-07-08 第 45 次执行 — 同步 GitHub + Cloudflare 到最新版本

**背景**: 自动化触发后，用户询问 GitHub 和 Cloudflare 是否最新。扫描发现本地 master 领先 origin 7 个 commit（含附件上传、分享链接、E2E 修复等），且 Cloudflare 最新 Production 部署为 19 小时前，已落后。

**改动**:
1. 提交未提交的改动：
   - `tests/e2e/journey-10.ts` + `journey-10.spec.ts` — 新增 E2E 测试：只读分享链接 + 节点附件上传
   - `tests/e2e/journey-4.ts` — headless 下节点点击稳定性改进（mouse.click + boundingBox）
   - `tests/e2e/journey-8.ts` — 看板卡片选择器修正
   - `.workbuddy/` memory 同步
2. `git push` → GitHub master 已更新至 `e140411`
3. `wrangler pages deploy --branch=master` → Preview 部署 `cd336217.mindflow-app.pages.dev`
4. `wrangler pages deploy --branch=main` → Production 部署 `4e340fae.mindflow-app.pages.dev`
5. Build 零 errors ✅ | PWA 37 entries 预缓存

**状态**: GitHub ✅ | Cloudflare Preview ✅ | Cloudflare Production ✅

---

## 2026-07-08 第 44 次执行 — 节点图片/文件附件上传（C5 补完）

**背景**: PRD v1.1 全部 Must/Should Have 已完成，Could Have 仅剩 C5 文件附件。本轮补完最后一个 PRD 功能缺口。

**改动**:
1. `supabase/migrations/006_add_attachments.sql` — tasks 表加 `attachments` JSONB 列 + Storage bucket `mindflow-attachments` + RLS 策略
2. `src/lib/attachments.ts` — 上传/删除/格式化工具函数，5MB 限制，支持 PNG/JPG/GIF/WEBP/PDF/TXT
3. `src/lib/db.ts` — `LocalTask` + `AttachmentItem` 接口，`attachments` 字段
4. `src/lib/sync.ts` — `syncTaskToCloud` 携带 `attachments` payload
5. `src/types/supabase.ts` — Task/Insert/Update 类型补全 `attachments` + `pomodoro_count`
6. `src/components/mindmap/NodeDetailSidebar.tsx` — 新增「附件」Tab（粘贴上传/文件选择/缩略图/放大查看/下载/删除），附件数量角标
7. `docs/PRD.md` — C5 标记 ✅ + §11 迭代记录追加

**验证**: Build 零 errors ✅ | Lint 0 errors, 14 warnings（均为已有）✅ | commit `f25abcd`

**里程碑**: PRD v1.1 功能 100% 覆盖！Must Have 15/15 ✅ | Should Have 6/6 ✅ | Could Have 16/16 ✅

---

## 2026-07-08 第 43 次执行 — 只读分享链接（Snapshot 模式）

**背景**：项目现状扫描发现 MVP v1.1 Must/Should Have 全部完成，Could Have 仅剩 C2 分享协作和 C5 文件附件。本轮选择实现 C2 基础版（只读分享链接），补完 PRD 所有 Could Have（除文件附件外）。

**改动**：
1. `supabase/migrations/005_add_shared_links.sql` — 新建 `shared_links` 表（snapshot JSONB + RLS 策略），迁移已 push 到 remote ✅
2. `src/frontend/src/lib/share.ts` — 分享工具函数封装：createSharedLink / getSharedLink / deleteSharedLink / buildShareUrl / getProjectSharedLinks
3. `src/frontend/src/pages/SharePage.tsx` — 公共 `/share/:token` 路由，无需登录。Snapsho 模式只读渲染 simple-mind-map（`readonly: true`），含缩放控制、复制链接、MindFlow brand footer、加载/错误状态
4. `src/frontend/src/components/layout/ViewHeader.tsx` — 思维导图视图新增 Share2 图标按钮，点击生成 token 并自动复制链接到剪贴板（toast 反馈）
5. `src/frontend/src/pages/ProjectMindMapPage.tsx` — 实现 handleShare 回调，从当前 mindmap prop + IndexedDB 读取项目数据生成分享链接
6. `src/frontend/src/App.tsx` — React.lazy 懒加载 SharePage 路由，放在认证逻辑外（公共访问）
7. `docs/PRD.md` — C2 标记 ✅ + §11 迭代记录追加

**验证**：Build 零 errors ✅（2.01s）｜Supabase migration 005 已推送到 remote ✅｜commit `52f3fb3`

---

## 2026-07-08 第 42 次执行 — 项目现状扫描 + PRD 同步 + E2E 清理

**背景**：自动化触发后扫描项目状态，发现 MVP v1.1 全部 Must/Should Have 已完成，Could Have 仅剩文件附件和协作分享。本轮以「 housekeeping + 文档同步」为主，无新功能开发。

**改动**：
1. `docs/PRD.md` — §11 迭代记录表补全 39~41 次迭代（消除动态导入警告 / 消除项目切换闪烁 / 思维导图工具栏增强）
2. `tests/e2e/journey-8.ts` — 移除迭代 41 遗留的临时 DIAG debug 代码块；保留 portal 作用域选择器修复（`[data-base-ui-portal]`）防止 Sheet 遮挡下误点画布按钮
3. `tests/e2e/journey-9.ts` — 选择器适配当前 UI：新建项目按钮改为 `aria-label` 选择、路由改为 `/`、提交按钮改为文案匹配

**验证**：Build 零 errors ✅（1.95s）｜commit `e293b34`

---

## 2026-07-08 第 41 次执行 — 思维导图工具栏增强（删除按钮 + 展开折叠 + 框选）

**背景**：项目现状扫描发现 Must/Should Have 全部完成，Could Have 仅剩分享协作和文件附件。本轮选择投入小、体验提升明显的打磨项。

**改动**：`src/components/mindmap/MindMapCanvas.tsx`
1. 注册 `Select` 插件（simple-mind-map 内置），支持右键拖拽框选多节点
2. 浮动工具栏新增「删除节点」按钮（Trash2 图标），调用 `REMOVE_NODE` 命令，补齐此前只能靠键盘 Delete 的缺失
3. 布局切换器右侧新增「展开全部」（ChevronsDown）和「折叠全部」（ChevronsUp）按钮，调用 `EXPAND_ALL` / `UNEXPAND_ALL`
4. 底部键盘提示更新，增加「右键框选」「Delete 删除」

**验证**：Build 零 errors ✅｜Lint 0 errors（40 warnings 均已有）✅｜commit `b237362`

---

## 2026-07-07 第 40 次执行 — 消除项目切换时思维导图闪烁

**背景**：用户反馈「在不同项目之间切换时，思维导图界面会明显闪一下」。

**根因**：MindMapCanvas 的 useEffect 依赖 `[initMindMap, projectId]`，切换项目时 cleanup `destroy()` 旧实例 → reinit `new MindMap()` 新实例，画布先白后重建。

**改动**：`src/components/mindmap/MindMapCanvas.tsx` — 单例 instance 模式改造：
1. 所有动态 prop 通过 ref 获取（onDataChangeRef/highlightNodeUidRef/mindmapRef/onViewStateChangeRef/onZoomChangeRef）
2. `initMindMap` useCallback 依赖清空（`[]`），只在 mount 时创建一次 instance
3. mount useEffect 空依赖 + 新增 data update effect：projectId/mindmap 变化时调用 `instance.setData()` 平滑更新，失败时回退 reinit
4. 新增 highlightNodeUid effect：单独处理全局导航高亮
5. layout effect 保持不变，继续使用 `setLayout()`

**验证**：Build 零 errors + 零 warnings ✅｜Cloudflare Pages 部署 → https://573982e3.mindflow-app.pages.dev ✅｜GitHub push → master ✅

---

## 2026-07-07 第 39 次执行 — 消除 INEFFECTIVE_DYNAMIC_IMPORT 构建警告

**背景**：Build 输出长期存在 3 个 `INEFFECTIVE_DYNAMIC_IMPORT` 警告，影响构建优化效果和代码整洁度。

**根因**：projectStore、templates、db 三个模块被 `await import()` 动态导入的同时，也被大量组件静态导入，导致 Vite 无法将其拆分为独立 chunk，动态导入失去意义。

**改动**：
1. `src/stores/syncStore.ts` — projectStore 从 `await import('./projectStore')` 改为顶部同步导入
2. `src/lib/aiMindMap.ts` — templates 的 `applyTemplate`/`getTemplateById` 从动态导入改为顶部同步导入（与已有的 `createNode` 统一）
3. `src/components/project/NewProjectDialog.tsx` — `syncTasksFromTree` 从动态导入改为同步导入（db 已在顶部静态导入）

**验证**：Build 零 errors + 零 warnings（原 3 个 INEFFECTIVE_DYNAMIC_IMPORT + chunk size 提示）✅｜Lint 0 errors ✅｜commit `f8ac84a`

---

## 2026-07-07 第 38 次执行 — Lint 错误清理 + 运行时 bug 修复

**背景**：项目扫描发现 4 个 lint errors（含 1 个运行时崩溃风险 + 1 个 React hooks 规则违例）和 28 个 warnings。

**改动**：
1. `src/frontend/src/pages/ProjectBoardPage.tsx` — 补全缺失的 `EmptyState` 导入（看板列为空时运行崩溃）
2. `src/frontend/src/components/sync/SyncStatusIndicator.tsx` — 将 `useEffect` 移到 `if (!user) return null` 之前，修复 React hooks 规则违例
3. `src/frontend/src/components/mindmap/MindMapCanvas.tsx` — 为 `MindMap.usePlugin()` 添加 oxlint ignore 注释（false positive，非 React Hook）
4. `src/frontend/src/components/outline/OutlineEditor.tsx` — 移除未使用的 `useId` 导入
5. `src/frontend/src/pages/OutlinePage.tsx` — 移除未使用的 `toast` 导入
6. `src/frontend/src/stores/syncStore.ts` — 移除未使用的 `get` 参数
7. `docs/PRD.md` — §11 迭代记录补全

**验证**：Build 零 errors ✅｜Lint 0 errors ✅（从 4 errors + 28 warnings 降至 0 errors + 22 warnings）

---

## 2026-07-07 第 37 次执行 — Sidebar 项目列表拖拽排序

**背景**：用户管理多个项目时，侧边栏项目列表始终按 `sort_order` 排序，但用户无法手动调整项目顺序，这是常见的高频交互痛点。

**改动**：
1. `src/frontend/src/components/layout/Sidebar.tsx` — 新增 HTML5 drag-and-drop 拖拽排序：
   - 项目行 `draggable`，拖拽时 `opacity-40` 视觉反馈
   - 目标位置 `ring-2` 高亮 (`bg-primary-subtle`)
   - 放下后 `reorderProjects` 更新 `sort_order`
   - 逐个 `syncProjectToCloud` 同步云端 (best effort，离线静默跳过)
   - 重命名时禁用拖拽 (`renamingId !== p.id`)
2. 提交上一轮遗留未提交的代码（看板添加任务联动 mindmap + 标签列移除 + 暗色配色微调）
3. `docs/PRD.md` — §11 迭代记录补全

**验证**：Build 零 errors ✅

---

## 2026-07-07 第 36 次执行 — PWA 离线支持 + DOMPurify XSS 防护

**背景**：PRD §9 非功能需求要求"PWA 基础功能完全离线可用"，安全约束要求 DOMPurify 清洗节点富文本。当前无 manifest、无 Service Worker、无 DOMPurify。

**改动**：
1. `vite.config.ts` — 安装 `vite-plugin-pwa`，配置 manifest + Workbox generateSW（预缓存 29 entries + Google Fonts runtime cache + skipWaiting）
2. `index.html` — 新增 theme-color、manifest、description、apple-touch-icon meta
3. `src/hooks/usePWA.ts` — 监听 `beforeinstallprompt` / `appinstalled`，提供 install 方法和 isInstalled 状态
4. `src/components/layout/Header.tsx` — 条件渲染"安装到桌面" Download 按钮
5. `src/lib/sanitize.ts` — DOMPurify 封装：`sanitizeText`、`sanitizeUrl`、`safeLinkUrl`
6. `src/components/mindmap/NodeDetailSidebar.tsx` — Markdown link 解析使用 `safeLinkUrl` 拦截危险协议
7. `docs/PRD.md` — §11 迭代记录补全

**验证**：Build 零 errors ✅，`wrangler pages deploy` → https://7027c992.mindflow-app.pages.dev ✅

---

## 2026-07-07 第 35 次执行 — 路由级代码分割（懒加载）

**背景**：Build 输出显示首屏 bundle 550KB gzip 过大，所有页面静态导入。PRD 非功能需求要求"首次加载 < 2秒"。

**改动**：
1. `src/frontend/src/App.tsx` — React.lazy + Suspense 路由级懒加载，首屏 JS 从 550KB 降至 175KB gzip（-68%）
2. `docs/PRD.md` — §11 补全 25~34 次迭代记录
3. 提交 E2E 稳定性改进（journey-2/3/6 retry + API 直接操作）

**验证**：Build 零 errors ✅，部署 → https://9a78def0.mindflow-app.pages.dev ✅

---

## 2026-07-07 第 34 次执行 — 品牌化空状态组件 (EmptyState)

**背景**：设计评审（迭代 28）指出空状态缺乏品牌情感和引导力（P1），且 GlobalSearch 搜索结果为空时没有任何空状态设计。此前多次执行（32~38）的代码改动未 commit。

**改动**：
1. **提交未 commit 的核心代码**：幕布式大纲编辑器、自动双向同步 + SyncStatusIndicator、键盘导航、布局切换修复、根节点改名联动、journey-9 云端同步测试。commit `50a6900`。
2. **新增 `src/components/ui/EmptyState.tsx`** — 通用品牌化空状态组件，支持多色调图标背景 + CTA 按钮 + 暗色模式适配
3. **6 个页面空状态升级**：Dashboard（项目进度/高优任务）、GlobalTasks（含新建项目 CTA）、GlobalBoard、ProjectBoard、GlobalSearch（此前缺失）

**验证**：
- Build 零 errors ✅（1.28s）
- `wrangler pages deploy` 成功 → https://d7604ad7.mindflow-app.pages.dev ✅

---

## 2026-07-06 第 33 次执行 — Bug 修复：大纲编辑器暗色模式适配

**背景**：自动化执行扫描发现第 32 次执行的新代码未提交，且 OutlineEditor 有两处硬编码 `focus:bg-white`，暗色模式下编辑器焦点背景会反白刺眼。

**改动**：
1. **`src/components/outline/OutlineEditor.tsx`** — 两处 `focus:bg-white` → `focus:bg-bg-primary`（第 199 行根节点 + 第 282 行子节点），暗色模式焦点背景正确跟随主题
2. **提交第 32 次执行未 commit 的改动**：幕布式大纲编辑器、SyncStatusIndicator、syncStore、自动双向同步等

**验证**：Build 零 errors ✅，Deploy → https://76b3a611.mindflow-app.pages.dev ✅

---

## 2026-07-06 第 32 次执行 — 大纲重构（幕布式编辑器）+ 思维导图拖拽

**背景**：用户反馈大纲视图可编辑性太差，要求参考幕布重构；思维导图缺少拖拽等基本功能。

**改动**：
1. **新建 `src/components/outline/OutlineEditor.tsx`** — 幕布式结构化大纲编辑器：
   - 树形扁平化为独立可编辑行（contentEditable div）
   - Enter 创建同级，Tab/Shift+Tab 缩进提升
   - Backspace 空行删除，圆点折叠/展开
   - 任务勾选框，完成态自动划线
   - 直接修改 tree_data，OutlinePage 自动同步到 DB/云端
2. **重写 `src/pages/OutlinePage.tsx`** — 使用新编辑器，去掉 textarea + 手动同步按钮
3. **`src/components/mindmap/MindMapCanvas.tsx`** — `enableFreeDrag: true` 开启节点自由拖拽

**验证**：Build 零 errors ✅，Deploy → https://1330e35b.mindflow-app.pages.dev ✅

---

## 2026-07-06 第 31 次执行 — 修复三个核心体验 Bug

**背景**：用户截图反馈：1) 根节点改名不联动项目名；2) 布局切换（逻辑图→思维导图/组织结构）后内容消失只剩方块；3) 缺少箭头键节点导航。

**改动**：
1. **`ProjectMindMapPage.tsx`** — `handleDataChange` 检测根节点 `text` 变化，同步 `db.projects.update()` + `syncProjectToCloud()` + 刷新 Sidebar
2. **`MindMapCanvas.tsx`** — layout effect 改用 `instance.setLayout()` 替代 `destroy+reinit+getData()`，解决多布局切换时数据丢失；保留 fallback reinit
3. **`MindMapCanvas.tsx`** — 注册 `KeyboardNavigation` 插件，支持 ↑↓←→ 节点导航；底部 keyboard hint 同步更新

**验证**：Build 零 errors ✅，Deploy → https://044ed615.mindflow-app.pages.dev ✅

---

## 2026-07-06 第 30 次执行 — 云端同步增强（自动双向同步 + 状态指示器）

**背景**：用户反馈同步策略体验差，所有修改必须手动点击同步。希望做到「联网即自动同步、感受不到本地优先」。

**改动**：
1. **`src/lib/db.ts` — `syncTasksFromTree`**：本地 tasks 批量更新后，逐个调用 `syncTaskToCloud` 推送到云端（离线/未登录时静默跳过）。补全了此前 data_change→tasks 只写本地不推云端的最大窟窿。
2. **`src/stores/syncStore.ts`（新增）** — 全局同步状态管理：
   - `doAutoSync()`：完整双向同步（先 push 本地全部 → 再 pull 云端全部 → 覆盖本地）
   - 30 秒最小间隔 + 500ms 调度防抖
   - 状态：`idle | syncing | error | offline`
3. **`src/components/layout/AppLayout.tsx`** — 3 个自动触发时机：
   - App 启动后延迟 2 秒自动同步
   - `visibilitychange` 切回前台时自动同步
   - 网络恢复时真正触发同步（不再只是 toast）
4. **`src/components/sync/SyncStatusIndicator.tsx`（新增）** — Header 右侧同步状态面板，点击弹出详情浮层
5. **`src/components/layout/Header.tsx`** — 挂载 `SyncStatusIndicator`

**验证**：Build 零 errors ✅，Deploy → https://b81d407c.mindflow-app.pages.dev ✅

**已知限制**：
- 多设备冲突：当前以「云端最新」为准覆盖本地，真正 CRDT/OT 冲突解决待后续
- `syncTasksFromTree` 批量推送：每个 task 一个 upsert 请求，大数据量时请求数较多

---

## 2026-07-06 第 29 次执行 — PDF 导图导出 + 代码提交清理

**内容**：工作区扫描发现大量未提交代码（第26~28次执行的日历周视图 + J8竞态修复 + sort_order bigint + pomodoro_count migration），先提交清理后再开发新功能。

**提交清理**：
- commit `d6fe974` — 日历周视图 + 竞态修复 + E2E测试更新 + Supabase migrations 003/004
  - CalendarPage 月/周切换、MindMapCanvas layout effect 竞态修复、NewProjectDialog sort_order int 溢出修复、ProjectMindMapPage prevIdRef、E2E 稳定性改进

**本次开发：PDF 导图导出（S2 补全）**
- `MindMapCanvas.tsx`: 注册 `simple-mind-map/src/plugins/ExportPDF.js`，导出下拉菜单新增「导出 PDF」按钮
- 复用 `instance.export('pdf', true, 'mindflow')` 内置下载流程（ExportPDF → PNG → pdf-lib → PDF → downloadFile）
- 零新外部依赖（pdf-lib 已由 simple-mind-map 引入）
- PRD S2 标记更新为"PNG/SVG/Markdown/PDF 导图导出已实现"

**验证**：
- Build 零 errors ✅
- Cloudflare Pages 部署成功 ✅ → https://8358fc9c.mindflow-app.pages.dev

**遗留**：
- bundle 体积增加 ~176KB gzip（pdf-lib），后续可考虑动态导入懒加载

---

