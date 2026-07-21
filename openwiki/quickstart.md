# MindFlow — OpenWiki

> 个人项目推进工具：把"想清楚"（思维导图）和"做下去"（任务管理）做成同一个实体。

MindFlow 是一个单页应用，让思维导图节点和任务系统中的任务是同一个对象。在导图里改结构，任务视图自动变；在任务视图改状态，导图节点自动更新；全局看板跨项目聚合所有任务。

## 仓库结构

```
Mindflow-workbuddy/
├── apps/
│   ├── web/         # 主产品（React 19 + Vite + Supabase）
│   └── landing/     # 落地页（React + framer-motion）
├── tests/
│   └── e2e/         # Playwright E2E（10 个 user journey）
├── supabase/
│   ├── config.toml  # Supabase 项目配置
│   └── migrations/  # 6 个 SQL 迁移（schema、RLS、shared_links、attachments 等）
├── docs/            # 产品文档（PRD / SPEC / ARCHITECTURE / UIUX / E2E_REPORT）
├── scripts/         # 一次性自动化脚本
├── shared/          # 共享上下文资料
├── deliverables/    # 工程交付物
├── .workbuddy/      # 自动化记忆 + 迭代日志
├── .github/workflows/  # CI + OpenWiki 定时刷新
└── openwiki/        # ← 你在这里
```

## 文档导航

| 想了解... | 阅读 |
|-----------|------|
| 整体架构、运行时数据流、模块清单 | [architecture.md](architecture.md) |
| IndexedDB + Supabase 双层数据模型、字段约束、节点↔任务映射 | [data-model.md](data-model.md) |
| `apps/web` 应用外壳、路由、布局、PWA、主题 | [apps-web.md](apps-web.md) |
| 思维导图 canvas、节点↔任务双向同步、节点详情、大纲编辑 | [features-mindmap.md](features-mindmap.md) |
| 项目/任务/看板/日历/甘特/全局/番茄钟/搜索/分享 | [features-productivity.md](features-productivity.md) |
| Supabase 同步、共享链接、附件、AI 模板生成、安全消毒 | [integrations.md](integrations.md) |
| E2E 测试、CI/CD、部署、开发工具 | [operations.md](operations.md) |

## 60 秒跑起来

```bash
# 1. 安装主应用依赖
cd apps/web
npm install
cp .env.example .env.local       # 可选：填 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 启用云端同步
npm run dev                      # http://localhost:5179
```

不填环境变量也可以 — 应用会进入「本地模式」，所有数据写入 IndexedDB，离线可用。仅在登录或云端迁移时会用到 Supabase。

构建 + 静态产物：

```bash
npm run build     # 输出到 apps/web/dist/
npm run lint      # oxlint
```

## 运行 E2E 测试

```bash
cd tests/e2e
npm install
npx playwright install chromium
npx playwright test all-journeys.spec.ts
```

详细测试覆盖清单见 [operations.md §测试体系](operations.md#测试体系)。

## 关键设计理念

- **同实体原则**：思维导图节点 `_isTask=true` 时，自动在 `tasks` 表产生一条对应记录（在 `lib/db.ts#syncTasksFromTree` 中触发）；反过来从任务视图改状态时，通过 `updateTaskWithMindmapSync` 写回导图节点的 `_status / _priority` 字段并染上颜色。
- **本地优先**：所有写操作先入 Dexie IndexedDB，仅在登录后异步 push 到 Supabase。30 秒最小同步间隔，避免风暴。
- **三种入口**：登录用户 / 匿名游客 / 纯本地模式（无需账号）。`useAuthStore.enableLocalMode()` 直接放行主路由。
- **路由级懒加载**：`App.tsx` 使用 `React.lazy` 拆包，`ProjectMindMapPage` / `CalendarPage` / `GanttPage` 等大页面单独 chunk。
- **PWA 离线**：`vite-plugin-pwa` 注册 Workbox，precache 所有静态资源 + Google Fonts CacheFirst。

## 已落地的能力

完整 PRD 进度（v1.1 / 100% 完成）见 `docs/PRD.md`，按优先级分：

- 15/15 Must-have（M1–M15）：节点 CRUD、节点转任务、看板双向同步、本地持久化、多项目管理等。
- 6/6 Should-have（S1–S6）：大纲同步、导入导出、云同步、日历、Cmd+K 搜索、最近项目。
- 16/16 Could-have（C1–C6 + 杂项）：甘特、只读分享、AI 生成、番茄钟、附件归档、Dashboard、截止提醒、快捷键、PWA、XSS 防护、模板系统等。

## 不在本仓库范围内

- 已部署的 Cloudflare Pages 实例配置：`overview.md` 提到 `mindflow-app.pages.dev` 但配置不在仓库内。
- 私人 Supabase 项目密钥：环境变量由部署方管理，仅保留占位符。
- `.workbuddy/memory/`、`shared/pool.md`、`deliverables/` 是协作/记忆文件，与运行时无关。
