# MindFlow 第 36 次迭代 — PWA 离线支持 + DOMPurify XSS 防护

## 本次迭代内容

### 1. PWA 离线支持
- **vite-plugin-pwa** 集成：自动生成 `manifest.webmanifest` + Service Worker（Workbox）
- 预缓存 29 个静态资源（JS/CSS/HTML/图标），离线可用
- Google Fonts runtime caching，字体离线可用
- `index.html` 补全 PWA meta：`theme-color`、`manifest`、`apple-touch-icon`
- Header 新增「安装到桌面」按钮（监听 `beforeinstallprompt` 事件）

### 2. DOMPurify XSS 防护
- 新建 `src/lib/sanitize.ts`：三层清洗工具
  - `sanitizeText` — 剥离全部 HTML 标签（纯文本字段）
  - `sanitizeUrl` — 只允许 `http/https/mailto` 协议
  - `safeLinkUrl` — 轻量协议拦截（`javascript:`/`data:`/`blob:`/`file:` 等）
- `NodeDetailSidebar` Markdown 链接解析已接入 `safeLinkUrl`

### 3. 部署与验证
- Build 零 errors ✅
- Cloudflare Pages 部署成功 ✅
- 在线地址：https://7027c992.mindflow-app.pages.dev

## 变更文件
- `src/frontend/vite.config.ts`
- `src/frontend/index.html`
- `src/frontend/src/hooks/usePWA.ts`（新增）
- `src/frontend/src/lib/sanitize.ts`（新增）
- `src/frontend/src/components/layout/Header.tsx`
- `src/frontend/src/components/mindmap/NodeDetailSidebar.tsx`
- `docs/PRD.md`
