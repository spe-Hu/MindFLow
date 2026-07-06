# MindFlow E2E 测试套件

基于 PRD 验收标准 (AC-1 ~ AC-13),使用 Playwright 风格 API 描述用户旅程。
执行环境: Playwright MCP 工具 (mcp__playwright__browser_*)。

## 覆盖范围

| 文件 | 覆盖 | 关键 AC |
|------|------|---------|
| `journey-1.spec.ts` | 单项目完整链路: 创建项目 → 导图 → 节点任务化 → 看板拖拽 → 双向同步 → 持久化 | AC-1, AC-2, AC-3, AC-4, AC-5, AC-6 |
| `journey-2.spec.ts` | 多项目: 创建 → 切换 → 隔离 → 全局聚合 → 筛选 → 定位 → 双向同步 | AC-6, AC-7, AC-8, AC-9, AC-10, AC-12, AC-13 |

## 执行方式

测试脚本中的 helper (enterLocalMode / createProject / clickNodeByText) 可被任何 Playwright
driver 直接 import。手工调用样例参见 `tests/e2e/REPORT.md` 附录。

底层交互:
- 离线登录: 点击 `button:has-text("离线使用，数据仅存本地")`
- 新建项目: 侧边栏 `aria-label="新建项目"` → 输入名称 → 「创建」按钮
- 添加子节点: 选中节点 → 按 `Tab` → 输入文本 → `Enter` 确认
- 标记任务: 选中节点 → 浮动工具栏 → 点击「转为任务」
- 看板拖拽: Playwright `mouse.down/move/up` 在 div[draggable] 与列 drop 区之间
- 全局跳转: 点击 `text=任务名` 自动跳到 `/project/{id}?nodeUid={uid}`