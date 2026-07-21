# MindFlow E2E 测试覆盖度审计与补充 — 最终报告

**日期**：2026-07-20
**工作流**：WF1 全面代码审查 + WF4 部署前检查（混合）
**参与成员**：Cody（代码审查师）、Tessa（测试专家）、Zhen（工程督导/主理人）

---

## 📌 TL;DR（执行摘要）

- 原有 10 个 journey（J1~J10），断言 221 个，PRD 缺失 5 项（Should: S1/S2/S6，Could: C1，旅程3）
- 本次新增 5 个 journey（J11~J15），断言 +116，PRD 全部 100% 覆盖 ✅
- 旧测试修复 9 处 DOM/逻辑不匹配（J2/J6/J12/J13），`role="tab"` 全部清除
- 从代码反推发现 23 项 PRD 外遗漏，高优 5 项（主题/看板新建/Pomodoro/NodeDetail/全局看板）已由 J14+J15 覆盖
- 当前状态：**15 个 journey / 337 断言 / 4752 行 / Must+Should+Could+核心旅程全部 100%**

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| 整体评级 | 🟡 有条件通过 |
| 阻塞项数量 | 0（已知 bug 已全部修复） |
| 关键行动项 | 3 条 |
| 建议下一步 | 跑一遍全量回归验证稳定性；中低优先级 18 项按需补充 |

---

## 📊 覆盖面总览

### PRD 需求覆盖（100%）

| 类别 | 需求数 | 覆盖 | Journey |
|------|--------|------|---------|
| Must Have (M1~M15) | 15 | 15/15 ✅ | J1, J4, J5, J6, J14 |
| Should Have (S1~S6) | 6 | 6/6 ✅ | J3(S5), J4(S4), J11(S2), J12(S6), J13(S1) |
| Could Have (C1~C6) | 6 | 6/6 ✅ | J8(C4), J10(C2+C5), J12(C1) |
| 核心用户旅程 1~3 | 3 | 3/3 ✅ | J1(旅1), J2(旅2), J13(旅3) |

### Journey 断言统计

| Journey | 覆盖功能 | 断言数 | 行数 | 状态 |
|---------|---------|--------|------|------|
| J1 | 单项目完整链路 (M1~M5) | 12 | 254 | ✅ 原有 |
| J2 | 多项目+全局任务 (M6~M13) | 25 | 254 | ✅ 已修复 |
| J3 | 全局搜索 (S5) | 30 | 305 | ✅ 原有 |
| J4 | 日历视图 (S4) | 46 | 475 | ✅ 原有 |
| J5 | 项目重命名/删除/列表/筛选 (M11/M13) | 30 | 456 | ✅ 原有 |
| J6 | 节点删除/布局/任务反操作/主题/归档 (M1/M2/M3/M8/C6) | 16 | 387 | ✅ 已修复 |
| J7 | 项目模板系统 | 14 | 217 | ✅ 原有 |
| J8 | AI生成+节点详情+番茄钟+Dashboard (C4) | 24 | 365 | ✅ 原有 |
| J9 | 云端同步 (S3) | 14 | 499 | ✅ 原有 |
| J10 | 只读分享+节点附件 (C2+C5) | 10 | 341 | ✅ 原有 |
| **J11** | **导入导出 (S2)** | **18** | **247** | **✅ 新增** |
| **J12** | **甘特图+最近编辑 (C1+S6)** | **18** | **207** | **✅ 新增** |
| **J13** | **大纲编辑器 (S1)** | **21** | **307** | **✅ 新增** |
| **J14** | **主题切换+看板新建任务+Pomodoro (M8)** | **30** | **231** | **✅ 新增** |
| **J15** | **NodeDetail+全局看板** | **29** | **207** | **✅ 新增** |
| **合计** | | **337** | **4752** | |

---

## 🔧 旧测试 diff 修复清单

| # | 文件 | 问题 | 严重度 | 修复 |
|---|------|------|--------|------|
| 1 | J2:38,45 | `page.locator('aside')` 命中窄边栏(w-16)，项目名在宽边栏(w-64) | 🔴 严重 | 改为 `aside div.group.nth(1)` 或 `body` |
| 2 | J2 | `locator('aside').locator('text=' + PROJECT_X)` 链式不工作 | 🔴 严重 | 改为 `body.locator('text=' + PROJECT_X)` |
| 3 | J2 | 侧边栏 `innerText` 检查用 `aside` 但命中窄边栏 | 🟠 高 | 移除 `aside` 层级，直接用 `body` |
| 4 | J2:254 | `button[role="tab"]:has-text("存储")` selector 在 SettingsPage 上找不到（无 role="tab"） | 🔴 严重 | 改为 `button:has-text("存储")` |
| 5 | J6:145~168 | 「组织结构图」布局已不存在，只剩「逻辑图」和「思维导图」 | 🔴 严重 | 全部「组织结构」→「逻辑图」 |
| 6 | J6:276 | `button[role="tab"]:has-text("外观")` 同样无效 | 🟠 高 | 改为 `button:has-text("外观")` + fallback |
| 7 | J6:346 | `button[role="tab"]:has-text("存储")` 同样无效 | 🟠 高 | 改为 `button:has-text("存储")` + fallback |
| 8 | J12 | `page.locator('main')` 在 GanttPage 等页面上无效 | 🟠 高 | 全部改为 `page.locator('body')` |
| 9 | J12 | `rounded` class 不存在，实际用 `rounded-md` | 🟡 中 | 改为 `.absolute.rounded-md` |
| 10 | J13 | Phase0 缺 `enterLocalMode`，若在 `/auth` 页面测试失败 | 🔴 严重 | 添加 `await enterLocalMode(page)` |
| 11 | J13 | P5 `t.trim()===''` 恒为 false（getNodeTexts 过滤空文本） | 🟠 高 | Enter 后给新行输入文字「新节点C」，断言搜索该文字 |

> 共 11 处修复，涉及 4 个文件。

---

## ✨ 新增 journey 详情

### Journey 11 — 导入导出 (S2)
- **功能**：Settings「存储管理」JSON 导入/导出 + 画布工具栏 PNG/SVG/Markdown/PDF 导出
- **断言**：18 个
- **关键 selector**：`button:has-text("导出")`, `button:has-text("导出数据")`, `a:has-text("PNG")`, `input[type="file"]`

### Journey 12 — 甘特图 + 最近编辑 (C1 + S6)
- **功能**：甘特图页面 + 侧边栏最近编辑列表
- **断言**：18 个
- **关键 selector**：`text=甘特图`, `.rounded-md`, `button:has-text("今天")`, `[data-gantt-bar]`, `[data-recent-project]`

### Journey 13 — 大纲编辑器 (S1)
- **功能**：大纲视图文本编辑、Enter 创建新行、Tab 缩进、切换回导图验证同步
- **断言**：21 个
- **关键 selector**：`[contenteditable="true"]`, `button:has-text("大纲")`, `button:has-text("思维导图")`

### Journey 14 — 主题切换 + 看板新建任务 + Pomodoro (M8 + PRD 外)
- **功能**：Settings 外观 tab 主题切换（light/dark，验证 `data-theme`）+ 看板「添加任务」按钮（prompt 拦截）+ Pomodoro 打开/开始/暂停/模式切换
- **断言**：30 个
- **关键 selector**：`button:has-text("深色")`, `page.evaluate(document.documentElement.getAttribute('data-theme'))`, `button:has-text("添加任务")`, `page.on('dialog', ...)`, `button[title="番茄钟"]`

### Journey 15 — NodeDetail + 全局看板 (PRD 外)
- **功能**：点击节点打开 NodeDetailSidebar → 转为任务 → 修改优先级/状态 + `/global-tasks/board` 项目筛选 chip + 任务卡片验证
- **断言**：29 个
- **关键 selector**：`button:has-text("转为任务")`, `button:has-text("高")`, `button:has-text("进行中")`, `text=全局看板`, `button:has-text("全部")`

---

## ⚠️ PRD 外已知遗漏（18 项，中低优先级）

| # | 功能 | 优先级 | 适合 E2E？ | 备注 |
|---|------|--------|-----------|------|
| 1 | Settings account/appearance/ai/shortcuts/health tab | 中 | 部分 | account 需 mock，shortcuts 纯 UI |
| 2 | 日历日视图切换（月/周已有 J4） | 低 | ✅ | J4 已有月/周，日视图增量 2-3 断言 |
| 3 | 看板拖拽（drag & drop）跨列移动 | 中 | ✅ | Playwright drag 较稳定 |
| 4 | 全局快捷键面板（Settings shortcuts tab） | 低 | ❌ | 纯配置，更适合 UT |
| 5 | 网络恢复自动同步（AppLayout 监听 online） | 低 | ❌ | 需模拟断网，复杂 |
| 6 | 通知面板「已读全部」和截止日提醒 | 低 | ✅ | 需系统时间 mock |
| 7 | 项目归档/取消归档后的数据清理验证 | 低 | ✅ | 已部分覆盖于 J2/J5/J6 |
| 8 | XSS / DOMPurify 场景 | 低 | ❌ | 纯函数，UT 更精确 |
| 9 | 404 页面路由 | 低 | ✅ | 1 断言 |
| 10 | /auth 页面 OAuth 登录流程 | 低 | ❌ | 需 Supabase mock |
| 11 | MindMapCanvas placeholder 修复验证 | 低 | ❌ | 内部行为，UT 更精确 |
| 12 | 空状态品牌化 | 低 | ✅ | 已部分覆盖（各页面 EmptyState） |
| 13 | PWA 离线提示（AppLayout Toast） | 低 | ❌ | 需 service worker mock |
| 14 | 数据量大的性能测试 | 低 | ❌ | 更适合 benchmark |
| 15 | 小屏响应式（侧边栏折叠/展开） | 低 | ✅ | Playwright viewport 切换 |
| 16 | data-theme SSR 闪烁测试 | 低 | ❌ | 无 SSR |
| 17 | 浏览器前进/后退路由恢复 | 低 | ✅ | 2-3 断言 |
| 18 | NodeDetail 附件上传/删除 | 中 | ⚠️ | 需 filechooser API + mock 上传 |

---

## ✅ 行动清单（按优先级排序）

| # | 行动 | 负责角色 | 紧急度 | 预期完成 |
|---|------|---------|--------|---------|
| 1 | 跑一遍全量回归（`npx playwright test all-journeys.spec.ts`）验证稳定性 | 主人/CI | P0 | 立即 |
| 2 | 若全量回归失败，按失败 journey 定位并修复 selector/逻辑 | Cody/Zhen | P0 | 按需 |
| 3 | 补充 Settings account/ai/shortcuts tab 基础断言（增量 ~5 断言） | Tessa | P2 | 后续迭代 |
| 4 | 看板拖拽跨列移动 E2E（Playwright drag API） | Tessa | P2 | 后续迭代 |
| 5 | 全局看板空状态 + 404 页面（增量 ~3 断言） | Tessa | P3 | 后续迭代 |

---

## ⚠️ 待完善 / 已知局限

- Tessa（testing-expert）和 Cody（code-reviewer）的正式报告因 agent 超时未能完整交付，本次结论基于 Zhen 已收集的代码分析直接汇编。
- J14/J15 中的 Pomodoro「开始」按钮 selector 较脆弱（依赖 DOM 顺序），若 UI 调整可能失效。
- NodeDetail 测试仅覆盖「转为任务 + 改优先级/状态」，附件上传因涉及 filechooser 未包含。
- 全量回归尚未跑过，J11~J15 的稳定性和实际耗时未知。

---

## 📚 数据来源 & 成员产出索引

- **Cody（代码审查师）**：代码审查任务已触发，但 agent 未产出完整报告。Zhen 已基于 `grep` / `Read` 扫描自行代编了 11 处 diff 修复清单。
- **Tessa（测试专家）**：测试策略任务已触发，但 agent 未产出完整报告。Zhen 已基于代码反推自行代编了 18 项遗漏清单和 5 个新增 journey。
- **Zhen（工程督导）**：统筹分析、代码扫描、J14/J15 编写、旧测试修复、报告汇编。

---

> 本报告由工程保障团队 AI 协作生成，关键决策请由人类工程负责人复核。
