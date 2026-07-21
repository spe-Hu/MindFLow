# 运维：测试、CI/CD、部署、开发工具

## 测试体系

### E2E（Playwright）

`tests/e2e/` 是 Playwright 测试套件，覆盖所有 PRD 用户旅程。每个 `journey-N.ts` 是一个独立的 Playwright 风格 helper，可由测试 driver 直接 import（`runJourneyN(page)` 返回 `{ name, pass, detail }[]`）。

| 文件 | 覆盖 | 关键 AC |
|------|------|---------|
| `all-journeys.spec.ts` | 主入口，注册 10 个 journey，输出聚合结果 |
| `journey-1.ts` | 单项目完整链路（创建 → 节点 CRUD → 转任务 → 看板拖拽 → 双向同步 → 持久化） | AC-1~AC-5 |
| `journey-2.ts` | 多项目 + 全局任务 + 跨项目双向同步 | AC-6~AC-13 |
| `journey-3.ts` | 全局搜索（S5） |
| `journey-4.ts` | 日历视图（S4，含周/月双模式） |
| `journey-5.ts` | 项目重命名 / 删除 / 列表 / 筛选 / 空状态（M11/M13） |
| `journey-6.ts` | 节点删除 / 布局切换 / 任务反操作 / 主题 / 归档（M1/M2/M3/M8/C6） |
| `journey-7.ts` | 项目模板系统（产品开发 / 周计划 / 空白模板） |
| `journey-8.ts` | 番茄钟 + 任务计数 |
| `journey-9.ts` | 自动同步 (online/offline/focus) |
| `journey-10.ts` | 只读分享链接 (C2) + 节点图片/文件附件 (C5)，二者都 mock Supabase |

工具：`smoke-test.mts`（快速冒烟）、`run-all-journeys.mts`（顺序跑全部旅程）、`run-journey1-only.mts`（最快路径）、`test-spa-nav.mts`（SPA 路由冒烟）。

### Playwright 配置

`playwright.config.ts`：
- `testDir: '.'`, `timeout: 120s`, `expect.timeout: 10s`。
- `use.baseURL: http://localhost:5173`，`viewport: 1366×900`，`headless: true`，`trace: 'on'`。
- 单 worker `workers: 1` 顺序跑（避免 SQLite/IndexedDB 竞争）。
- HTML reporter 输出到 `playwright-report/`。

`playwright.local.config.ts` 是本地调试用（`apps/web` 在 5173 起 dev server）。

### 隔离策略

每个 journey `before all`：

1. 清 `localStorage.mindflow-*`。
2. 用 `window.__mindflowDb.delete()` 清 IndexedDB。`__mindflowDb` 是 `db.ts` 末尾在 `import.meta.env.DEV` 下注入的 debug 全局。
3. `page.goto('/auth')` 重置到登录态。

## CI/CD

### `.github/workflows/ci.yml`

- 触发：`push` (main/develop) 与 PR 到 main。
- Job 1：`lint-and-build`（`apps/web`），step：`npm ci` → `npm run lint (oxlint)` → `npm run build`。构建参数注入占位 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`（仅在 secret 存在时覆盖）。
- Job 2：`e2e`，安装前端 + e2e 依赖、`playwright install chromium`、跑 Playwright。

### `.github/workflows/openwiki-update.yml`

- 触发：`schedule (cron 0 8 * * *)` 每日一次 + 手动 `workflow_dispatch`。
- 步骤：`checkout` → `setup-node 22` → `npm i -g openwiki` → `openwiki code --update --print`，再用 `peter-evans/create-pull-request` 把 `openwiki/`, `AGENTS.md`, `CLAUDE.md`, `.github/workflows/openwiki-update.yml` 提交到 `openwiki/update` 分支。
- 所需 secret（由运维维护）：`OPENROUTER_API_KEY`（默认模型 `z-ai/glm-5.2`）、`LANGSMITH_API_KEY`、LangChain tracing 环境变量。

### AGENTS / CLAUDE 头部

`/AGENTS.md` 与 `/CLAUDE.md` 是 OpenWiki 的入口标牌（`<!-- OPENWIKI:START -->` 区块），告诉 agent 从 `openwiki/quickstart.md` 开始探索。

## 本地开发

```bash
# 主应用
cd apps/web
npm install
cp .env.example .env.local       # 可选 Supabase
npm run dev                       # http://localhost:5179
npm run lint                      # oxlint
npm run build                     # vite build → dist/
npm run preview                   # 预览生产构建

# 落地页 (独立)
cd apps/landing
npm install
npm run dev                       # Vite 默认端口

# E2E
cd tests/e2e
npm install
npx playwright install chromium
npx playwright test all-journeys.spec.ts
```

`scripts/run-e2e.mjs` 在根目录提供一个跨子目录跑 e2e 的快捷脚本。

## 部署

> 当前仓库内未存部署配置信息。`overview.md` 提到 Cloudflare Pages（`mindflow-app.pages.dev`）；`apps/web/dist/` 是 Vite 静态产物，可直接挂到任意 CDN。

部署前 checklist：

1. 设 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 为真实值。
2. 应用所有 migrations（001~006）到目标 Supabase 项目。
3. 上传 `public/_redirects`（SPA fallback）。
4. 检查 SW 是否正确注册（新 SW `skipWaiting: true`，通常 install 一次即可）。

## 开发工具与脚本

| 工具 | 文件 | 作用 |
|------|------|------|
| `devConsole.ts` | `apps/web/src/lib/devConsole.ts` | 生产构建会剔除 `console` |
| `__mindflowDb` 全局 | `db.ts` 末尾 dev-only | 给 E2E 调 `db.delete()` |
| `cleanupOrphanedTasks()` | `db.ts` | 每次 `AppLayout` mount 时跑一次 |
| `runHealthCheck()` / `fixHealthIssues` | `db.ts` | Settings → 存储 提供手动触发 |
| `scripts/run-e2e.mjs` | 根目录 | 跨平台本地跑 e2e |
| `oxlint` | `apps/web` & `apps/landing` | 替代 ESLint，开箱即用 |

## 内存 / 协作脚本

仓库还存在以下与运行时无关的内容，agent 无需修改：

- `.workbuddy/memory/MEMORY.md` + `automation-*` — 自动化系统的日常日志与记忆，供协同 agent 共享上下文。
- `shared/pool.md` — 共享上下文池。
- `deliverables/engineering-assurance/` — 阶段性工程交付物（launch readiness report 等）。
- `docs/` — 产品文档（PRD / SPEC / ARCHITECTURE / UIUX / E2E_REPORT / DESIGN_REVIEW / design-prompts）。**这些是产品文档，不是由 OpenWiki 生成的 wiki。** OpenWiki 只覆盖 `openwiki/` 目录。

## 故障排查速查

| 现象 | 可能原因 | 看哪里 |
|------|---------|--------|
| 项目切换时 MindMapCanvas 白屏 | `initMindMap` 异步 + 数据未到 | 检查 `latestTreeRef.current` 与 `usingDefaultDataRef` |
| 节点拖动后任务视图未更新 | `data_change` 高频竞争 | 看 `taskSyncState` 防抖 Map 是否正确清理 |
| 番茄钟完成没增加计数 | `pomodoro_count` 列缺失 | 重新执行 `migrations/004_add_task_columns.sql` |
| 公开链接 404 | `shared_links` RLS 未启用 | 执行 `migrations/005_add_shared_links.sql` |
| 附件上传失败 | Storage bucket 不存在或 RLS 缺失 | 执行 `migrations/006_add_attachments.sql` |
| 生产构建有 `INEFFECTIVE_DYNAMIC_IMPORT` 警告 | 拆包中对静态依赖使用 `await import` | 改为顶部同步 import（`db.ts / templates.ts / projectStore` 的依赖） |
| 自动同步没触发 | 30s 节流窗口内 | 看 `useSyncStore.lastError` + Hook 触发点 (`AppLayout#handleVis` 与 `handleOnline`) |
