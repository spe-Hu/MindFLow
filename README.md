# MindFlow — 思维导图 × 任务管理

> 融合思维导图与任务管理的个人项目推进工具，让"想清楚"和"做下去"无缝衔接。

## 功能特性

- **思维导图**：基于 simple-mind-map，支持自由脑暴、节点编辑、自动布局
- **节点转任务**：思维导图节点一键转为任务，自动同步到看板
- **项目看板**：Kanban 风格任务管理，支持拖拽、筛选、排序
- **全局任务管理**：跨项目统一管理所有任务，支持优先级、截止时间
- **云端同步**：Supabase 后端支持，本地 IndexedDB + 云端双向同步
- **离线可用**：PWA 支持，断网也能使用，恢复网络后自动同步
- **暗色模式**：完整适配深色主题
- **AI 辅助**：支持 OpenAI 兼容接口，AI 生成思维导图骨架
- **番茄钟**：内置番茄工作法计时器
- **日历视图**：月视图 + 周视图，任务截止可视化
- **搜索**：全局 Cmd+K 快速搜索项目和任务
- **导入导出**：JSON/CSV 导入导出，数据自由迁移
- **甘特图**：项目进度时间线视图

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + Vite 8 + TypeScript 6 |
| 状态管理 | Zustand 5 + Persist 中间件 |
| UI 组件 | shadcn/ui + Tailwind CSS 3 |
| 思维导图 | simple-mind-map 0.14 |
| 本地存储 | Dexie.js (IndexedDB) |
| 云端后端 | Supabase (Auth + PostgreSQL + Realtime) |
| 测试 | Playwright E2E (90+ 断言) |
| PWA | vite-plugin-pwa |

## 快速开始

### 前置条件

- Node.js ≥ 22
- npm ≥ 10
- Supabase 项目（可选，用于云端同步）

### 安装

```bash
git clone <repo-url>
cd Mindflow-workbuddy/apps/web
npm install
```

### 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

> 如果不配置 Supabase，应用仍可完全在本地模式运行。

### 开发

```bash
npm run dev          # 启动开发服务器 (默认 http://localhost:5179)
npm run lint         # 代码检查
npm run build        # 生产构建
npm run preview      # 预览生产构建
```

### 运行测试

```bash
# E2E 测试
cd tests/e2e
npm install
npx playwright install chromium
npx playwright test all-journeys.spec.ts --config playwright.config.ts
```

### 部署

生产构建输出在 `dist/` 目录，可直接部署到任何静态托管服务：

- Vercel / Netlify / Cloudflare Pages
- GitHub Pages
- Supabase Storage / AWS S3

## 项目结构

```
apps/
  web/                  # 主应用
    src/
      components/       # React 组件
        layout/         # AppLayout, Header, Sidebar, ViewHeader
        mindmap/        # MindMapCanvas, NodeDetailSidebar
        task/           # TaskBoard, TaskCard, TaskFilterBar
        project/        # NewProjectDialog, ProjectList
        search/         # GlobalSearch (Cmd+K)
        sync/           # SyncMigrationDialog
        pomodoro/       # PomodoroTimer
        ui/             # shadcn/ui 基础组件
      pages/            # 页面级组件
      stores/           # Zustand 状态管理
      lib/              # 工具库 (db, sync, supabase, ai, outline)
  landing/              # 落地页
  tests/e2e/            # Playwright E2E 测试
docs/                   # 产品文档 (PRD, SPEC, ARCHITECTURE, UIUX, design-prompts)
supabase/               # Supabase 后端配置与迁移
```

## 文档

- [PRD.md](docs/PRD.md) — 产品需求文档
- [SPEC.md](docs/SPEC.md) — 功能规格说明
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — 系统架构文档
- [UIUX.md](docs/UIUX.md) — UI/UX 设计规范
- [E2E_REPORT.md](docs/E2E_REPORT.md) — E2E 测试报告

## 许可证

MIT
