# MindFlow 迭代 32 — 日历周视图切换

## 本次交付

- **修改** `src/pages/CalendarPage.tsx` — 日历视图新增周视图模式（PRD S4 补全）
  - Header 中间新增月/周切换按钮组（类似 Google Calendar）
  - 月视图保持原 6×7 网格不变
  - 周视图：7列横排布局，每列显示当日日期 + 所有任务卡片（不限制3条）
  - 周导航通过现有左右箭头实现（自动按视图模式步进 1月/1周）
  - 周标签显示区间格式："M月D日 – D日"，跨年跨月自动适配
  - 右侧详情面板月/周视图共用，点击任意日期格子即可展开
  - 当天列高亮，任务卡片显示优先级+状态+归属项目
- **修改** `tests/e2e/journey-4.ts` — 新增 CAL-17~CAL-20 断言覆盖周视图切换、按钮高亮、任务显示、周导航
- **修改** `docs/PRD.md` — S4 日历视图标记更新为"月视图 + 周视图双模式切换已实现"

## 验证结果

- Build 零 errors ✅
- 无新增 lint warnings ✅
- 代码改动集中在单一文件 `CalendarPage.tsx`，风险可控

## 关键决策

- 不新增路由，通过 `viewMode` state 在同一页面内切换，保持简单
- 周视图任务卡片复用月视图详情面板的卡片样式，保持一致性
- 周区间格式化函数 `formatWeekRange` 自动处理跨年/跨月场景
- E2E 扩展而非新建 journey，复用 journey-4 的日历数据准备逻辑

## 后续建议

1. PDF 导出（S2 待后续）—— 可调研 `jsPDF` 或 `html2pdf.js` 实现
2. 文件附件（C5 另一半）—— 需要 IndexedDB blob 存储方案，涉及 schema 变更
3. 协作分享（C2）—— 需要 Supabase RLS + 分享 token 表，工作量较大
