# MindFlow 当前目录结构检查报告

> 检查日期：2026-07-20  
> 检查对象：当前工作目录的**实时文件状态**，不是仅基于 Git 最新提交  
> 检查方式：真实目录扫描、文件数量与空间统计、关键配置/入口文件读取、Git 跟踪与忽略规则核对

## 1. 结论摘要

当前仓库是一个以 `apps/web` 为核心的**多应用前端仓库**，包含：

1. `apps/web`：MindFlow 主产品 SPA；
2. `apps/landing`：按当前 OpenWiki/README 组织的落地页；
3. `landing-page`：另一份独立演进的落地页；
4. `tests/e2e`：10 条用户旅程的 Playwright 验收测试；
5. `supabase`：云端数据库迁移与本地 Supabase 配置；
6. `docs` + `openwiki`：产品文档与自动生成的代码文档；
7. `deliverables`、`shared`、`.workbuddy`：工程交付、协作上下文与自动化记忆。

### 核心数据

| 指标 | 当前值 | 说明 |
|---|---:|---|
| 仓库磁盘占用 | **约 1.1 GB** | 当前 `du` 结果；包含依赖、Git 历史、缓存、测试报告 |
| 有效工作文件 | **246 个** | 排除 `.git`、`node_modules`、`dist`、测试报告、工具缓存；包含本报告 |
| 有效文件体积 | **约 2.05 MiB（2.15 MB）** | 实际源码、文档、配置的总量 |
| Git 已跟踪文件 | **241 个** | 当前工作树另有未跟踪文件/目录 |
| 主应用页面 | **13 个** | `apps/web/src/pages` |
| 主应用组件 | **48 个** | 其中 UI 原子组件 22 个 |
| 主应用状态文件 | **9 个** | 含 1 个测试文件 |
| 主应用基础设施文件 | **23 个** | `apps/web/src/lib`，含单元测试 |
| E2E 用户旅程 | **10 条** | 统一入口 `all-journeys.spec.ts` |
| Supabase 迁移 | **6 个** | schema、字段扩展、分享、附件 |

### 总体判断

- **结构主线清楚**：主应用、落地页、测试、数据库、文档已分区。
- **不是完整 npm workspace**：根 `package.json` 没有 `workspaces`，各子项目独立安装依赖。
- **存在两份落地页实现**：两者已经产生明显代码差异，不能直接当成完全重复副本删除。
- **当前正处于结构重构中**：`apps/web/src/lib/db.ts` 正拆分为 `lib/db/`、`taskTreeSync.ts`、`storageHealth.ts` 等模块；报告反映的是这批未提交改动后的实时结构。
- **测试入口存在断层**：正式 Playwright 入口覆盖 10 条 journey，但旧 runner、端口和依赖声明没有完全同步。
- **文档有轻微漂移**：OpenWiki 仍引用旧 `lib/db.ts`，Obsidian 文档仍标为 `ready-for-agent`，但对应代码已经出现。

---

## 2. 当前仓库目录树

以下目录树已过滤 `node_modules`、`dist`、`.git`、Playwright 报告、工具缓存等大体积生成物。

```text
Mindflow-workbuddy/
├── apps/
│   ├── web/                         # MindFlow 主产品
│   │   ├── public/                  # favicon、icons、SPA _redirects
│   │   ├── src/
│   │   │   ├── components/          # 业务组件与 UI 原子组件
│   │   │   │   ├── global/          # 跨项目任务列表/看板
│   │   │   │   ├── layout/          # AppLayout、Header、Sidebar、ViewHeader
│   │   │   │   ├── local/           # Obsidian 本地工作空间面板
│   │   │   │   ├── mindmap/         # 导图、节点工具栏、同步引擎、导出
│   │   │   │   ├── outline/         # 大纲编辑器
│   │   │   │   ├── pomodoro/        # 番茄钟
│   │   │   │   ├── project/         # 项目列表、新建项目
│   │   │   │   ├── search/          # 全局搜索
│   │   │   │   ├── sync/            # 云同步状态与迁移弹窗
│   │   │   │   ├── task/            # 任务卡片、列表、看板、筛选
│   │   │   │   └── ui/              # shadcn 风格基础组件
│   │   │   ├── pages/               # 13 个路由页面
│   │   │   ├── stores/              # Zustand 状态层
│   │   │   ├── hooks/               # 鉴权、主题、PWA hooks
│   │   │   ├── lib/                 # 数据、同步、AI、安全、导入导出
│   │   │   │   ├── db/              # Dexie schema + project/task repositories
│   │   │   │   ├── localFileSync.ts # Native File System API
│   │   │   │   ├── localSyncEngine.ts
│   │   │   │   ├── smmMdParser.ts   # .smm.md 解析
│   │   │   │   ├── taskTreeSync.ts  # 导图树与任务同步
│   │   │   │   ├── sync.ts          # Supabase 双向同步
│   │   │   │   ├── supabase.ts      # Supabase client
│   │   │   │   └── ...
│   │   │   ├── types/               # Supabase 数据库类型
│   │   │   ├── App.tsx              # 路由与应用边界
│   │   │   └── main.tsx             # React 启动入口
│   │   ├── package.json              # 主应用依赖与脚本
│   │   ├── vite.config.ts            # Vite、PWA、Vitest、@ 别名
│   │   ├── tailwind.config.js
│   │   └── tsconfig*.json
│   └── landing/                     # 落地页实现 A
│       ├── public/
│       ├── src/
│       │   ├── components/
│       │   ├── sections/
│       │   ├── App.tsx
│       │   └── main.tsx
│       └── package.json
├── landing-page/                    # 落地页实现 B，独立演进
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── sections/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── tests/
│   └── e2e/
│       ├── all-journeys.spec.ts     # 10 条 journey 的统一 Playwright 入口
│       ├── journey-1.ts ... journey-10.ts
│       ├── journey-10.spec.ts       # Journey 10 的额外 spec 入口
│       ├── helpers.ts
│       ├── playwright.config.ts
│       ├── playwright.local.config.ts
│       ├── run-all-journeys.mts
│       ├── run-journey1-only.mts
│       ├── smoke-test.mts
│       └── test-spa-nav.mts
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_alter_uuid_to_text.sql
│   │   ├── 003_sort_order_bigint.sql
│   │   ├── 004_add_task_columns.sql
│   │   ├── 005_add_shared_links.sql
│   │   └── 006_add_attachments.sql
│   └── config.toml
├── docs/
│   ├── adr/0001-local-obsidian-sync.md
│   ├── PRD.md
│   ├── SPEC.md
│   ├── SPEC-Obsidian-Sync.md
│   ├── ARCHITECTURE.md
│   ├── UIUX.md
│   ├── DESIGN_REVIEW.md
│   ├── E2E_REPORT.md
│   ├── design-prompts.md
│   └── INDEX.md
├── openwiki/                        # 自动生成的代码知识文档
│   ├── quickstart.md
│   ├── architecture.md
│   ├── data-model.md
│   ├── apps-web.md
│   ├── features-mindmap.md
│   ├── features-productivity.md
│   ├── integrations.md
│   └── operations.md
├── .github/workflows/
│   ├── ci.yml                      # lint + build + E2E
│   └── openwiki-update.yml         # 每日刷新 OpenWiki
├── scripts/
│   └── run-e2e.mjs                 # 旧的跨目录 E2E runner
├── deliverables/
│   └── engineering-assurance/      # 阶段性工程保证报告
├── shared/
│   └── pool.md                     # PM/设计/架构共享上下文池
├── teach/
│   └── llm-training/               # 独立的大模型学习材料
├── .workbuddy/                     # 自动化、项目记忆、产物
├── .gitnexus/                      # 代码图谱索引缓存
├── .wrangler/                      # Cloudflare Wrangler 缓存
├── .claude/                        # 本地计划文件
├── AGENTS.md / CLAUDE.md           # Agent 的 OpenWiki 入口说明
├── CONTEXT.md                      # Obsidian Sync 领域术语
├── overview.md                     # 历史项目总览
├── README.md                       # 仓库使用说明
└── package.json                    # 根级少量依赖；非 workspace 管理器
```

---

## 3. 主应用 `apps/web` 结构

### 3.1 应用入口与路由

入口链路：

```text
src/main.tsx
  └── src/App.tsx
      ├── ErrorBoundary
      ├── BrowserRouter
      ├── Auth / Local Mode gate
      ├── AppLayout
      ├── 13 个路由页面
      ├── NewProjectDialog
      └── PomodoroTimer
```

`App.tsx` 当前定义的主要路由：

| 路由 | 页面 | 职责 |
|---|---|---|
| `/` | `HomePage` | 首页/最近项目 |
| `/dashboard` | `DashboardPage` | 数据总览 |
| `/project/:id` | `ProjectMindMapPage` | 项目思维导图 |
| `/project/:id/outline` | `OutlinePage` | 大纲视图 |
| `/project/:id/list` | `ProjectListPage` | 项目任务列表 |
| `/project/:id/board` | `ProjectBoardPage` | 项目看板 |
| `/global-tasks` | `GlobalTasksPage` | 全局任务列表 |
| `/global-tasks/board` | `GlobalBoardPage` | 全局任务看板 |
| `/calendar` | `CalendarPage` | 日历视图 |
| `/gantt` | `GanttPage` | 甘特图 |
| `/settings` | `SettingsPage` | 设置、同步、存储 |
| `/auth` | `AuthPage` | 登录/本地模式入口 |
| `/share/:token` | `SharePage` | 无需登录的只读分享 |

除 `HomePage`、`DashboardPage` 外，大部分非核心页面使用 `React.lazy` 做路由级拆包。

### 3.2 组件分组

| 目录 | 文件数 | 职责 |
|---|---:|---|
| `components/ui` | 22 | Button、Dialog、Tabs、Tooltip、Sheet、ErrorBoundary 等原子组件 |
| `components/mindmap` | 7 | 导图画布、节点详情、节点工具栏、导出、任务同步引擎 |
| `components/layout` | 5 | AppLayout、Header、Sidebar、ViewHeader、NotificationPanel |
| `components/task` | 4 | TaskBoard、TaskList、TaskCard、TaskFilterBar |
| `components/global` | 2 | 跨项目列表与看板 |
| `components/project` | 2 | 新建项目与项目列表 |
| `components/sync` | 2 | 云同步迁移和状态提示 |
| `components/local` | 1 | 本地工作空间面板 |
| `components/outline` | 1 | 大纲编辑器 |
| `components/pomodoro` | 1 | 番茄钟 |
| `components/search` | 1 | Cmd+K 全局搜索 |

### 3.3 状态层

`stores/` 当前包含：

- `authStore.ts`：登录、本地模式、用户状态；
- `projectStore.ts`：项目加载、创建、更新、归档、排序；
- `taskStore.ts`：任务 CRUD 与导图回写；
- `syncStore.ts`：自动双向云同步状态；
- `localWorkspaceStore.ts`：Obsidian 目录注册、扫描、5 秒轮询；
- `uiStore.ts`：弹窗、侧边栏等全局 UI 状态；
- `pomodoroStore.ts`：番茄钟状态；
- `notificationStore.ts`：截止提醒；
- `localWorkspaceStore.test.ts`：本地工作空间单元测试。

### 3.4 数据与基础设施层

当前 live working tree 正把原来的单文件 `lib/db.ts` 拆成更清晰的模块：

```text
lib/db/
├── schema.ts        # Dexie 表、LocalProject/Task/Mindmap/Setting 类型
├── projectRepo.ts   # Project CRUD
├── taskRepo.ts      # Task CRUD
└── index.ts         # 统一导出边界
```

其余重要基础设施：

| 文件 | 职责 |
|---|---|
| `taskTreeSync.ts` | 导图树节点与任务记录的同步 |
| `sync.ts` | 本地 IndexedDB 与 Supabase 的双向同步 |
| `supabase.ts` | Supabase Client 初始化 |
| `localFileSync.ts` | File System Access API：目录授权、递归扫描、读写 `.smm.md` |
| `localSyncEngine.ts` | 本地文件 LWW 同步与 dirty 项目写回 |
| `smmMdParser.ts` | Obsidian/simple-mind-map 文件解析与序列化 |
| `storageHealth.ts` | 本地数据完整性检查/修复 |
| `attachments.ts` | 节点附件上传与管理 |
| `share.ts` | 只读分享链接 |
| `aiMindMap.ts` | OpenAI 兼容接口生成导图 |
| `sanitize.ts` | DOMPurify XSS 防护 |
| `templates.ts` | 项目模板 |
| `outline.ts` | 导图树与大纲文本转换 |

### 3.5 数据流

```text
React Pages / Components
        │
        ▼
Zustand Stores
        │
        ├── Dexie / IndexedDB（本地优先）
        │      ├── projects
        │      ├── mindmaps
        │      ├── tasks
        │      └── settings
        │
        ├── Supabase（登录后云同步）
        │      ├── Auth
        │      ├── PostgreSQL
        │      └── Storage
        │
        └── 本地 .smm.md（Chromium File System Access API）
               └── Obsidian 本地工作空间双向同步
```

---

## 4. 其他关键目录

| 目录 | 当前职责 | 状态判断 |
|---|---|---|
| `apps/landing` | 落地页实现 A；OpenWiki 与根 README 指向它 | 结构规范，但最近提交早于根 `landing-page` |
| `landing-page` | 落地页实现 B；配置了 `base: './'`，代码在 2026-07-17 仍有更新 | 与 `apps/landing` 已分叉，需确认哪个是部署源 |
| `tests/e2e` | 10 条 Playwright 用户旅程与辅助 runner | 正式 spec 完整，依赖声明/旧 runner 有问题 |
| `supabase` | 6 次 SQL 迁移与本地 CLI 配置 | 结构清楚；`.temp` 有忽略规则，但已有 9 个历史文件被 Git 跟踪 |
| `docs` | 人工维护的 PRD/SPEC/架构/UI/测试文档 | 产品文档主源，Obsidian 状态需同步 |
| `openwiki` | 自动生成的代码级文档 | 内容完整，但当前目录和工作流尚未被 Git 跟踪 |
| `deliverables` | 阶段性可交付报告 | 合理，适合继续放审计/复盘报告 |
| `shared` | 共享上下文池 | 非运行时依赖 |
| `teach` | LLM 训练学习材料 | 与 MindFlow 产品无直接关系，且当前未跟踪 |
| `.workbuddy` | 自动化历史、项目记忆、产物 | 根规则已忽略，但历史文件已有部分被 Git 跟踪 |
| `.gitnexus` | 代码图谱索引，约 68 MB | 仅在本机 `.git/info/exclude` 忽略，仓库规则未覆盖 |
| `.claude` | 本地计划文件 | 当前未跟踪且未被 `.gitignore` 忽略 |
| `.wrangler` | Cloudflare CLI 缓存 | 已由根 `.gitignore` 忽略 |

---

## 5. 磁盘占用分析

| 目录/内容 | 占用 | 说明 |
|---|---:|---|
| `apps/` | **564 MB** | `apps/web/node_modules` 394 MB；`apps/landing/node_modules` 166 MB |
| `landing-page/` | **186 MB** | 其中 `node_modules` 185 MB |
| 根 `node_modules/` | **19 MB** | 根级 Playwright/DOMPurify 等依赖 |
| `.git/` | **122 MB** | Git 对象与历史 |
| `.gitnexus/` | **68 MB** | 代码图谱数据库与缓存 |
| `tests/` | **约 133 MB** | Playwright report 约 12 MB，test-results 约 120 MB |
| `docs/` | 328 KB | 产品文档 |
| `openwiki/` | 72 KB | 自动代码文档 |
| `supabase/` | 104 KB | SQL 迁移与配置 |
| 有效工作文件合计 | **约 2.05 MiB（2.15 MB）** | 排除依赖、构建产物、缓存、报告目录 |

约 **764 MB** 来自四处 `node_modules`，占整个工作目录约 **70%**。这不是源码复杂度，而是当前“各子项目独立安装依赖”的直接结果。

---

## 6. 发现的问题与风险

### P0：测试入口不一致

1. `tests/e2e/all-journeys.spec.ts` 已覆盖 Journey 1–10，这是当前可信的正式入口。
2. `tests/e2e/package.json` 没有声明 `@playwright/test` 或 `playwright`，`package-lock.json` 也为空依赖；但 CI 在该目录执行 `npm ci` 和 Playwright 测试，干净环境存在失败风险。
3. 根 `scripts/run-e2e.mjs` 只尝试加载 Journey 1–4，而且引用的是当前不存在的：
   - `journey-1.spec.ts`
   - `journey-2.spec.ts`
   - `journey-3.spec.ts`
   - `journey-4.spec.ts`
4. `tests/e2e/run-all-journeys.mts` 只执行 Journey 1–6。

**结论：** 目前应把 `all-journeys.spec.ts` 视为唯一可信入口，其他 runner 已落后。

### P0：开发端口文档冲突

- `README.md`、OpenWiki、`scripts/run-e2e.mjs` 使用 `5179`；
- `apps/web/vite.config.ts` 没有设置 `server.port`，Vite 默认是 `5173`；
- `tests/e2e/playwright.config.ts` 也使用 `5173`。

**结论：** 本地运行如果没有额外 CLI 参数，实际应是 `5173`；当前文档中的 `5179` 需要与配置统一。

### P1：两份落地页已经分叉

`apps/landing` 与 `landing-page` 不是完全相同的镜像，差异包括：

- `App.tsx`、Navbar、全部 sections、样式文件不同；
- `apps/landing` 多出 `BackgroundOrbs.tsx`；
- `landing-page/vite.config.ts` 使用 `base: './'`；
- 两者依赖归类和 Tailwind/PostCSS 小版本不同；
- Git 最近提交时间分别为 2026-07-13 与 2026-07-17。

**结论：** 应先确认线上部署源，再合并；不能直接删除其中一个。

### P1：仓库不是正式 workspace

根 `package.json`：

- 没有 `name`、`private`、`scripts`、`workspaces`；
- 只声明 Playwright/DOMPurify 相关依赖；
- 与 `apps/web`、`tests/e2e` 的依赖存在交叉和重复。

因此当前更准确的描述是“一个仓库里放了多个独立 npm 项目”，而不是完整 monorepo workspace。

### P1：文档与当前代码漂移

- OpenWiki 架构仍大量引用 `apps/web/src/lib/db.ts`；实时代码正在拆为 `lib/db/`、`taskTreeSync.ts`、`storageHealth.ts`。
- `docs/INDEX.md` 将 Obsidian 相关事项标为 `ready-for-agent`；但代码中已经存在 parser、目录扫描、Workspace Store、Sidebar 面板、同步引擎和测试。
- `openwiki/`、`AGENTS.md`、`CLAUDE.md`、OpenWiki workflow 当前在工作树中未被 Git 跟踪，自动更新机制尚未真正进入版本历史。

### P2：工具目录与版本控制边界不统一

- `.workbuddy/` 已在根 `.gitignore`，但历史上已有 **12 个**相关文件被跟踪；
- `.gitnexus/` 只通过本机 `.git/info/exclude` 忽略，团队 clone 后不会自动继承；
- `.claude/` 当前未跟踪，也未被仓库 `.gitignore` 忽略；
- `.wrangler/`、`node_modules/`、`dist/`、Playwright 产物已正确忽略；
- `supabase/.temp` 虽由 `supabase/.gitignore` 声明忽略，但已有 **9 个历史文件被 Git 跟踪**；只有新增内容（如 `pgdelta/`）会正常被忽略。

### P2：非产品内容混入

`teach/llm-training` 是完整的个人学习资料分区，与 MindFlow 运行时、测试和产品文档无直接关系。它目前未被 Git 跟踪，后续需要明确：

- 继续作为仓库内个人学习区；或
- 移到独立知识仓库；或
- 至少增加边界说明，避免被 OpenWiki/代码分析误认为产品模块。

---

## 7. 建议的整理顺序

> 当前工作树有较多未提交的数据库拆分和 E2E 修改。建议先完成/提交当前重构，再做目录迁移，避免两批结构调整互相覆盖。

### 第一阶段：先修运行入口

1. 在 `tests/e2e/package.json` 明确声明 Playwright 依赖和 `test` 脚本；
2. 删除或更新旧 E2E runner，统一以 `all-journeys.spec.ts` 为入口；
3. 统一开发端口：要么在 `vite.config.ts` 固定 `5179`，要么全部文档与 runner 改为 `5173`；
4. 确保 CI 能启动前端 dev server 后再执行 E2E。当前 `ci.yml` 中没有明显的前端启动步骤。

### 第二阶段：收敛仓库结构

1. 明确 `apps/landing` 和 `landing-page` 哪个是线上部署源；
2. 合并两边仍需保留的设计与配置，最终只留一个 canonical landing app；
3. 根目录启用 npm workspaces，或删掉无入口价值的根依赖层；
4. 将统一的 `dev`、`build`、`lint`、`test` 脚本放到根目录。

### 第三阶段：同步文档和工具边界

1. 当前 DB 重构稳定后刷新 OpenWiki；
2. 更新 `docs/INDEX.md` 中 Obsidian 功能状态；
3. 将 `.gitnexus/`、`.claude/` 的策略写入仓库级 `.gitignore`；
4. 决定 `.workbuddy` 中哪些长期工程记录应该被跟踪，避免“目录整体忽略但部分文件已跟踪”的混合状态；
5. 明确 `teach/` 是否属于 MindFlow 仓库。

---

## 8. 推荐的目标结构

如果以“单仓库、多应用、统一工程入口”为目标，建议逐步收敛为：

```text
Mindflow-workbuddy/
├── apps/
│   ├── web/                  # 主产品，唯一业务应用
│   └── landing/              # 唯一落地页
├── tests/
│   └── e2e/                  # 唯一 E2E 测试包
├── supabase/                 # 后端 schema/migrations
├── docs/                     # 人工产品/架构文档
├── openwiki/                 # 自动生成文档
├── scripts/                  # 可用、受测试的工程脚本
├── deliverables/             # 阶段性交付物
├── shared/                   # 明确标注的非运行时协作资料
├── package.json              # workspaces + 全局 scripts
├── package-lock.json         # 单一 lockfile（如采用 npm workspace）
├── README.md
├── AGENTS.md
└── .github/workflows/
```

不建议立即搬动 `teach/`、`.workbuddy/` 或删除任一 landing 目录；应在确认归属和部署源后再处理。

---

## 9. 本报告的事实来源

主要核对文件：

- `openwiki/quickstart.md`
- `openwiki/architecture.md`
- `openwiki/operations.md`
- `README.md`
- `package.json`
- `.gitignore`
- `apps/web/package.json`
- `apps/web/vite.config.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/lib/db/index.ts`
- `apps/web/src/lib/db/schema.ts`
- `apps/web/src/lib/localFileSync.ts`
- `apps/web/src/stores/localWorkspaceStore.ts`
- `apps/landing/package.json`
- `apps/landing/vite.config.ts`
- `landing-page/package.json`
- `landing-page/vite.config.ts`
- `tests/e2e/package.json`
- `tests/e2e/package-lock.json`
- `tests/e2e/all-journeys.spec.ts`
- `tests/e2e/playwright.config.ts`
- `tests/e2e/run-all-journeys.mts`
- `scripts/run-e2e.mjs`
- `.github/workflows/ci.yml`
- `.github/workflows/openwiki-update.yml`
- `docs/INDEX.md`
- `supabase/.gitignore`

本次只生成报告，没有修改现有应用源码、测试配置或目录布局。
