# MindFlow MVP 自动迭代记录

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

# MindFlow MVP 自动迭代记录

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

# MindFlow MVP 自动迭代记录

## 2026-07-06 第 33 次执行 — Bug 修复：大纲编辑器暗色模式适配

**背景**：自动化执行扫描发现第 32 次执行的新代码未提交，且 OutlineEditor 有两处硬编码 `focus:bg-white`，暗色模式下编辑器焦点背景会反白刺眼。

**改动**：
1. **`src/components/outline/OutlineEditor.tsx`** — 两处 `focus:bg-white` → `focus:bg-bg-primary`（第 199 行根节点 + 第 282 行子节点），暗色模式焦点背景正确跟随主题
2. **提交第 32 次执行未 commit 的改动**：幕布式大纲编辑器、SyncStatusIndicator、syncStore、自动双向同步等

**验证**：Build 零 errors ✅，Deploy → https://76b3a611.mindflow-app.pages.dev ✅

---

# MindFlow MVP 自动迭代记录

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

# MindFlow MVP 自动迭代记录

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


## 2026-07-06 第 28 次执行 — 修复云端同步失败（tasks 表缺失 pomodoro_count 列）

**内容**：用户反馈所有任务同步失败，报错 "Could not find the 'pomodoro_count' column of 'tasks' in the schema cache"，共 14 项失败。

**根因**：本地 `LocalTask.pomodoro_count` 字段在第 14 次执行（番茄钟功能）添加，但云端 Supabase `tasks` 表 schema 从未更新。`sync.ts` upsert 时携带该字段 → 云端报 "column not found"。

**修复**：
1. 新增 `supabase/migrations/004_add_task_columns.sql`：给 tasks 表添加 `pomodoro_count integer DEFAULT 0`
2. `supabase db push` 推送到 remote 数据库
3. migration list 验证 `004 | 004` ✅

**验证**：
- Build 零 errors ✅
- migration 004 已在 remote ✅
- `sync.ts` 推送字段与云端 tasks 表 schema 完全对照，无其他缺失 ✅

**反思**：之前每次新增本地字段（如番茄钟加 `pomodoro_count`、模板加 `sort_order` bigint）都必须同步创建云端 migration。以后新增字段时，如果该字段需要同步到云端，必须「本地 Dexie 字段 + sync.ts payload + Supabase migration」三者同时到位，否则云端同步必炸。

---

## 2026-07-06 第 27 次执行 — 重新部署最新版本到 Cloudflare Pages

**内容**：第 26 次执行的日历周视图代码 Build 成功但尚未部署，本次重新 build + deploy。

**改动**：无新代码改动，纯重新部署。

**验证**：Build 零 errors ✅，`wrangler pages deploy` 成功 → https://fbc0bc96.mindflow-app.pages.dev ✅

---

## 2026-07-06 第 26 次执行 — 日历周视图切换（S4 补全）

**内容**：PRD S4 日历视图长期标注"周视图待后续"，本轮补全。

**改动**：
1. `src/pages/CalendarPage.tsx` — 新增 `viewMode` state，月/周切换按钮组，周视图 7 列横排 + 周导航 + 周区间标签，详情面板复用
2. `tests/e2e/journey-4.ts` — 新增 CAL-17~CAL-20 覆盖周视图切换/高亮/任务/导航
3. `docs/PRD.md` — S4 标记更新

**验证**：Build 零 errors ✅

---

## 2026-07-06 第 25 次执行（紧急 Bug 修复）

### 同步失败: `out of range for type integer` + FK 约束违例

**根因**：`NewProjectDialog.tsx:84` 的 `sort_order: Date.now()` 产生约 1.78 万亿的时间戳值，远超 PostgreSQL `int` (32-bit) 上限 21.4 亿。projects 插入先炸，mindmaps/tasks 的 FK 跟着全崩，共 33 项失败。

**修复**：
1. `src/components/project/NewProjectDialog.tsx` — `sort_order` 改为 `maxExistingSortOrder + 1`
2. `supabase/migrations/003_sort_order_bigint.sql` — projects/tasks/mindmap_nodes 的 sort_order 改为 `bigint`

**验证**：
- `supabase migration list --linked` 确认 001/002/003 均已在 remote ✅
- `npx vite build` 零 errors ✅
- `wrangler pages deploy` 成功 ✅（https://8b7ce523.mindflow-app.pages.dev）

**反思**：上一轮修复 uuid→text 时只检查了 `id` 列，漏掉了 `sort_order` 的实际值范围。自动化环境中难以做真实 Supabase 登录态的端到端同步验证，但以后修改涉及数据库 schema 或同步链路时，必须显式核查「前端写入值」与「数据库列类型」的兼容性。

---

## 2026-07-06 第 24 次执行

### 重点: 甘特图时间线视图（Could Have C1）

**背景**: MVP v1.1 Must/Should Have 全部完成，Could Have 持续推进。竞品滴答清单没有甘特图，Xmind 也没有。甘特图是差异化卖点。

**改动**:
1. `src/pages/GanttPage.tsx` (新增) — 全局甘特图时间线视图：
   - 按项目分组展示任务条形（按截止日期定位，按优先级默认持续时长）
   - 周导航（上一周/下一周/今天），默认展示 21 天（3 周）
   - 项目筛选 chip、项目折叠/展开
   - hover tooltip 显示任务详情
   - 点击条形跳转对应项目导图节点
   - 无截止日期任务单独区域显示
   - 今天日期竖线标记
2. `src/App.tsx` — 新增 `/gantt` 路由
3. `src/components/layout/Sidebar.tsx` — 展开态+折叠态新增「甘特图」导航入口（GanttChart 图标）
4. `src/lib/db.ts` — `LocalTask` 接口新增可选 `start_date` / `duration_days` 字段（不改 schema，向后兼容）

**验证**: Build 零 errors ✅, Lint 3 warnings（均为已有 shadcn/ui warning）✅, tsc 零 errors ✅

**遗留**: E2E 中暂未覆盖甘特图链路，后续可新增 journey-8

---

# MindFlow MVP 自动迭代记录

## 2026-07-06 第 23 次执行

### 重点: AI 外部 API 配置面板（补全 C3 闭环）

**背景**: 主人反馈「外部 LLM 可选，但 Settings 里没有配置入口」。上一轮只实现了代码层支持，缺少 UI 配置能力。

**改动**:
1. `src/pages/SettingsPage.tsx`:
   - NAV_SECTIONS 新增 `'ai'` 导航项（Sparkles 图标），位于「外观」和「存储」之间
   - 新增 AI 配置 Section：启用开关、API Key 输入框（带 Eye/EyeOff 显隐切换）、Base URL、模型输入、"优先使用 AI 生成"开关
   - 配置保存按钮调用 `saveAIConfig()` 持久化到 IndexedDB
   - 组件 mount 时 `loadAIConfig()` 恢复配置
2. `src/lib/aiMindMap.ts`:
   - 移除硬编码的 `import.meta.env.VITE_OPENAI_API_KEY`，改为运行时从 IndexedDB settings 表读取
   - 新增 `AIConfig` 接口 + `loadAIConfig()` / `saveAIConfig()` 工具函数
   - `generateMindMapByAI()` 自动加载配置，根据 `enabled` + `apiKey` + `preferApi` 决定是否调用外部 API

**验证**: Build 零 errors ✅, Lint 6 warnings 均为已有 ✅

**备注**: 至此 C3 AI 生成完整闭环：UI 配置 → DB 持久化 → 生成时读取 → API/本地双引擎 fallback。

---

## 2026-07-06 第 22 次执行

### 重点: PRD 文档同步（补充迭代记录表 + Could Have 标记）

**背景**: 主人反馈每次迭代后 PRD 文档的进度标记未同步更新，问「你每次更新完之后为什么不把 PRD 文档也更新一下？」

**改动**:
1. `docs/PRD.md` §7 Could Have:
   - C3 AI 生成 → 补充完整说明并标记 ✅
   - C4 番茄钟 → 补充完整说明并标记 ✅
   - C5 附件/备注 → 标注长文本备注 ✅ 已落地，图片/文件附件 ❌ 待后续
2. `docs/PRD.md` §11 迭代记录表：追加 14 行，补齐之前遗漏的迭代（番茄钟/节点详情/云端同步/日历/搜索/导入/归档/大纲/E2E/Dashboard/快捷键/通知/最近编辑/存储管理），按时间正序排列

**验证**: 无代码改动，纯文档更新

**备注**: 以后每次迭代结束后同步更新 PRD §7 和 §11，确保文档与代码状态一致。

---

## 2026-07-06 第 21 次执行

### 重点: AI 辅助生成思维导图 (Could Have C3)

**背景**: 竞品 GitMind 的核心优势之一就是 AI 生成导图，MindFlow 已有 5 个预置模板但缺少按用户主题动态生成的能力。新建项目对话框 2×3 网格天然空出第 6 格。

**改动**:
1. `src/lib/aiMindMap.ts` (新增) — 可插拔 AI 生成引擎：
   - 本地语义规则引擎（默认）：主题关键词匹配 4 类模板骨架（产品/论文/活动/周计划），未匹配时回退通用 OKR 骨架（目标/执行/资源/复盘）
   - 外部 LLM API 层（可选）：探测 `VITE_OPENAI_API_KEY`，存在时调用 OpenAI 兼容接口生成结构化 tree_data
2. `src/lib/templates.ts` — export `createNode` 和 `generateId` 供 aiMindMap 复用
3. `src/components/project/NewProjectDialog.tsx` — 模板网格新增第 6 格"AI 生成"卡片（Sparkles 图标），选中后按钮文案变为"生成并创建"，点击调用 `generateMindMapByAI` 生成结构并创建项目

**验证**: Build 零 errors ✅, Lint 6 warnings 均为已有（无新增）✅

**里程碑**: Could Have C3 首版落地。新用户输入主题即可 1 秒获得个性化思维导图结构。

---

## 2026-07-06 第 20 次执行

### 重点: 项目模板系统

**背景**: MVP v1.1 Must/Should Have 全部完成，Could Have 持续推进。新建项目时用户面对空白画布，上手门槛过高。竞品 Xmind 的核心优势之一就是丰富的预置模板。

**改动**:
1. `src/lib/templates.ts` (新增) — 5 个预置模板数据结构：空白/产品开发/论文写作/活动策划/周计划。每个模板含完整的思维导图 tree_data + 任务节点（含截止日期和优先级）
2. `src/components/project/NewProjectDialog.tsx` — 弹窗扩展模板选择区域（2×3 网格卡片），创建时按选中模板初始化导图结构并自动同步预置任务
3. `docs/PRD.md` — 新增 §11 迭代记录表

**验证**: Build 零 errors ✅, Lint 4 warnings 均已有 ✅

**里程碑**: 新用户上手体验显著提升，5 秒即可从模板出发开始项目管理。

---

## 2026-07-06 第 19 次执行

### 重点: Settings 存储管理面板升级（数据用量监控 + 健康检查 + 备份提醒）

**背景**: PRD 第 10 节明确将 "IndexedDB 存储容量限制（~50MB）" 列为中风险项。此前 Settings「存储」区域仅有基础进度条和导入/导出按钮，缺少用量预警、备份提醒和数据一致性自检能力。

**改动**:
1. `src/lib/db.ts` — 新增 `getStorageStats()`（项目/任务/节点/大小统计）、`runHealthCheck()`（4 类数据一致性检测）、`fixHealthIssues()`（自动修复孤立任务）
2. `src/pages/SettingsPage.tsx` — Storage Tab 全面扩展：
   - 顶部 4 张数据概况统计卡片（项目/节点/任务/大小）
   - 用量进度条变色预警（>80% 琥珀色 / >95% 红色）
   - 备份提醒（基于 localStorage 记录导出时间，>30 天未导出提示）
   - 数据健康检查面板（运行检查 / 问题列表 / 自动修复）

**验证**: Build 零 errors ✅

**里程碑**: PRD 风险缓解措施落地，用户数据安全感和可控性显著提升。

---

## 2026-07-06 第 18 次执行

### 重点: 截止提醒通知面板 + 任务逾期视觉标识

**背景**: 截至第17次执行，Must/Should Have 全部完成，Could Have 持续打磨。Header 通知 Bell 按钮是纯占位符（硬编码小红点），用户设置任务截止日期后没有任何提醒机制。竞品滴答清单的提醒是其核心优势之一，MindFlow 缺少这一点会削弱"做下去"体验。

**改动**:
1. `src/stores/notificationStore.ts` (新增) — 通知状态管理，从 tasks 列表实时生成三类通知：overdue / due_today / due_tomorrow，支持 markRead / markAllRead
2. `src/components/layout/NotificationPanel.tsx` (新增) — Header Bell 下拉面板，分组显示通知，点击跳转到对应项目导图节点，空状态友好提示
3. `src/components/layout/Header.tsx` — Bell 按钮替换为 NotificationPanel
4. `src/components/task/TaskCard.tsx` — 已逾期任务卡片左侧红色竖条标识 + 日期区域高亮标签（逾期红色/今天橙色/明天蓝色）
5. `src/pages/DashboardPage.tsx` — StatCard 增加 onClick，5 个统计卡片全部支持点击跳转全局任务/看板视图

**验证**: Build 零 errors, Lint 零 errors（4 warnings 均为已有，无新增）

**里程碑**: 任务截止提醒闭环，Dashboard 统计卡片可交互，逾期任务视觉醒目。

---

## 2026-07-06 第 17 次执行

### 重点: 全局快捷键 + 思维导图导出（PNG / SVG / Markdown）

**背景**: Dashboard 上线后，从 Could Have / 体验优化角度审视，发现两个投入小产出高的改进点：1）Settings 中列了「新建项目 Cmd/Ctrl + Shift + N」快捷键但实际未绑定；2）竞品 Xmind 的核心优势之一是导出格式丰富，MindFlow 仅靠 JSON 导出无法满足分享/交付需求。

**改动**:
1. `src/components/layout/AppLayout.tsx` — 全局 keydown 监听器，绑定 Cmd/Ctrl + Shift + N 打开新建项目弹窗（自动排除 input/textarea/contenteditable 场景）
2. `src/components/mindmap/MindMapCanvas.tsx` — 注册 simple-mind-map Export 插件
   - 布局切换器右侧新增「导出」下拉按钮（PNG / SVG / Markdown）
   - 点击外部自动关闭菜单
   - 导出过程 toast 提示（正在导出 / 成功 / 失败）
3. `docs/PRD.md` — S2 导入导出备注更新

**验证**: Build 零 errors, Lint 零 errors（4 warnings 均为已有，无新增）

**里程碑**: 核心体验持续打磨，快捷键闭环 + 多格式导出补齐交付场景。

---

## 2026-07-06 第 16 次执行

### 重点: 全局统计仪表盘 (Dashboard)

**背景**: Must/Should Have 全部完成后，用户打开 App 无边际总览。竞品（滴答清单/飞书项目）均以仪表盘作为用户首屏，提供全局进度可视化和本周/逾期任务速览。MindFlow 之前侧边栏已有「全局任务」「日历」入口，但缺少一个真正的「工作台概览」。

**改动**:
1. `src/pages/DashboardPage.tsx` (新增) — 全局统计仪表盘
   - 统计卡片行：总任务/已完成/待办/进行中/已逾期
   - 项目进度列表：完成率 progress bar + 分色，点击跳转项目看板
   - 本周截止：近 7 天截止任务按紧迫感排序（今天/明天/N天后）
   - 高优任务：高优/紧急未完成任务速览面板
2. `src/components/layout/Sidebar.tsx` — 侧边栏新增「工作台」导航入口（展开态+折叠态，位于全局任务之上）
3. `src/App.tsx` — 新增 `/dashboard` 路由

**验证**: Build 零 errors, Lint 0 errors（4 warnings 均为已有，无新增）

**里程碑**: Could Have 持续增强，工作台成为 App 全局概览入口。

---

## 2026-07-05 第 15 次执行

### 重点: 节点详情侧边栏 + Markdown 文档编辑器

**背景**: 每个节点需要承载更多项目管理信息和可写文档。竞品飞书/滴答清单都有节点属性面板和笔记功能。

**改动**:
1. `src/components/mindmap/NodeDetailSidebar.tsx` (新增) — 右侧 Sheet 滑出面板，Tabs: 属性 / 文档
   - 属性: 任务开关、状态、优先级、截止日期、番茄钟统计 + 开始专注按钮
   - 文档: Markdown 编辑/预览，支持标题/列表/粗体/斜体/代码/链接，零新依赖
2. `src/components/mindmap/MindMapCanvas.tsx` — 浮动工具栏新增「查看详情」按钮，双击节点打开面板，提供 `handleUpdateNodeData` 回调

**验证**: Build 零 errors, Lint 0 errors（4 warnings 均为已有)

**里程碑**: 所有节点（根/任务/普通）均支持详情面板和 Markdown 文档。Could Have 持续推进。

---

## 2026-07-05 第 14 次执行

### 重点: 番茄钟 (Pomodoro Timer) — Could Have C4

**背景**: Must Have + Should Have 全部完成后，从 Could Have 筛选高价值功能。竞品分析中滴答清单的番茄钟是其核心优势，MindFlow 缺少会削弱"做下去"体验。

**改动**:
1. `src/lib/db.ts` — `LocalTask` 加 `pomodoro_count`; `syncTasksFromTree` 保留已有 count
2. `src/lib/sync.ts` — 云端同步携带 `pomodoro_count`
3. `src/stores/pomodoroStore.ts` — 新建 zustand store，支持 focus/shortBreak/longBreak 模式、计时、完成切换
4. `src/components/pomodoro/PomodoroTimer.tsx` — 浮动面板：SVG 环形进度条、时间显示、模式切换、浏览器通知、document.title 更新
5. `src/components/task/TaskCard.tsx` — 每个任务卡片添加番茄钟按钮（显示已完成次数，运行中闪烁）
6. `src/App.tsx` — 全局挂载 `PomodoroTimer`

**验证**: Build 零 errors, Lint 0 errors（7 warnings 均为已有，无新增）

**里程碑**: Could Have 首项交付 ✅（番茄钟上线）

---

## 2026-07-05 第 13 次执行

### 重点: 暗色模式（M8 主题样式）

**背景**: PRD Must Have M8 是唯一未完成的 Must Have。暗色基础设施已全部就绪（CSS 变量、Tailwind darkMode selector、uiStore theme、Settings UI），只差把 theme 状态连接到 HTML data-theme。

**改动**:
1. `src/hooks/useTheme.ts` — 新增 hook，监听 theme 设置 data-theme，支持 system 模式
2. `src/App.tsx` — 全局调用 `useTheme()`
3. `tailwind.config.js` — bg/text/border 改为 CSS 变量引用
4. `src/index.css` — dot-grid 暗色覆盖
5. `MindMapCanvas.tsx` — 画布添加 `bg-bg-primary`
6. `CalendarPage.tsx` — 修复硬编码 amber 颜色

**验证**: Build 零 errors

**里程碑**: PRD Must Have + Should Have 全部完成，MVP v1.1 完整交付

---

## 2026-07-05 第 12 次执行

### 重点: S6 最近编辑列表

**背景**: PRD Should Have 中 S1-S5 均已实现，仅剩 S6 最近编辑列表未交付。`last_opened_at` 字段和 `setActiveProject` 更新逻辑已存在，但 UI 上无展示入口。

**3 个改进**:
1. IndexedDB schema 升级到 v2 — 给 `projects` 表添加 `last_opened_at` 索引
2. `projectStore` 新增 `recentProjects` state 和 `loadRecentProjects()` — `loadProjects` 完成后自动加载、`setActiveProject` 后自动刷新
3. `Sidebar` 展开态新增「最近编辑」区域 — 在「全局任务」和「项目」之间，按 `last_opened_at` 倒序显示最近 4 个非归档项目，点击直接跳转

**修改文件**:
- `src/lib/db.ts` (+ schema v2 + `getRecentProjects`)
- `src/stores/projectStore.ts` (+ recentProjects / loadRecentProjects)
- `src/components/layout/Sidebar.tsx` (+ 最近编辑区域 + Clock icon)
- `docs/PRD.md` (S6 标记 ✅)

**验证**: Build 零 errors, Lint 7 warnings 均为已有（无新增）

**遗留**:
- Should Have 全部完成，MVP v1.1 功能全部交付
- Could Have: 甘特图、协作分享、AI 生成、番茄钟、附件/备注

---

## 2026-07-05 第 11 次执行

### 重点: 云端同步 UX 闭环（S3）

**背景**: sync.ts 底层 push/pull 函数已存在但从未被调用，用户登录/Settings 中无云同步控制界面。

**3 个改进**:
1. 登录后本地数据迁移弹窗 — `SyncMigrationDialog` 挂载在 AppLayout，检测到 unauthenticated→authenticated 且本地有项目时弹出，提供「迁移到云端」「从云端恢复」「继续使用本地」三选项，localStorage 标记已提示避免重复打扰
2. Settings 新增「云端同步」Tab — 显示网络在线/离线状态、上次同步时间、「立即同步（上传）」「从云端恢复」按钮、当前用户信息摘要
3. 全局网络状态监听 — AppLayout 监听 online/offline 事件，断网 toast「已切换到离线模式」，恢复联网 toast「网络已恢复，数据正在同步」

**新增文件**:
- `src/components/sync/SyncMigrationDialog.tsx`

**修改文件**:
- `src/components/layout/AppLayout.tsx` (+ SyncMigrationDialog + 网络监听)
- `src/pages/SettingsPage.tsx` (+ 云端同步 Tab + CloudSyncPanel)
- `docs/PRD.md` (S3 标记 ✅)

**验证**: Build 零 errors, Lint 零 errors (7 warnings 均为已有，无新增)

**遗留**:
- Should Have 全部完成，MVP v1.1 功能全部交付
- Could Have: 最近编辑列表(S6)、甘特图、协作分享、AI 生成、番茄钟

---

## 2026-07-05 第 10 次执行

### 重点: PRD 文档同步（补充遗漏）

**文档更新**: `docs/PRD.md` Should Have / Could Have 表格更新，标记已实现功能：
- S2 导入导出 — 标记 ✅（JSON 导入/导出已在 Settings 实现）
- S4 日历视图 — 标记 ✅（月视图 /calendar 已实现，跨项目分色）
- S5 搜索 — 标记 ✅（全局搜索 Cmd/Ctrl+K 已实现）
- C6 项目归档 — 标记 ✅（归档/恢复/删除已在 Settings 实现）

---

## 2026-07-05 第 9 次执行

### 重点: 数据导入功能 + 快捷键列表补全

**2 个改进**:
1. 数据导入 — Settings 页面「存储管理」区域新增「导入数据」按钮，支持选择之前导出的 JSON 文件恢复项目和任务数据
   - 格式验证（version + projects 数组）、版本兼容性检查（仅 v1.x）
   - 导入前确认对话框（合并覆盖策略说明）
   - Date 字段 ISO 字符串自动转回 Date 对象
   - 单事务原子化写入（projects + mindmaps + tasks + settings）
   - 导入完成后自动刷新项目列表 + toast 提示
2. 快捷键列表补全 — Settings「快捷键」Tab 新增「全局搜索 Cmd/Ctrl + K」，修正部分描述更准确

**修改文件**:
- `src/frontend/src/pages/SettingsPage.tsx` (+ 导入逻辑 + UI 按钮 + file input + toast)
- `src/frontend/src/components/layout/AppLayout.tsx` (+ `<Toaster />` 挂载)

**验证**: Build 零 errors, Lint 零 errors (6 warnings 均为已有，无新增)

**遗留**:
- Should Have 剩余: 云端同步(Supabase)、大纲模式
- Could Have: 归档项目的全局任务可见性需 PRD 明确

---

## 2026-07-05 第 8 次执行

### 重点: 日历视图

**1 个新功能**:
1. 日历视图 (CalendarPage) — 月视图，6行×7列固定网格，跨项目任务按项目分色显示
   - 月份导航 (上一月/下一月/今天)
   - 点击日期格子选中，右侧展开当日任务详情面板
   - 每个格子最多显示 3 个任务条，超出用 "+N" 提示
   - 任务条按项目分色，已完成任务有 line-through 和 opacity 提示
   - 点击任务跳转对应项目导图并定位节点
   - 侧边栏新增「日历」入口（展开态+折叠态）
   - 路由 `/calendar`

**修改文件**:
- `src/pages/CalendarPage.tsx` (新增)
- `src/App.tsx` (+ 路由 `/calendar`)
- `src/components/layout/Sidebar.tsx` (+ 日历导航入口)

**验证**: Build 零 errors, Lint 零 errors (6 warnings 与上轮一致，无新增)。日历日期格子算法通过 Unit Test。

**遗留**:
- PRD MVP v1.1 已全部实现，后续可推进 Should Have (导入导出、云端同步、大纲模式)

---

## 2026-07-05 第 5 次执行

### 重点: placeholder 修复 + 全局搜索面板

**2 个新功能/修复**:
1. placeholder 截断修复 — MindMapCanvas 配置 `defaultInsertSecondLevelNodeText: ''` 和 `defaultInsertBelowSecondLevelNodeText: ''`，配合 `selectTextOnEnterEditText: true`，新节点直接空文本进入编辑态，用户输入即替换
2. 全局搜索面板 — Cmd+K / Ctrl+K 唤起，Header 搜索区域点击打开。搜索范围覆盖所有项目名、导图节点、任务。结果按项目分组，支持上下箭头选择 + Enter 跳转，点击任务/节点自动跳转到对应项目导图并高亮节点

**修改文件**:
- `src/components/search/GlobalSearch.tsx` (新增)
- `src/stores/uiStore.ts` (+ isSearchOpen / setSearchOpen)
- `src/components/layout/Header.tsx` (搜索区域绑定 onClick)
- `src/components/layout/AppLayout.tsx` (挂载 GlobalSearch)
- `src/components/mindmap/MindMapCanvas.tsx` (+ defaultInsertSecondLevelNodeText: '')

**验证**: Build 零 errors, Lint 零 errors (消除 3 个新增 warning)

**遗留**:
- 归档项目的全局任务可见性（需 PRD 设计决策）
- simple-mind-map rbox 报错（已缓解，非阻塞）

---

# MindFlow MVP 自动迭代记录

## 2026-07-05 第 4 次执行

### 重点: 数据完整性 + 项目归档

**2 个新功能**:
1. 孤儿 task 自动清理 — AppLayout 初始化时异步检测并删除 node_uid 不在 mindmap tree 中的脏数据
2. 项目归档 — Sidebar 菜单归档、Settings 恢复/彻底删除，解决 20 项目上限刚需

**验证**: Build 零 errors, Lint 零 errors

**遗留**:
- simple-mind-map placeholder 截断 (库内部问题)
- simple-mind-map rbox 报错 (非阻塞)

---

## 2026-07-05 第 3 次执行

### 重点: E2E 测试 + 真实 bug 修复

**覆盖**: PRD 13 条核心 AC, 2 条用户旅程, 13/13 通过

**修复的 3 个 P0/P1 bug**:
1. ViewHeader.tsx 缩放按钮 props 未解构 → 运行时崩溃
2. AppLayout.tsx 缺 loadProjects 初始化 → Sidebar 永远空
3. MindMapCanvas.tsx data_change 闭包 stale projectId → task 错写

**产物**:
- tests/e2e/journey-1.spec.ts (单项目)
- tests/e2e/journey-2.spec.ts (多项目 + 全局)
- docs/E2E_REPORT.md (详细报告)
- 构建验证零 errors

**遗留**:
- simple-mind-map rbox 非阻塞错误
- contenteditable placeholder 截断
- 脏数据迁移清理

---

## 2026-07-05 第 10 次执行

### 重点: 大纲模式 (Outline Mode)

**1 个新功能**:
1. 大纲模式 — 类似幕布的文本大纲与思维导图双向编辑
   - 路由 `/project/:id/outline`，ViewHeader 新增"大纲"tab
   - 文本编辑器支持缩进表示层级（2空格=1级）
   - 任务标记语法: `[ ]` 待办、`[x]` 已完成、`!高/中/低` 优先级、`@YYYY-MM-DD` 截止日期
   - "同步到导图"将大纲文本转为 tree_data 并同步到 IndexedDB
   - "从导图刷新"反向转换
   - 未保存更改警告 + localStorage 草稿自动保存
   - 右侧语法提示面板

**新增文件**:
- `src/pages/OutlinePage.tsx`
- `src/lib/outline.ts`

**修改文件**:
- `src/stores/uiStore.ts` | `src/components/layout/ViewHeader.tsx` | `src/lib/db.ts` | `src/components/mindmap/MindMapCanvas.tsx` | `src/App.tsx`

**验证**: Build 零 errors, Lint 零 errors (7 warnings 均为已有，无新增)

**遗留**:
- Should Have 剩余: 云端同步 (Supabase 多端数据拉取/合并)
- Could Have: 甘特图、协作分享、AI 生成、番茄钟

## 2026-07-07 推送 GitHub（环境无外网，未完成）
用户要求推送到 spe-Hu/MindFLow。本地准备已完成：配置 origin remote、补全 .gitignore、从版本控制移除 node_modules/test-results/playwright-report、提交所有遗留源码改动。沙箱环境无外网出口，push 失败。待用户在联网机器执行 `git push -u origin master`。
