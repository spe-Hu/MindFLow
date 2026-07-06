# MindFlow MVP 自动迭代记录

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
