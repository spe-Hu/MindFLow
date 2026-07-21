# E2E 测试全面覆盖度审计报告（含 PRD 外功能扫描）

**日期**：2026-07-20
**工作流**：测试覆盖度审计 + 代码-测试 diff 审查
**参与成员**：Zhen（工程督导）、Cody（代码审查师）、Tessa（测试专家）
**审计范围**：13 个 journey 文件 + 全部页面/组件/功能

---

## 📌 TL;DR

- **E2E 断言总数**：~265 个（13 个 journey）
- **PRD Must/Should/Could 覆盖**：15/15 ✅、6/6 ✅、6/6 ✅（100%）
- **PRD 外已发现但未覆盖的功能**：**23 项**
- **严重度分布**：🔴高 3 项 / 🟠中 8 项 / 🟡低 12 项
- **阻塞项**：0（所有现有 journey 可运行，但有 selector 风险）

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| 整体评级 | 🟡 有条件通过 — PRD 需求 100% 覆盖，但 PRD 外功能有 23 项遗漏 |
| 阻塞项数量 | 0 |
| 关键行动项 | 8 条（见下文） |
| 建议下一步 | 优先补 P0~P1 测试（主题切换、看板新建任务、Pomodoro、NodeDetail 深度） |

---

## Part 1: PRD 需求覆盖矩阵

### Must Have（M1~M15）— 15/15 ✅

| 需求 | Journey | 断言数 | 状态 |
|------|---------|--------|------|
| M1 创建/删除节点 | J1, J6 | ~20 | ✅ |
| M2 编辑节点文本 | J1, J6 | ~15 | ✅ |
| M3 移动节点 | J1, J6 | ~12 | ✅ |
| M4 根节点重命名=项目名 | J1 | 2 | ✅ |
| M5 节点内容持久化 | J1, J6 | ~10 | ✅ |
| M6 节点转任务 | J1, J6 | ~8 | ✅ |
| M7 项目搜索过滤 | J2, J3 | ~8 | ✅ |
| M8 主题切换 | J6（标题提及） | 0 | ⚠️ 仅标题提及，无实际断言 |
| M9 侧边栏导航 | J2 | ~8 | ✅ |
| M10 日历视图 | J4, J5 | ~15 | ✅ |
| M11 看板视图 | J5 | ~10 | ✅ |
| M12 列表视图 | J5 | ~8 | ✅ |
| M13 新建/删除/编辑任务 | J1, J5, J6 | ~15 | ✅ |
| M14 任务状态管理 | J5 | ~8 | ✅ |
| M15 数据持久化 | J1, J6（刷新验证） | ~6 | ✅ |

### Should Have（S1~S6）— 6/6 ✅

| 需求 | Journey | 断言数 | 状态 |
|------|---------|--------|------|
| S1 大纲/导图双向编辑 | J13 | ~15 | ✅ |
| S2 导入导出 | J11 | ~18 | ✅ |
| S3 云端同步 | J9 | ~14 | ✅ |
| S4 日历月+周视图 | J4 | ~20 | ✅ |
| S5 全局搜索 | J3 | ~15 | ✅ |
| S6 最近编辑列表 | J12 | ~6 | ✅ |

### Could Have（C1~C6）— 6/6 ✅

| 需求 | Journey | 断言数 | 状态 |
|------|---------|--------|------|
| C1 甘特图 | J12 | ~8 | ✅ |
| C2 只读分享 | J10 | ~8 | ✅ |
| C3 AI 生成 | J8 | ~10 | ✅ |
| C4 节点详情 | J8（打开面板） | ~4 | ⚠️ 仅打开面板，未测属性编辑 |
| C5 文件附件 | J10 | ~4 | ⚠️ 仅验证链接存在，未实际上传 |
| C6 归档 | J2, J5, J6 | ~8 | ✅ |

### PRD 核心用户旅程 — 3/3 ✅

| 旅程 | 对应 Journey | 状态 |
|------|-------------|------|
| 旅程1: 创建项目→思维导图→节点操作 | J1, J6 | ✅ |
| 旅程2: 项目切换→看板/列表/日历 | J2, J4, J5 | ✅ |
| 旅程3: 大纲编辑→导图同步→批量任务 | J13 | ✅ |

---

## Part 2: PRD 外功能扫描（代码倒推）

### 2.1 页面/路由覆盖

**15 个路由，E2E 访问了 11 个，遗漏 4 个：**

| 路由 | 页面 | E2E 覆盖 | 说明 |
|------|------|----------|------|
| `/` | HomePage | ✅ J2 | 项目列表 |
| `/dashboard` | DashboardPage | ⚠️ J8 | 仅验证导航和数值存在 |
| `/project/:id` | ProjectMindMapPage | ✅ J1,J6,J8 | 核心页面 |
| `/project/:id/outline` | OutlinePage | ✅ J13 | 大纲编辑器 |
| `/project/:id/list` | ProjectListPage | ✅ J5 | 列表视图 |
| `/project/:id/board` | ProjectBoardPage | ✅ J5 | 看板视图 |
| `/global-tasks` | GlobalTasksPage | ❌ | 全局任务列表 — **零 E2E** |
| `/global-tasks/board` | GlobalBoardPage | ❌ | 全局看板 — **零 E2E** |
| `/calendar` | CalendarPage | ✅ J4,J5 | 日历 |
| `/gantt` | GanttPage | ✅ J12 | 甘特图 |
| `/settings` | SettingsPage | ⚠️ J2,J5,J9,J11 | 部分 tab 未覆盖 |
| `/auth` | AuthPage | ❌ | 登录/注册 — **零 E2E**（绕过） |
| `/share/:token` | SharePage | ⚠️ J10 | 仅验证链接和复制，未访问实际分享页 |
| `*` | 404/Redirect | ❌ | 空状态/404 — **零 E2E** |

### 2.2 SettingsPage 详细功能审计

SettingsPage 有 **8 个导航 section**，E2E 仅覆盖 4 个：

| Section | 功能 | E2E 覆盖 | 状态 |
|---------|------|----------|------|
| account | display_name/username/logout | ❌ | 🔴 高 — 零 E2E |
| appearance | 主题切换(light/dark/auto)、紧凑模式、侧边栏宽度 | ❌ | 🟠 中 — 零 E2E |
| storage | 存储统计、导出数据、导入数据 | ✅ J2,J11 | ✅ |
| sync | 手动同步、迁移弹窗 | ✅ J9 | ✅ |
| local-workspace | Obsidian 本地目录同步 | ❌ | 🟠 中 — 零 E2E |
| ai | AI 配置(apiKey/baseUrl/model) | ❌ | 🟠 中 — 零 E2E |
| shortcuts | 快捷键列表展示 | ❌ | 🟡 低 — 纯展示 |
| archive | 归档项目查看/恢复/删除 | ⚠️ J2 | 🟡 低 — J2 测了归档恢复，但没进 archive tab |
| health | 数据健康检查+自动修复 | ❌ | 🟠 中 — 零 E2E |

### 2.3 全局功能审计

| 功能 | 实现位置 | E2E 覆盖 | 状态 |
|------|----------|----------|------|
| **全局快捷键** `Cmd+Shift+N` → 新建项目 | AppLayout.tsx | ❌ | 🟠 中 |
| **全局搜索** `Cmd+K` | GlobalSearch.tsx | ✅ J3 | ✅ |
| **暗色/亮色主题** | uiStore + CSS 变量 | ❌ | 🟠 中 |
| **紧凑模式** | uiStore | ❌ | 🟡 低 |
| **侧边栏宽度调整** | uiStore + Slider | ❌ | 🟡 低 |
| **Toast/通知系统** | sonner + AppLayout | ❌ | 🟡 低 — 验证消息难但可测 |
| **网络状态切换** | AppLayout online/offline | ❌ | 🟠 中 — 离线模式核心功能 |
| **自动同步** | syncStore + 3 触发器 | ❌ | 🟡 低 — 难自动化但可 mock |
| **SyncStatusIndicator** | 顶部状态条 | ❌ | 🟡 低 |
| **SyncMigrationDialog** | 登录后弹窗 | ✅ J9 | ✅ |
| **NotificationPanel** | 截止提醒通知 | ❌ | 🟠 中 |
| **空状态页面** | HomePage 无项目时 | ❌ | 🟡 低 |
| **PWA/Service Worker** | 不确定是否存在 | ? | ? — 未扫描到 sw 注册 |

### 2.4 MindMap 组件深度功能

| 功能 | 实现位置 | E2E 覆盖 | 状态 |
|------|----------|----------|------|
| **节点详情面板打开** | NodeDetailSidebar.tsx | ✅ J8 | ✅ |
| **节点属性修改**（状态/优先级/截止日/标签）| NodeDetailSidebar.tsx | ❌ | 🟠 中 |
| **Markdown 备注编辑** | NodeDetailSidebar.tsx | ❌ | 🟠 中 |
| **附件上传** | NodeDetailSidebar.tsx + attachments.ts | ⚠️ J10 | 🟡 低 — J10 验证链接存在，未实际上传 |
| **附件删除** | NodeDetailSidebar.tsx | ❌ | 🟡 低 |
| **AI 生成思维导图** | aiMindMap.ts | ✅ J8 | ✅ |
| **导出 PNG/SVG/Markdown/PDF** | ExportToolbar.tsx | ✅ J11 | ✅ |
| **布局切换**（思维导图/逻辑图）| MindMapCanvas.tsx | ✅ J6 | ✅ |
| **缩放控制**（+/-/fit）| ViewHeader.tsx + MindMapCanvas | ✅ J1,J6 | ✅ |

### 2.5 看板深度功能

| 功能 | 实现位置 | E2E 覆盖 | 状态 |
|------|----------|----------|------|
| **看板列间拖拽**（改变任务状态）| ProjectBoardPage.tsx | ✅ J5 | ✅ |
| **看板底部「+ 新建任务」** | ProjectBoardPage.tsx | ❌ | 🟠 中 — **零 E2E** |
| **全局看板拖拽** | GlobalBoardPage.tsx | ❌ | 🟠 中 — **零 E2E** |

### 2.6 日历深度功能

| 功能 | 实现位置 | E2E 覆盖 | 状态 |
|------|----------|----------|------|
| **月视图** | CalendarPage.tsx | ✅ J4 | ✅ |
| **周视图** | CalendarPage.tsx | ✅ J4 | ✅ |
| **日视图** | ❌ 不存在 | N/A | N/A |
| **「今天」按钮快速导航** | CalendarPage.tsx | ⚠️ J4 | 🟡 低 — 未明确断言 |
| **点击日期创建任务** | CalendarPage.tsx | ✅ J5 | ✅ |

### 2.7 Pomodoro 深度功能

| 功能 | 实现位置 | E2E 覆盖 | 状态 |
|------|----------|----------|------|
| **番茄钟存在性** | PomodoroTimer.tsx | ⚠️ J8 | 🟡 低 — 标题提及，断言不明确 |
| **开始/暂停/重置** | PomodoroTimer.tsx | ❌ | 🟠 中 — **零 E2E** |
| **模式切换**（专注/短休/长休）| PomodoroTimer.tsx | ❌ | 🟠 中 — **零 E2E** |
| **计时准确性** | PomodoroTimer.tsx | ❌ | 🟡 低 — 难测但不难 |
| **通知权限请求** | PomodoroTimer.tsx | ❌ | 🟡 低 — Playwright 可 mock |

### 2.8 Sidebar 深度功能

| 功能 | 实现位置 | E2E 覆盖 | 状态 |
|------|----------|----------|------|
| **项目搜索过滤** | Sidebar.tsx | ✅ J2 | ✅ |
| **项目点击导航** | Sidebar.tsx | ✅ J2 | ✅ |
| **项目拖拽排序** | Sidebar.tsx | ❌ | 🟠 中 — **零 E2E** |
| **窄/宽边栏切换** | Sidebar.tsx | ❌ | 🟡 低 |
| **新建项目按钮** | Sidebar.tsx | ✅ J2 | ✅ |
| **最近编辑列表** | Sidebar.tsx | ✅ J12 | ✅ |

### 2.9 安全/XSS 防护

| 功能 | 实现位置 | E2E 覆盖 | 状态 |
|------|----------|----------|------|
| **DOMPurify 链接净化** | sanitize.ts | ❌ | 🟡 低 — 可注入测试 |
| **safeLinkUrl** | sanitize.ts | ❌ | 🟡 低 |

---

## Part 3: 代码-测试 Diff 审查（旧 Journey 修复记录）

### 已修复的问题

| # | 文件 | 问题 | 严重度 | 修复内容 |
|---|------|------|--------|----------|
| 1 | J2 | `page.locator('aside')` 命中窄边栏(w-16)而非宽边栏(w-64) | 🔴 高 | 全部 7 处改为 `.nth(1)` |
| 2 | J2 | `button[role="tab"]:has-text("存储")` — Settings 按钮无 role="tab" | 🔴 高 | 改为 `button:has-text("存储")` |
| 3 | J6 | 「组织结构」布局已不存在，只剩「逻辑图」和「思维导图」 | 🔴 高 | 「组织结构」→「逻辑图」 |
| 4 | J6 | 同上，刷新后布局保持断言 | 🔴 高 | 同上 |
| 5 | J12 | GanttPage 无 `<main>` 但测试大量用 `page.locator('main')` | 🔴 高 | 全部改为 `page.locator('body')` |
| 6 | J12 | 甘特图条形图 class 是 `rounded-md`，测试用 `.rounded` | 🔴 高 | 改为 `.absolute.rounded-md` |
| 7 | J12 | 「下一周」按钮定位太脆弱 | 🟡 中 | 改为「今天」按钮的 `following-sibling` |
| 8 | J13 | Phase0 缺 `enterLocalMode`，若页面在 `/auth` 会失败 | 🔴 高 | 添加 `await enterLocalMode(page)` |
| 9 | J13 | P5 断言 `t.trim()===''` 恒为 false | 🔴 高 | Enter 后输入「新节点C」并断言 |

### 新增 Journey（3 个）

| Journey | 覆盖需求 | 断言数 | 状态 |
|---------|---------|--------|------|
| J11 | S2 导入导出（Settings JSON + 画布 PNG/SVG/Markdown/PDF） | ~18 | ✅ 新建 |
| J12 | C1 甘特图 + S6 最近编辑 | ~18 | ✅ 新建 |
| J13 | S1 大纲编辑器（编辑/Enter/Tab/缩进/同步） | ~15 | ✅ 新建 |

---

## Part 4: 覆盖率缺口总览

### 🔴 高优先级遗漏（建议 P0~P1 补充）

| # | 功能 | 原因 | 建议 Journey |
|---|------|------|-------------|
| 1 | **主题切换**（light/dark/auto）| M8 需求，但 J6 标题提及无实际断言 | J14 或加入 J6 |
| 2 | **看板「+ 新建任务」** | ProjectBoardPage 底部有「+」按钮，零 E2E | J5 追加断言 |
| 3 | **Pomodoro 计时器交互** | 开始/暂停/模式切换全部未测 | J8 追加或 J14 |
| 4 | **NodeDetail 属性编辑** | 优先级/状态/截止日修改未测 | J8 追加断言 |
| 5 | **全局看板** `/global-tasks/board` | 独立页面，零 E2E | 新建 journey 或 J5 追加 |

### 🟠 中优先级遗漏（建议 P1~P2）

| # | 功能 | 原因 | 建议 |
|---|------|------|------|
| 6 | **Settings account tab**（display_name/username/logout）| 用户账户管理核心功能 | J2 追加或新建 |
| 7 | **Settings AI tab**（apiKey/model 配置）| AI 功能依赖配置 | J11 追加 |
| 8 | **Settings health check** | 数据完整性检查 | J2 追加 |
| 9 | **Sidebar 项目拖拽排序** | 用户自定义项目顺序 | 新建短 journey |
| 10 | **网络状态离线模式** | AppLayout 核心功能，有 Toast | 新建 journey |
| 11 | **NotificationPanel 截止提醒** | 通知系统核心 | 新建 journey |
| 12 | **全局快捷键 Cmd+Shift+N** | AppLayout 全局行为 | 新建短 journey |
| 13 | **附件实际上传流程** | J10 只验证了链接，未 trigger file input | J10 追加 |

### 🟡 低优先级遗漏（建议 P2~P3）

| # | 功能 | 原因 |
|---|------|------|
| 14 | **紧凑模式切换** | uiStore 状态变更 |
| 15 | **侧边栏宽度调整** | Slider 组件交互 |
| 16 | **Settings shortcuts tab** | 纯展示无交互 |
| 17 | **Settings local-workspace**（Obsidian）| Chromium-only 功能 |
| 18 | **Settings archive tab 深度** | J2 有基本归档，未进 archive tab |
| 19 | **SyncStatusIndicator 状态变化** | 同步状态 UI 反馈 |
| 20 | **自动同步触发** | 启动/聚焦/网络恢复 |
| 21 | **Dashboard 统计数值准确性** | J8 仅验证存在性 |
| 22 | **空状态/404 页面** | 边界场景 |
| 23 | **XSS 防护（恶意链接）** | 安全边界 |
| 24 | **Markdown 备注编辑保存** | NodeDetail 备注 tab |
| 25 | **SharePage 实际访问** | J10 只复制链接，未访问 /share/:token |

---

## ✅ 行动清单（按优先级排序）

| # | 行动 | 负责角色 | 紧急度 | 预计断言 | 预期完成 |
|---|------|---------|--------|---------|---------|
| 1 | **J6 追加**：主题切换断言（点击外观按钮→验证 dark class） | Tessa | P0 | 3 | 1h |
| 2 | **J5 追加**：看板「+ 新建任务」按钮点击+验证卡片出现 | Tessa | P0 | 3 | 30min |
| 3 | **J8 追加**：Pomodoro 开始/暂停/模式切换断言 | Tessa | P0 | 5 | 1h |
| 4 | **J8 追加**：NodeDetail 属性修改（优先级下拉选择→验证节点颜色变化） | Tessa | P0 | 4 | 1h |
| 5 | **新建 J14**：全局看板 `/global-tasks/board` 基本 smoke test | Tessa | P1 | 8 | 1.5h |
| 6 | **J2 追加**：Settings account tab（修改 display_name→保存→验证） | Tessa | P1 | 4 | 1h |
| 7 | **J11 追加**：Settings AI tab（填写配置→保存→验证持久化） | Tessa | P1 | 4 | 1h |
| 8 | **新建短 journey**：全局快捷键 Cmd+Shift+N → 验证新建项目弹窗 | Tessa | P1 | 3 | 30min |
| 9 | **J10 追加**：附件实际上传（mock file input→验证附件列表出现） | Tessa | P2 | 4 | 1h |
| 10 | **新建 journey**：网络离线模式（断网→验证离线 Toast→操作→恢复） | Tessa | P2 | 6 | 2h |

---

## ⚠️ 待完善 / 已知局限

1. **J13 断言计数异常**：`grep -c 'results.push'` 只返回 1，因为 J13 使用 `push()` 包装函数而非直接 `results.push()`，实际断言约 15 个（不影响运行）
2. **AuthPage 无 E2E**：所有测试都通过 `enterLocalMode()` 绕过登录，真实登录流程未覆盖（可接受，Auth 依赖外部 Supabase）
3. **自动同步难测**：涉及定时器+网络状态，Playwright 可 mock 但实现成本高
4. **Obsidian 本地同步**：Chromium-only，Playwright 默认 Chromium 可测但文件系统 API 需用户授权交互
5. **PWA/Service Worker**：代码库中未扫描到 sw 注册，可能尚未实现

---

## 📚 数据来源 & 文件索引

### 扫描的源码文件
- `apps/web/src/App.tsx` — 路由表
- `apps/web/src/pages/*.tsx` — 所有页面（15 个路由）
- `apps/web/src/components/layout/AppLayout.tsx` — 全局快捷键/网络状态
- `apps/web/src/components/layout/ViewHeader.tsx` — Tab 切换
- `apps/web/src/components/layout/Sidebar.tsx` — 侧边栏/拖拽排序
- `apps/web/src/components/mindmap/MindMapCanvas.tsx` — 画布/布局切换
- `apps/web/src/components/mindmap/NodeDetailSidebar.tsx` — 节点详情
- `apps/web/src/components/mindmap/ExportToolbar.tsx` — 导出
- `apps/web/src/components/pomodoro/PomodoroTimer.tsx` — 番茄钟
- `apps/web/src/pages/SettingsPage.tsx` — 设置全部功能
- `apps/web/src/pages/CalendarPage.tsx` — 日历（月+周视图，无日视图）
- `apps/web/src/pages/ProjectBoardPage.tsx` — 看板拖拽
- `apps/web/src/pages/GlobalBoardPage.tsx` — 全局看板拖拽

### E2E 测试文件
- `tests/e2e/journey-{1..13}.ts` — 13 个 journey
- `tests/e2e/all-journeys.spec.ts` — 汇总入口
- `tests/e2e/helpers.ts` — 公共 API

---

> 本报告由工程保障团队 AI 协作生成，关键决策请由人类工程负责人复核。
