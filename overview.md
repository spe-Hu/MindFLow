# MindFlow 迭代 31 — 甘特图时间线视图

## 本次交付

- **新增** `src/pages/GanttPage.tsx` — 全局甘特图时间线视图（Could Have C1）
  - 按项目分组展示任务条形，截止日期驱动条形位置，按优先级默认持续时长
  - 周导航（上一周/下一周/今天），默认展示 21 天（3 周）
  - 项目筛选 chip、项目折叠/展开
  - hover tooltip 显示任务详情，点击条形跳转项目导图
  - 无截止日期任务单独区域显示，今天日期竖线标记
  - 按项目分色，已完成任务半透明/灰色
- **修改** `src/App.tsx` — 新增 `/gantt` 路由
- **修改** `src/components/layout/Sidebar.tsx` — 展开态+折叠态新增「甘特图」导航入口
- **修改** `src/lib/db.ts` — `LocalTask` 接口新增可选 `start_date` / `duration_days` 字段（不改 schema，向后兼容）

## 验证结果

- Build 零 errors ✅
- Lint 3 warnings（均为已有 shadcn/ui warning）✅
- tsc 零 errors ✅
- E2E 测试结果：5/8 通过，3 个失败均为既有问题（simple-mind-map headless 编辑态不稳定 ×2，AI 生成测试期望不匹配 ×1），与本轮改动无关

## 关键决策

- 不改 IndexedDB schema：`start_date` / `duration_days` 仅作为 TypeScript 接口扩展，不加新索引
- 条形长度默认按优先级估算：urgent=1天 / high=2天 / medium=3天 / low=5天，后续可在节点详情面板编辑精确值
- 甘特图为全局视图（`/gantt`），与日历的全局视角一致

## 后续建议

1. 在节点详情面板（NodeDetailSidebar）添加 `duration_days` 编辑，让用户精确控制甘特图条形长度
2. 新增 E2E journey-8 覆盖甘特图：导航、筛选、折叠、任务跳转、周导航
