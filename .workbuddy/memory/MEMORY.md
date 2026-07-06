# MindFlow 项目长期记忆 (curated)

> 截至 2026-07-06 第 31 次执行（含 22 次自动化 + 9 次 E2E 回归复测）

## 项目状态
- **PRD v1.1 已锁定**:`docs/PRD.md` + `docs/SPEC.md` + `docs/ARCHITECTURE.md` + `docs/UIUX.md`
- **MVP 范围**:思维导图 + 节点转任务 + 项目看板 + 项目管理 + 本地持久化 + 全局任务管理
- **技术栈**:React 19 + Vite 5 + Zustand 5 + shadcn/ui + Tailwind 3 + simple-mind-map 0.14 + Dexie 4 + Supabase JS 2
- **DB 名**:`mindflow-db` (Dexie),表 projects/mindmaps/tasks/settings
- **Dev server 默认端口**:5179

## 关键架构决策 (锁定)
- `projects.version` 为项目级乐观锁
- IndexedDB 动态表方案在 MVP 中未启用,统一用 `tasks` 表的 `project_id` 索引
- 全局筛选前端本地过滤 (内存筛选 + zustand filters state)
- `useProjectIdRef` 模式: simple-mind-map data_change 闭包不能捕获 projectId,必须用 ref 持有最新值
- `scheduleTasksSync` 防抖锁 (80ms) + 单事务原子化,解决 data_change 并发竞态导致 task 记录丢失 (Bug 5)
- 云同步 UX: 登录后 `SyncMigrationDialog` 检测本地数据并弹出迁移选择; Settings「云端同步」Tab 提供手动上传/恢复; AppLayout 全局监听 online/offline Toast 提示

## 真实 Bug 修复历史 (5 个)
1. **ViewHeader 缩放按钮运行时崩溃** (P0):函数签名未解构 onZoomIn/Out/Reset,JSX 引用未定义变量
2. **AppLayout 缺 projects 初始化** (P1):Sidebar 永远显示"暂无项目"
3. **MindMapCanvas 切换项目时 task 错写** (P0):data_change 闭包捕获旧 projectId
4. **loadArchivedProjects boolean 查询** (P1):`equals(1)` 找不到 boolean true
5. **syncTasksFromTree 并发竞态** (P0):多个 data_change 事件互相覆盖导致 task 记录丢失
   修复:模块级防抖 + 互斥锁 + 单事务原子化 + data_change 改同步触发

## 测试覆盖
- 7 个 journey 文件 (`tests/e2e/journey-{1,2,3,4,5,6,7}.spec.ts`),共 73 个断言
- 使用 `npx playwright test tests/e2e/all-journeys.spec.ts --config tests/e2e/playwright.config.ts` 直接运行
- 核心 AC 100% 覆盖 + 4 项 Should Have (归档/搜索/日历/导入) + 模板系统 (J7)
- 连续 5+ 轮回归全部通过，E2E 稳定性已验收

## 踩坑记录 (重要)
- **新建项目 dialog 输入**:`el.value = '...'` 不触发 React onChange,需用 `browser_type` 真实键盘事件,或 native setter + dispatchEvent
- **simple-mind-map 节点编辑**:不要直接 `el.textContent = '...'`,会丢输入。必须用 `keyboard.type` 慢速键盘序列,delay ≥ 30ms
- **simple-mind-map Enter 行为**:第二次 Enter 把当前节点再次激活到编辑态而非创建新节点。规避:用 Tab 创建子节点,或先 click 新节点再 Enter
- **simple-mind-map placeholder 截断**:库默认 `defaultInsertSecondLevelNodeText: '二级节点'`,已通过配置 `''` + `selectTextOnEnterEditText: true` 修复
- **simple-mind-map View.fit rbox 报错**:库内部非阻塞错误,通过 `fit: false` + 延迟 safeFit + try/catch 缓解
- **IndexedDB 删除 mindmap 后 mindmap 实例**:删 IDB 后必须刷新页面让 React 重新 init mindmap
- **测试用 simple-mind-map 创建节点流程**:`click root → Tab → wait 400ms → focus edit-wrap → keyboard.type → Enter → wait 500ms → click "转为任务" → 设优先级 → wait 600ms`
- **暗色模式实现要点**: Tailwind `darkMode: ['class', '[data-theme="dark"]']` + CSS 变量 + `document.documentElement.setAttribute('data-theme', ...)`。注意 `tailwind.config.js` 中的自定义颜色（如 `bg.primary`）必须引用 `var(--bg-primary)` 而非硬编码色值，否则暗色模式下 Tailwind utility class 输出不变。

## 自动化
- 自动化 ID: `automation-1783179786452` (MindFlow Playwright E2E 测试与自动修复)
- 频率:每 2 小时
- 工作目录:`/Users/wentao.hu/Documents/HomePage/00-projects/00-doing/MindFlow/Mindflow-workbuddy`
- 历史执行:见 `.workbuddy/automations/automation-1783179786452/memory.md`

## 未完成功能 (Should/Could)
- **Must Have**: 全部完成 ✅ (M1~M15，含暗色模式 M8)
- **Should Have**: 全部完成 ✅ (S1 大纲 / S2 导入导出 / S3 云端同步 / S4 日历 / S5 搜索 / S6 最近编辑 / C6 归档)
- **Could Have**: AI 生成 ✅ / 番茄钟 ✅ / Dashboard ✅ / 通知提醒 ✅ / 节点详情 ✅ / 存储管理面板 ✅ / 项目模板 ✅ / Markdown 备注 ✅ / 文件附件 ❌ / 甘特图 ❌ / 协作分享 ❌
- **E2E 自动化集成**: ✅ 已封装 `npx playwright test` + `all-journeys.spec.ts`（7 journey / 73 断言），CI 接入待后续

## 新增组件
- `components/sync/SyncMigrationDialog.tsx` — 登录后本地→云端迁移弹窗
- `components/pomodoro/PomodoroTimer.tsx` — 全局番茄钟浮动面板
- `components/mindmap/NodeDetailSidebar.tsx` — 节点详情滑出面板（属性 + Markdown 文档）
- `components/search/GlobalSearch.tsx` — 全局搜索面板（Cmd+K）
- `components/layout/NotificationPanel.tsx` — 截止提醒通知下拉面板
- `components/layout/ViewHeader.tsx` — 项目级页面头部（导图/看板/大纲 Tab 切换 + 缩放控件）

## 项目目录结构
```
src/frontend/                    # React 前端
  src/
    components/
      layout/    # AppLayout / Header / Sidebar / ViewHeader
      mindmap/   # MindMapCanvas / MindMapNode / NodeDetailSidebar
      global/    # GlobalTaskBoard / GlobalTaskList
      task/      # TaskBoard / TaskCard / TaskFilterBar / TaskList
      project/   # NewProjectDialog / ProjectList
      search/    # GlobalSearch (Cmd+K)
      sync/      # SyncMigrationDialog
      pomodoro/  # PomodoroTimer
      ui/        # shadcn 组件
    pages/       # HomePage / AuthPage / DashboardPage / ProjectMindMapPage / ProjectListPage / ProjectBoardPage / OutlinePage / GlobalTasksPage / GlobalBoardPage / CalendarPage / SettingsPage
    stores/      # authStore / projectStore / taskStore / uiStore / pomodoroStore
    lib/         # db (Dexie) / sync (Supabase) / outline (tree↔text)
tests/e2e/                       # Playwright E2E 测试
  journey-{1,2,3,4,5}.spec.ts
docs/                            # PRD / SPEC / ARCHITECTURE / UIUX / E2E_REPORT
```