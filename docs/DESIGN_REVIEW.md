# MindFlow 设计评审报告

> 基于 Impeccable 高品质前端设计规范，对所有页面代码层面的完整 UX 设计评审。
> 评审日期：2026-07-06

---

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | 网络状态 Toast 反馈好；但保存/同步进度缺乏明确状态指示 |
| 2 | Match System / Real World | 3 | 看板拖拽、日历月视图、大纲编辑都符合心智模型 |
| 3 | User Control and Freedom | 3 | 撤销支持有限；归档/删除有确认对话框 |
| 4 | Consistency and Standards | 2 | 全局 vs 项目级看板布局高度一致但样式不一致（ProjectBoard vs GlobalBoard 卡片样式不同）；border 和圆角使用在不同页面略有偏差 |
| 5 | Error Prevention | 2 | 删除/归档有二次确认；大纲编辑器有未保存提示；但表单输入的即时校验不足 |
| 6 | Recognition Rather Than Recall | 2 | 项目颜色标签在各处复用很好；但新建项目流程在多处入口不一致 |
| 7 | Flexibility and Efficiency | 2 | Cmd+K 搜索、快捷键支持不错；但 tab 切换和筛选交互有冗余 click |
| 8 | Aesthetic and Minimalist Design | 2 | 功能全面但有堆砌感；卡片嵌套层次过多导致视觉噪音 |
| 9 | Error Recovery | 3 | 统一 Toast 体系；登录页和设置页同步失败有清晰反馈 |
| 10 | Help and Documentation | 1 | 大纲页有语法提示 sidebar，但其他页面几乎没有帮助入口 |
| **Total** | | **23/40** | **Moderate — 功能完整但体验打磨空间大** |

---

## Anti-Patterns Verdict

**Verdict: ⚠️ Mild AI Slop Detected**

这个项目**没有严重到让人一眼认出来是 AI 生成的**，但有几处泛 AI 审美的指纹：

- **Indigo (#4F46E5) 主色**：这是 shadcn/ui 和大量 2024-25 AI 生成项目最泛滥的主色，没有品牌独特性
- **卡片套卡片**：几乎每个面板都是 `bg-bg-surface border border-border-default rounded-xl`，统一得像是模板生成。Dashboard、看板、日历、设置全用同一张"面孔"
- **box-shadow-sm hover 即全部交互反馈**：所有可交互元素都只有 hover 阴影，没有更有创意的状态变化
- **Lucide 图标全套使用无风格化**：系统默认图标虽然清晰，但没有任何个性处理（颜色、描边、包裹容器的变化太统一）
- **字体完全缺席设计角色**：全程靠 Tailwind 默认系统字体栈，没有选择任何展示字体或增加字重对比

> 好的一面：没有渐变文字、没有毛玻璃滥用、没有发光特效，整体保持了克制和专业感。

---

## Overall Impression

**好的一面**：结构清晰、功能完备、交互逻辑扎实。开发者用一套克制的设计语言保证了多视图之间的一致性。

**最大机会**：MindFlow 需要建立**一套有记忆点的品牌视觉语言**。现在的界面是"没问题的工具型 UI"，但用户不会在心里把它和任何其他思维导图工具区分开。第二个大机会是**减少视觉噪音**——当前的 border + card + 嵌套层次叠加后，信息密度过高，长时间使用会产生疲劳。

---

## What's Working

1. **侧边栏信息架构清晰**：全局入口（工作台/全局任务/日历）+ 最近编辑 + 项目列表 + 系统（设置）四大区块分组明确，新建项目的 Plus 按钮放在项目区块顶部也符合直觉
2. **日历网格的信息密度控制出色**：每个单元格最多展示 3 个任务 + `+N 更多` 的截断策略恰到好处，右侧详情面板的展开/收起模式也合理
3. **大纲编辑器的语法提示侧边栏**：这是全局唯一自带"帮助"的页面，对新用户的接收成本极低，`font-mono` 的编辑区 + 语义化的语法标注让大纲模式有了专业感

---

## Priority Issues

### [P0] 页面头部 "千层饼" 层次过厚

- **What**：打开一个项目时，用户视线从上到下依次遇到：`AppLayout Header (h-12)` → `ViewHeader (h-10)` → `Page Toolbar/FilterBar (h-12或h-10)` → 才是内容区。最多 4 层 headers 堆叠，占用了 30%+ 的上部空间
- **Why it matters**：用户的注意力被分散到多个带状区域，不仅压缩了内容区，还增加了认知成本——每层 header 都包含不同级别的信息
- **Fix**：方案 A：将 ViewHeader 中的项目标题合并到 App Header 的面包屑区域；方案 B：看板/列表/大纲的专属 toolbar 改用浮动或融入首行内容的方式，而非固定 bar
- **Suggested command**: `/arrange`

### [P0] 卡片设计的同质化和视觉噪音

- **What**：Dashboard 统计卡、项目进度卡、看板任务卡、日历详情卡、Settings 设置卡全部使用同一套 `bg-bg-surface border border-border-default rounded-xl` 样式。页面变成"卡片墙"
- **Why it matters**：没有通过材质差异来区分信息层级——统计指标应该更突出，设置项可以更朴素，任务卡片需要更强的可拖拽暗示。统一材质 = 没有层级
- **Fix**：统计指标卡片取消边框改用浅色背景突出；看板卡片增加左侧色条或进度条来强化项目归属；设置项取消卡片化改用列表行样式；减少全局 border 使用，改用背景层差（bg-elevated vs bg-surface）来划分区域
- **Suggested command**: `/arrange` + `/colorize`

### [P1] 项目标题的双击编辑完全不可发现

- **What**：在 ViewHeader 中，项目名称显示为纯文本，但支持 `contentEditable` 的双击编辑。没有任何编辑图标、下划线、hover 提示
- **Why it matters**：这是项目名修改的唯一入口（除了侧边栏重命名），绝大多数用户永远不会发现这个功能
- **Fix**：在标题右侧添加一个常驻的 `Pencil` 图标（hover 时变明显），或者点击后变为 input 框；移动端需要独立处理（双击在触屏上不自然）
- **Suggested command**: `/clarify`

### [P1] 暗色模式缺乏真正的暗色调色板

- **What**：暗色模式完全依赖 `data-theme="dark"` 下 CSS 变量的反转。surface 色还是偏灰而非偏蓝灰，文字仍是高对比度纯白，夜间使用时刺眼
- **Why it matters**：暗色模式不是"反色"，而是需要降低整体对比度、增加色相深度。当前暗色的视觉体验落后于大多数竞品
- **Fix**：为暗色模式单独调整变量——`text-primary` 从 `#FFFFFF` 降为 `#E2E8F0`，`bg-surface` 从深灰改为深蓝灰（#0F172A 方向），`border-default` 降低不透明度。增加暗色专属的 subtle 色调
- **Suggested command**: `/colorize`

### [P1] 空状态缺乏品牌情感和引导力

- **What**：App 内所有空状态统一为文字 + icon，如"暂无任务，在思维导图中将节点转为任务即可追踪"。没有插画、没有 CTA 按钮、没有品牌温度
- **Why it matters**：空状态是新用户和低频用户的"第一印象"，也是功能发现的关键转化点。纯文字空状态浪费了引导用户行动的机会
- **Fix**：为高频空状态（全局任务/看板/任务列表）增加品牌化空状态插画或几何图形 + 明确的主 CTA 按钮（如"前往思维导图创建第一个任务"）；移动端空状态放大文字和按钮尺寸
- **Suggested command**: `/onboard` + `/delight`

### [P2] 看板列的"添加任务"按钮无效

- **What**：ProjectBoardPage 和 GlobalBoardPage 的每列底部都有一个 `<Plus /> 添加任务` 按钮，但 onClick 未绑定任何逻辑
- **Why it matters**：用户点击后没有任何反馈，会以为是 Bug
- **Fix**：要么实现快速添加功能（弹窗或 inline input），要么隐藏该按钮
- **Suggested command**: `/harden`

### [P2] ProjectListPage "标签"列永远显示"—"

- **What**：表格头部有"标签"列，但所有行都显示 "—"，因为标签功能尚未实现却仍然占用了列宽
- **Why it matters**：表格本已紧凑，无意义列浪费横向空间。在复杂项目名时会导致关键列被截断
- **Fix**：移除该列直到标签功能上线，或将其宽度设为 auto 不占固定空间
- **Suggested command**: `/distill`

---

## Persona Red Flags

### Alex（高频率项目管理用户）

- **ViewHeader header 的 "千层饼" 浪费屏幕空间**：当 Alex 需要同时看到尽可能多的任务时，4 层 header 占用了 `100vh` 中近 170px 宝贵的垂直空间，尤其在小屏笔记本上更痛
- **缺少键盘导航**：除了 Cmd+Shift+N 新建项目外，没有 Tab navigation 在任务列表/看板间移动，也没有 `/` 快速命令面板
- **MoreHorizontal 菜单 hover 触发**：触屏设备上 Alex 无法唤出项目的快捷操作菜单；同时点击 "..." 按钮后没有 Esc 关闭快捷键

### Jordan（首次使用者，从 Notion/XMind 迁移来）

- **双击编辑项目名的隐藏交互**：Jordan 花了 2 分钟也没找到怎么改项目名——侧边栏的 "..." 菜单藏得太深，ViewHeader 的双击编辑完全没有 affordance
- **Dashboard "工作台" 信息太多**：首屏同时看到统计卡 + 项目进度 + 本周截止 + 高优任务，Jordan 不知道先看哪里，没有清晰的 onboarding 引导
- **"全局任务" vs "任务列表" vs "看板" 命名混淆**：三个视图概念重叠但没有明确的定位说明。Jordan 不确定什么时候该用哪个视图
- **大纲页的新手保护不足**：虽然右侧有语法提示，但大段的 placeholder 文本在第一次进入时令人困惑，且没有一键"试试看"的示例填充

---

## Minor Observations

1. **Calendar 的 "今天"按钮样式不统一**：旁边的翻月按钮是 `hover:bg-bg-elevated`，而"今天"按钮多了一层 `border border-border-default`，视觉上与其他控件不在同一设计语言中
2. **TaskFilterBar 的下拉层级问题**：筛选下拉使用 `z-50` 固定遮罩+绝对定位，如果在小的容器内使用可能溢出
3. **全局搜索无空状态**：GlobalSearch 组件如果搜索结果为空，没有"找不到相关内容"的空状态设计
4. **Sidebar 收起态的项目指示器**：折叠后仅用彩色圆点区分项目，当项目超过 8 个时难以快速识别
5. **Dashboard 的 stat card 颜色缺乏语义统一**："待办"使用 `bg-bg-elevated text-text-secondary` 而非蓝色系，和其他 stat 的视觉层级不一致，容易被误认为是禁用的卡片
6. **GlobalTasksPage 的分组折叠动画缺失**：切换折叠状态是瞬间跳变，没有过渡动画，感觉生硬
7. **非常多的 `text-2xs`（约 10px）字号**：在全局任务列表、日历、筛选栏中大量使用。虽然看起来精致，但在低分辨率屏幕和老年用户群体中可读性降低
8. **ProjectBoardPage 只有三列**：缺少 "已取消" 列（虽然 SPEC 里有 cancelled 状态）
9. **Outline 编辑器的 textarea 是 monospace**：用于大纲写作本应是正文体验，但 monospace 降低了长文本的阅读舒适度。编辑模式的字体应该分成"编辑态 mono"和"预览态 sans"

---

## 推荐行动优先级

| 优先级 | 命令 | 调整范围 |
|--------|------|---------|
| 1 | `/arrange` | 重构页面 header 堆叠、减少卡片同质化、优化 Dashboard 布局 |
| 2 | `/colorize` | 暗色模式调色板优化、看板卡片项目色条、主色品牌差异化 |
| 3 | `/clarify` | 项目标题编辑 affordance、空状态引导优化、视图命名清晰度 |
| 4 | `/onboard` | 空状态品牌化设计 + 新用户引导（首屏指引） |
| 5 | `/delight` | 微动效（折叠动画、hover 反馈、状态变化过渡） |
| 6 | `/distill` | 移除未完成标签列、减少 text-2xs 使用、精简看板底部无效按钮 |
| 7 | `/polish` | 运行最终的细节调优（圆角节奏、阴影层次、间距微调） |

---

> **总结一句话**：MindFlow 是一套"技术完成度很高、设计完成度中等"的界面。最迫切需要的是**建立品牌视觉独特性**（替代泛滥的 Indigo）和**减少视觉噪音**（去边框化、差异化的材质层次）。当前评分 23/40，修复 P0/P1 问题后有望提升到 30+。
