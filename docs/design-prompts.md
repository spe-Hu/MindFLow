# MindFlow Design Prompts（开发执行版）

> 版本：v1.1
> 基于：SPEC.md §7 页面清单 + UIUX.md 冻结设计
> 用途：前端开发直接按此页面 Prompt 执行组件实现

---

## 全局约束（每个页面必须遵守）

| 约束项 | 规则 |
|--------|------|
| **图标** | 唯一来源 **Lucide React**，尺寸仅允许 16px（行内/按钮内）、20px（导航）、24px（独立图标）。**严禁任何 Emoji 作为功能图标**。 |
| **颜色** | 全部通过 Design Token 引用（`--bg-surface`、`--color-primary` 等）。**严禁硬编码色值**（唯一例外：`#fff` / `#000`）。 |
| **圆角** | 仅允许 4 级：`--radius-sm: 4px` / `--radius-md: 8px` / `--radius-lg: 12px` / `--radius-xl: 16px`。模态框最大 16px，无 24px+ 大圆角。 |
| **阴影** | 仅允许 `shadow-sm` / `shadow-md` / `shadow-lg`，无弥散大阴影、无彩色阴影。深色模式用边框微光替代阴影抬升。 |
| **紫色渐变** | **绝对禁止**任何 `#7C3AED` → `#A855F7` / `#EC4899` 方向的渐变作为主视觉背景。项目色池中的 `--project-violet` 仅用于节点/卡片语义标识，不作 UI 渐变。 |
| **字体** | 全局 `--font-body: Inter, "Noto Sans SC", "PingFang SC", sans-serif`；等宽 `--font-mono: "JetBrains Mono", monospace`。字号仅使用 UIUX §3.2 定义的层级。 |
| **间距** | 4px 基准网格：仅允许 `4 8 12 16 20 24 32 40 48 64 80`，禁止非标值。 |
| **键盘可达** | 所有交互元素必须支持 `Tab` 导航，显示 `:focus-visible` ring（`--color-primary-ring`）。 |
| **Reduced Motion** | 所有 `transition` / `animation` 必须包在 `@media (prefers-reduced-motion: no-preference)` 内；`reduce` 时即时切换，无过渡。最大动效时长 400ms。 |
| **动效缓动** | 仅允许 `cubic-bezier(0.4, 0, 0.2, 1)`（标准缓出）与 `cubic-bezier(0.34, 1.56, 0.64, 1)`（仅小控件 pop）。禁止使用弹跳过缓动。 |

---

## Design Prompt 1：首页空状态 `/`

### 1. 页面名称 + 路由
- **页面**：首页 / 首次进入空状态
- **路由**：`/`（未登录可访问；已登录但无项目时同样展示）
- **主题**：浅色模式

### 2. 组件清单

**shadcn/ui 组件**
- `Button`（Primary 样式，"+ 创建项目" CTA）
- `Dialog`（新建项目弹窗载体）

**自定义组件**
- `EmptyStateIllustration` —— 极简线条插画（SVG），尺寸 160×120px，3 步流程：项目拆解 → 任务执行 → 完成
- `NewProjectDialog` —— 新建项目弹窗（见 UIUX §5.7）
- `AppShell` —— 全局外壳（含 Header 48px + 侧边栏 240px，空状态下侧边栏可隐藏或只显示 Logo 区）

### 3. 布局说明

```
+-------------------------------------------------------------+
|  [Logo]  MindFlow        [全局搜索]      [通知] [头像]       |  ← AppHeader (48px)
+-------------------------------------------------------------+
|                                                             |
|                    [EmptyStateIllustration]                  |
|                    (160×120, 轻微浮动动画)                    |
|                                                             |
|              创建你的第一个项目                               |
|        用思维导图拆解思路，用任务追踪执行                      |
|                                                             |
|                   <Button>+ 创建项目</Button>                |
|                                                             |
+-------------------------------------------------------------+
```

**DOM 结构与 CSS**
- 外层容器：`flex flex-col items-center justify-center min-h-[calc(100vh-48px)] bg-[var(--bg-primary)]`
- 插画容器：`mb-[var(--space-8)]`，内部 SVG 加 `translateY` 浮动动画（`±4px`，`3s` 循环，`easing-smooth`）
- 标题：`<h1 class="text-2xl font-semibold text-[var(--text-primary)] mb-[var(--space-3)]">创建你的第一个项目</h1>`
- 副标题：`<p class="text-sm text-[var(--text-secondary)] mb-[var(--space-6)]">用思维导图拆解思路，用任务追踪执行</p>`
- CTA 按钮：`h-[40px] px-[var(--space-5)] radius-md`，Primary 样式（`bg-[var(--color-primary)]` / `hover:bg-[var(--color-primary-hover)]`）
- 图标：Lucide `Plus`，16px，与文字间距 `var(--space-2)`

### 4. 状态说明

**Zustand Store（read）**
- `user: User | null` —— 决定 Header 显示"登录"还是头像
- `projects: Project[]` —— 若长度 > 0，触发重定向到最近打开项目
- `isNewProjectDialogOpen: boolean` —— 控制弹窗显隐

**组件 Props**
- `EmptyStateIllustration` 无 props
- `NewProjectDialog: { open: boolean; onClose: () => void; onCreated: (project: Project) => void }`

### 5. 交互说明

| 交互 | 行为 |
|------|------|
| **点击 CTA** | 打开 `NewProjectDialog`，弹窗从中心 `scale(0.95) → scale(1)`，`opacity 0 → 1`，持续 200ms |
| **快捷键 `Cmd/Ctrl + Shift + N`** | 打开新建项目弹窗 |
| **弹窗输入框** | 自动 focus，`placeholder="例如：Q3 产品改版"`，`maxLength=50`，空值时"创建"按钮 `disabled` |
| **颜色选择** | 6 色圆形选择器（32px，`radius-full`），选中态外圈 2px `--text-primary`，hover `scale(1.1)`，过渡 150ms |
| **回车确认** | 输入框 focus 时按 Enter 触发创建（若条件满足） |
| **Esc 取消** | 关闭弹窗，无确认提示 |
| **创建成功** | 弹窗 fade out 150ms → 路由跳转至 `/project/:newId` |

### 6. 视觉检查点

- [ ] 无 Emoji 图标，仅 Lucide
- [ ] 无紫色渐变背景
- [ ] 插画浮动动画在 `prefers-reduced-motion: reduce` 时静止
- [ ] 按钮包含 Default / Hover / Focus / Active / Disabled 态
- [ ] CTA 按钮 focus-visible 显示 `--color-primary-ring` 2px ring
- [ ] 无硬编码颜色值
- [ ] 空状态下无 Lorem ipsum 占位文本

---

## Design Prompt 2：项目思维导图 `/project/:id`

### 1. 页面名称 + 路由
- **页面**：项目思维导图
- **路由**：`/project/:id`
- **主题**：浅色模式

### 2. 组件清单

**shadcn/ui 组件**
- `Button`（Ghost / Icon 样式）
- `Tooltip`（工具栏按钮提示）
- `DropdownMenu`（视图切换下拉、连线样式选择、节点右键菜单）
- `Input`（节点 inline 编辑）
- `Checkbox`（任务节点复选框）

**第三方库**
- `simple-mind-map`（思维导图引擎）

**自定义组件**
- `MindMapCanvas` —— 画布容器（无限画布、点阵网格背景、拖拽平移、滚轮缩放）
- `ViewHeader` —— 40px 视图头部（导图标题 inline 编辑 + 面包屑 + 视图 Tab + 缩放控制）
- `FloatingToolbar` —— 悬浮工具栏，画布右下角，距边缘 24px
- `TaskNode` —— 任务节点渲染（复选框 + 优先级竖条 + 元数据行）
- `NodeContextMenu` —— 节点右键菜单（"转为任务"/"取消任务"/"删除"/"重命名"）
- `PriorityPicker` —— 优先级选择浮层（转为任务后自动弹出）

### 3. 布局说明

```
+-------------------------------------------------------------+
| [导图标题 ▼]  [思维导图 | 项目列表 | 项目看板]  [- 100% +] [全屏] |  ← ViewHeader (40px)
+-------------------------------------------------------------+
|                                                             |
|               无限画布思维导图区域                             |
|          （点阵网格背景，中键拖拽，滚轮缩放）                    |
|                                                             |
|                    根节点                                    |
|      ├─ 分支 A (Branch-1 色)                                |
|      │   ├─ 子节点                                          |
|      │   └─ [☐] 任务节点    ← 复选框 + 优先级圆点              |
|      └─ 分支 B (Branch-2 色)                                |
|                                                             |
|  [悬浮工具栏] ← 画布右下角                                    |
+-------------------------------------------------------------+
```

**DOM 结构与 CSS**
- 页面外层：`flex flex-col h-screen bg-[var(--bg-primary)]`
- ViewHeader：`h-[40px] px-[var(--space-4)] flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-surface)]`
- 标题区：`text-md font-medium text-[var(--text-primary)]`，双击触发 inline `Input`（`h-[32px]`, `radius-sm`, `focus:ring-2 ring-[var(--color-primary-ring)]`）
- 视图 Tab：胶囊形状，`radius-full`，选中态 `bg-[var(--color-primary)] text-[var(--text-on-primary)]`，未选中 `text-[var(--text-secondary)] hover:text-[var(--text-primary)]`
- 画布区：`flex-1 relative overflow-hidden`
  - 点阵网格：`background-image: radial-gradient(circle, rgba(148,163,184,0.08) 1px, transparent 1px)`，`background-size: 24px 24px`
- FloatingToolbar：`absolute bottom-[var(--space-6)] right-[var(--space-6)] w-auto bg-[var(--bg-surface)] border border-[var(--border-default)] radius-lg shadow-md p-[var(--space-2)] flex flex-col gap-[var(--space-1)]`
  - 按钮组：32×32px IconButton，`radius-md`，hover `bg-[var(--bg-elevated)]`
  - 分隔线：`w-full h-px bg-[var(--border-default)] my-[var(--space-1)]`

**simple-mind-map 集成要点**
- 容器 `#mindmap-container`，尺寸占满画布区
- 节点样式通过库的 `style` API 覆盖，颜色全部映射到 Design Token
- 自定义任务节点通过 `node_tag` 或自定义渲染函数实现

### 4. 状态说明

**Zustand Store（read/write）**
- `currentProject: Project | null` —— 当前项目信息（含项目色）
- `mindmapData: MindMapData` —— 导图树数据（节点层级、文本、展开状态）
- `selectedNodeIds: string[]` —— 当前选中节点 UID 集合
- `zoomLevel: number` —— 缩放比例（25%~300%，默认 100）
- `viewState: 'mindmap' | 'list' | 'board'` —— 当前项目级视图
- `taskNodes: Record<nodeUid, TaskMeta>` —— 节点到任务元数据的映射

**组件 Props**
- `MindMapCanvas: { projectId: string; data: MindMapData; onNodeSelect: (ids: string[]) => void; onNodeEdit: (id: string, text: string) => void; onConvertToTask: (id: string) => void }`
- `ViewHeader: { title: string; view: 'mindmap' | 'list' | 'board'; zoom: number; onViewChange: (v) => void; onZoomChange: (z) => void }`

### 5. 交互说明

| 交互 | 行为 |
|------|------|
| **画布平移** | 鼠标中键按住拖拽 / 空白处拖拽，画布跟随移动（无动画，直接响应） |
| **画布缩放** | `Ctrl/Cmd + 滚轮`，或点击 ViewHeader `+`/`-` 按钮，步进 10% |
| **创建节点** | `Enter` 插入同级节点，`Tab` 插入子节点，光标进入 inline 编辑态 |
| **编辑节点** | 单击节点进入编辑，`Enter` 确认，`Esc` 取消，失去焦点自动保存 |
| **节点转任务** | 选中节点 → `T` 键 / 右键菜单"转为任务" → 节点从 transparent 背景过渡到 `--bg-surface` 卡片（250ms），复选框从左侧滑入（delay 100ms, 200ms） |
| **优先级选择** | 转任务后自动弹出 `PriorityPicker` 浮层，hover 预览，点击确认 |
| **复选框操作** | 点击任务节点复选框即时 toggle 完成态，无确认。完成态：复选框填充 `--color-success` + 文字删除线 + 色调 muted |
| **节点删除** | `Delete/Backspace` 删除选中节点，根节点不可删除 |
| **展开/折叠** | `Space` 键 toggle 节点子树展开状态 |
| **拖拽节点** | `opacity: 0.5`，原位置 ghost 占位框。悬停目标节点高亮 `--color-primary-subtle`，悬停节点间显示 `2px dashed --color-primary` 插入线。释放后飞入新位置 200ms |
| **右键菜单** | 右键节点弹出 `DropdownMenu`，"转为任务"置顶，危险操作"删除"文字 `--color-danger` |
| **FloatingToolbar** | 插入子节点 / 插入同级 / 删除 / 展开全部 / 折叠全部 / 居中画布 / 连线样式 / 节点形状 / 主题 |
| **视图切换** | 点击 ViewHeader Tab 切换项目级视图（思维导图 ↔ 列表/看板）：淡入淡出 200ms |

### 6. 视觉检查点

- [ ] 思维导图节点颜色通过 Token 引用：根节点边框 `--color-primary` 2px，二级节点 `--border-default` 1px，三级+ transparent
- [ ] 任务节点左侧 3px 优先级竖条（高 `#EF4444`/中 `#F59E0B`/低 `#3B82F6`），通过 Token `--priority-*`
- [ ] 复选框：未完成 = 空心 1.5px `--text-muted`；完成 = 填充 `--color-success` + 白色对勾
- [ ] 选中节点：`shadow-md` + `--color-primary-ring` 外发光，连线高亮 `--color-primary` 2px
- [ ] 分支着色时，仅一级分支及其后代继承项目色池 6 色，不启用时连线为 `--text-muted`
- [ ] FloatingToolbar 按钮全部使用 Lucide 16px 图标
- [ ] `focus-visible` 在节点编辑 Input、工具栏按钮、视图 Tab 上均显示 `--color-primary-ring`
- [ ] 所有动画支持 `prefers-reduced-motion: reduce`

---

## Design Prompt 3：项目列表 `/project/:id/list`

### 1. 页面名称 + 路由
- **页面**：项目任务列表视图
- **路由**：`/project/:id/list`
- **主题**：浅色模式

### 2. 组件清单

**shadcn/ui 组件**
- `Checkbox`（任务完成态）
- `Badge`（状态标签、优先级标签）
- `Button`（Ghost / Icon）
- `DropdownMenu`（行级更多操作、排序选择）
- `Select`（筛选器下拉）
- `Avatar` + `AvatarFallback`（负责人头像）

**自定义组件**
- `ViewHeader` —— 复用思维导图页的 ViewHeader（视图 Tab 显示"思维导图 / 项目列表 / 项目看板"）
- `TaskListRow` —— 单行任务（48px 行高，hover 显示操作按钮）
- `FilterBar` —— 筛选栏（48px，状态/优先级/截止日期筛选 + 排序 + 视图切换）
- `TaskEmptyState` —— 看板空列空状态（Lucide `BrainCircuit` 24px + 引导文案）

### 3. 布局说明

```
+-------------------------------------------------------------+
| [导图标题 ▼]  [思维导图 | 项目列表 ✓ | 项目看板]  [...]       |  ← ViewHeader (40px)
+-------------------------------------------------------------+
| 状态 ▼ | 优先级 ▼ | 截止日期 ▼           排序 ▼  [列表✓][看板] |  ← FilterBar (48px)
+-------------------------------------------------------------+
| ☐ 任务名称              优先级  标签    截止日期    负责人  |
+-------------------------------------------------------------+
| ☑ 完成态任务              低     前端    昨天        我    |  ← 48px 行高，hover 操作
| ☐ 进行中任务              高     API     今天        我    |
| ☐ 待开始任务              中     设计    明天        --    |
+-------------------------------------------------------------+
```

**DOM 结构与 CSS**
- 页面外层：同思维导图页（`flex flex-col h-screen`）
- ViewHeader：与思维导图页完全复用，当前 Tab "项目列表" 高亮
- FilterBar：`h-[48px] px-[var(--space-4)] flex items-center gap-[var(--space-3)] bg-[var(--bg-surface)] border-b border-[var(--border-default)]`
  - 筛选 Chip：`radius-full`，`text-xs`，`h-[28px] px-[var(--space-3)]`，默认 `bg-[var(--bg-elevated)] text-[var(--text-secondary)]`，hover `border border-[var(--border-hover)]`
  - 激活 Chip：`bg-[var(--color-primary-subtle)] text-[var(--color-primary)]`
  - 排序下拉：Select 组件，`text-xs`
  - 视图切换胶囊 Tab：同 ViewHeader Tab 样式
- 列表容器：`flex-1 overflow-y-auto bg-[var(--bg-primary)]`
- 列表表头：`h-[36px] px-[var(--space-4)] grid grid-cols-[40px_1fr_80px_120px_100px_40px] items-center text-xs text-[var(--text-muted)] border-b border-[var(--border-default)] bg-[var(--bg-surface)]`
- 任务行：`h-[48px] px-[var(--space-4)] grid grid-cols-[40px_1fr_80px_120px_100px_40px] items-center text-sm text-[var(--text-secondary)] border-b border-[var(--border-default)]`
  - hover：`bg-[var(--bg-elevated)]`，操作按钮从 `opacity-0` 到 `opacity-1`，过渡 150ms
  - 复选框列：40px，居中
  - 任务名称列：`text-sm text-[var(--text-primary)]`，完成态添加 `line-through text-[var(--text-muted)]`
  - 优先级列：80px，显示优先级圆点 `--priority-*` + `text-2xs` 文字
  - 标签列：120px，Badge 胶囊，`radius-full`，`text-2xs`
  - 截止日期列：100px，`text-2xs`（JetBrains Mono），过期显示 `--color-danger`
  - 负责人列：40px，Avatar 24px，`radius-full`
  - 操作列：40px，hover 显示 Lucide `MoreHorizontal` 16px，点击展开 DropdownMenu

### 4. 状态说明

**Zustand Store（read/write）**
- `currentProject: Project` —— 当前项目
- `tasks: Task[]` —— 当前项目全部任务（带节点关联）
- `filters: { status?: string; priority?: string; dueDate?: string }` —— 当前激活筛选
- `sortBy: 'dueDate' | 'priority' | 'createdAt'` —— 排序规则
- `sortOrder: 'asc' | 'desc'` —— 排序方向
- `viewState: 'mindmap' | 'list' | 'board'`

**组件 Props**
- `TaskListRow: { task: Task; onToggleComplete: () => void; onEdit: () => void; onDelete: () => void; onNavigateToNode: () => void }`
- `FilterBar: { filters: FilterState; sortBy: string; view: 'list' | 'board'; onFilterChange: (f) => void; onSortChange: (s) => void; onViewChange: (v) => void }`

### 5. 交互说明

| 交互 | 行为 |
|------|------|
| **切换视图** | 点击 ViewHeader Tab，列表 ↔ 看板同级切换：滑动过渡（当前左滑退出/右滑进入，250ms） |
| **筛选任务** | 点击 Chip 展开 DropdownMenu，多选/单选即时过滤（内存过滤，<100ms 响应） |
| **清除筛选** | 任何筛选激活时，FilterBar 右侧显示 "清除全部" 链接文字，`text-xs text-[var(--color-primary)]` |
| **排序** | 下拉选择：截止日期 ↑↓ / 优先级 ↑↓ / 创建时间 ↑↓ |
| **复选框** | 点击行首复选框 toggle 完成态，即时更新状态（乐观更新） |
| **Hover 行** | 背景变 `--bg-elevated`，右侧出现"编辑"/"删除"图标按钮（`opacity 0 → 1`，150ms） |
| **点击任务名** | 跳转到 `/project/:id` 思维导图视图，并高亮定位到对应节点（全局定位） |
| **行内编辑** | 双击任务名称进入 inline Input 编辑，`Enter` 确认，`Esc` 取消 |
| **列表拖拽排序** | 拖拽行时其他行让出空间，插入位置显示 `2px solid --color-primary` 横线，释放后 FLIP 动画 200ms |

### 6. 视觉检查点

- [ ] 列表行高严格 48px，表头 36px
- [ ] 完成任务文字有 `line-through` 且色调 muted，整体不突兀
- [ ] 优先级圆点与文字在同一列，不与其他语义色混淆
- [ ] hover 操作按钮使用 Lucide `Pencil` / `Trash2` / `MoreHorizontal`，16px
- [ ] Avatar 缺图时显示用户首字母，`radius-full`，`bg-[var(--bg-elevated)] text-[var(--text-secondary)]`
- [ ] 空状态时显示 `TaskEmptyState`：Lucide `BrainCircuit` 24px + "在思维导图中将节点转为任务即可开始追踪"
- [ ] 所有交互支持键盘导航（Tab 在行之间移动，Space toggle 复选框，Enter 打开编辑）

---

## Design Prompt 4：项目看板 `/project/:id/board`

### 1. 页面名称 + 路由
- **页面**：项目看板视图
- **路由**：`/project/:id/board`
- **主题**：浅色模式

### 2. 组件清单

**shadcn/ui 组件**
- `Card`（任务卡片载体）
- `Badge`（状态计数徽章、标签）
- `Button`（Ghost / "+ 添加任务"）
- `ScrollArea`（列内垂直滚动）
- `DropdownMenu`（列头操作菜单）

**自定义组件**
- `ViewHeader` —— 复用
- `KanbanColumn` —— 单列容器（列头 + 卡片列表 + 底部添加按钮）
- `KanbanCard` —— 任务卡片（优先级圆点 + 标题 + 标签 + 截止日期 + 负责人）
- `TaskEmptyState` —— 列内空状态
- `FilterBar` —— 与列表视图复用（状态筛选在此视图默认不显示，因为列即状态）

### 3. 布局说明

```
+-------------------------------------------------------------+
| [导图标题 ▼]  [思维导图 | 项目列表 | 项目看板 ✓]  [...]       |  ← ViewHeader (40px)
+-------------------------------------------------------------+
|                     （筛选栏可选，简洁模式）                    |  ← FilterBar (若启用)
+-------------------------------------------------------------+
| +--------+  +--------+  +--------+                        |
| | 待办 3   |  | 进行中 2 |  | 已完成 5 |                        |
| |        |  |        |  |        |                        |
| | [Card] |  | [Card] |  | [Card] |                        |
| | [Card] |  | [Card] |  | [Card] |                        |
| | [+添加]|  | [+添加]|  | [Card] |                        |
| +--------+  +--------+  +--------+                        |
|        ↑ 横向滚动区域                                        |
+-------------------------------------------------------------+
```

**DOM 结构与 CSS**
- 页面外层：`flex flex-col h-screen`
- 看板容器：`flex-1 overflow-x-auto overflow-y-hidden bg-[var(--bg-primary)] px-[var(--space-4)] py-[var(--space-4)] flex gap-[var(--space-6)]`
- 单列（`KanbanColumn`）：`w-[280px] flex-shrink-0 flex flex-col h-full`
  - 列头：`h-[40px] flex items-center justify-between mb-[var(--space-3)]`
    - 状态名称：`text-sm font-medium text-[var(--text-primary)]`
    - 计数徽章：`radius-full`，`text-2xs`，高度 20px，`bg-[var(--bg-elevated)] text-[var(--text-secondary)]`，padding `2px 8px`
    - 操作菜单：Lucide `MoreHorizontal` 16px，hover 显示
  - 卡片列表：`flex-1 overflow-y-auto flex flex-col gap-[var(--space-4)]`
  - 底部添加按钮：`w-full h-[36px] flex items-center justify-center gap-[var(--space-2)] text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] radius-md mt-[var(--space-2)]`
- 卡片（`KanbanCard`）：`bg-[var(--bg-surface)] border border-[var(--border-default)] radius-md p-[var(--space-3)] hover:shadow-sm hover:border-[var(--border-hover)] transition-all duration-fast`
  - 卡片内部结构（见 UIUX §5.2.2）：
    - 第一行：优先级圆点（8px） + 任务标题 `text-sm text-[var(--text-primary)]`
    - 第二行：标签胶囊（`radius-full`，`text-2xs`，背景 `--bg-elevated`） + 截止日期 `text-2xs`（缺省 `--text-muted`，过期 `--color-danger`） + 负责人 Avatar（右对齐）
  - 拖拽中：`opacity-0.4`，`scale(0.95)`，`rotate-2`

### 4. 状态说明

**Zustand Store（read/write）**
- `currentProject: Project`
- `tasksByStatus: Record<'todo' | 'in_progress' | 'done', Task[]>` —— 按状态分组的任务
- `draggingCardId: string | null` —— 当前拖拽中的卡片 ID
- `dragOverColumn: string | null` —— 拖拽悬停的列
- `filters: FilterState` —— 筛选（在项目看板中，优先级/截止日期仍可用）

**组件 Props**
- `KanbanColumn: { status: 'todo' | 'in_progress' | 'done'; title: string; tasks: Task[]; onDrop: (taskId, targetStatus) => void; onAddTask: () => void }`
- `KanbanCard: { task: Task; onDragStart: () => void; onClick: () => void }`

### 5. 交互说明

| 交互 | 行为 |
|------|------|
| **拖拽卡片** | 按住卡片拖动：卡片 `scale(0.95) opacity-0.9`，原位置占位。跟随鼠标移动 |
| **悬停列** | 列头高亮（`text-[var(--color-primary)]`），列内显示插入位置指示线（`2px dashed --color-primary`） |
| **跨列释放** | 卡片飞入目标列指定位置，状态自动更新为对应列状态。卡片边框闪烁优先级色 300ms 提示状态变更 |
| **点击卡片** | 跳转到思维导图视图并高亮对应节点 |
| **Hover 卡片** | `shadow-sm`，边框变 `--border-hover`，显示快捷操作图标（编辑/删除） |
| **添加任务** | 点击列底 "+ 添加任务" → 在列顶插入空白卡片进入编辑态，或跳转思维导图创建节点并自动转任务 |
| **列表↔看板切换** | 同级滑动过渡 250ms |

### 6. 视觉检查点

- [ ] 列宽固定 280px，列间距 24px（`var(--space-6)`），横向滚动
- [ ] 三列固定：To Do / In Progress / Done，列头文字与计数徽章间距 8px
- [ ] 卡片间距 16px（`var(--space-4)`），卡片圆角 `--radius-md` 8px
- [ ] 拖拽时插入位置使用 `2px dashed --color-primary`，不使用彩色阴影
- [ ] 已完成卡片整体 `opacity-0.65`，标题删除线（同列表视图）
- [ ] 空列中央显示 `TaskEmptyState`：Lucide `BrainCircuit` 24px + "还没有任务..."
- [ ] 无紫色渐变、无弥散大阴影、无 Emoji
- [ ] 卡片支持 `focus-visible` ring（`--color-primary-ring`）

---

## Design Prompt 5：全局任务列表 `/global-tasks`

### 1. 页面名称 + 路由
- **页面**：全局任务列表
- **路由**：`/global-tasks`
- **主题**：浅色模式
- **说明**：聚合所有项目任务，是侧边栏"全局任务"入口的落地页

### 2. 组件清单

**shadcn/ui 组件**
- `Checkbox`
- `Badge`
- `Button`（Ghost / Icon）
- `DropdownMenu`
- `Select`
- `Avatar`
- `Collapsible`（分组折叠）

**自定义组件**
- `GlobalFilterBar` —— 筛选栏（高度 48px，项目/优先级/状态/截止日期/排序/视图切换）
- `GlobalTaskRow` —— 全局任务行（含项目色圆点 + 项目标签 + 任务信息）
- `GroupSection` —— 分组 Section 头（可折叠，含项目色圆点 + 项目名 + 任务计数）
- `ViewToggle` —— 列表/看板胶囊切换
- `GlobalTaskEmptyState` —— 全局空状态（Lucide `LayoutDashboard` 40px + 引导箭头动画）

### 3. 布局说明

```
+-------------------------------------------------------------+
|  [Logo]  MindFlow   [全局任务]  [全局搜索]   [通知] [头像]    |  ← AppHeader (48px)
+------+------------------------------------------------------+
|全局任|                                                      |
|务入口|  项目 ▼ | 优先级 ▼ | 状态 ▼ | 截止 ▼   排序 ▼ [列表✓][看板] |
|选中态|  ───────────────────────────────────────────────────   |
|      |                                                      |
|      |  ▼ ● 项目A                                  3 个任务  |  ← GroupSection（按项目分组）
|      |  ───────────────────────────────────────────────────   |
|      |  ●  需求分析报告                  7月15日    高   待办  |  ← GlobalTaskRow (48px)
|      |  ●  首页 mockup 评审              7月20日    高   进行中 |
|      |  ▼ ● 项目B                                  2 个任务  |
|      |  ───────────────────────────────────────────────────   |
|      |  ●  数据库迁移方案                7月18日    中   待办  |
|      |                                                      |
+------+------------------------------------------------------+
```

**DOM 结构与 CSS**
- AppHeader 中间上下文指示器显示"全局任务"，`text-sm text-[var(--text-secondary)]`
- GlobalFilterBar：`h-[48px] px-[var(--space-4)] flex items-center gap-[var(--space-3)] bg-[var(--bg-surface)] border-b border-[var(--border-default)]`
  - 项目筛选 Chip：点击展开多选 DropdownMenu，每项带 10px 项目色圆点 + 全名，已选项显示 Lucide `Check` 16px
  - 优先级筛选：横向单选按钮组（全部 / ● 高 / ● 中 / ● 低），圆点即优先级色
  - 状态筛选：横向单选（全部 / 待办 / 进行中 / 已完成）
  - 截止日期：Select 快捷选项（今天 / 本周 / 本月 / 自定义）
  - 排序：Select（截止日期 ↑↓ / 优先级 ↑↓ / 项目名称 A-Z）
  - 视图切换：胶囊 Tab（列表 / 看板）
  - 清除筛选：任何筛选激活时右侧显示 `text-xs text-[var(--color-primary)]` "清除全部"
- 主列表区：`flex-1 overflow-y-auto bg-[var(--bg-primary)]`
- 分组模式（按项目分组示例）：
  - `GroupSection` 头：`h-[40px] px-[var(--space-4)] flex items-center gap-[var(--space-2)] cursor-pointer hover:bg-[var(--bg-elevated)]`
    - 折叠图标：Lucide `ChevronDown` / `ChevronRight`，16px，`--text-muted`
    - 项目色圆点：10px，`radius-full`
    - 项目名：`text-sm font-medium text-[var(--text-primary)]`
    - 计数：`text-2xs text-[var(--text-muted)]`
  - 任务行：`h-[48px] px-[var(--space-4)] grid grid-cols-[24px_1fr_100px_60px_80px_40px] items-center border-b border-[var(--border-default)]`
    - 项目标识列（24px）：10px 项目色圆点
    - 任务名称列：`text-sm text-[var(--text-primary)]`，可点击跳转
    - 截止日期列：100px，`text-2xs`（JetBrains Mono）
    - 优先级列：60px，仅显示优先级圆点
    - 状态列：80px，胶囊 Badge（背景 `--bg-elevated`，文字 `--text-secondary]`，`radius-full`，`text-2xs`）
    - 操作列：40px，hover 显示 Lucide `MoreHorizontal`
- 扁平列表模式：无 GroupSection 头，所有任务按排序混排

### 4. 状态说明

**Zustand Store（read/write）**
- `allTasks: Task[]` —— 跨项目聚合的全部任务（含 `project: { id, name, color }`）
- `filters: { projects?: string[]; priority?: string; status?: string; dueDateRange?: DateRange }`
- `groupBy: 'none' | 'project' | 'dueDate' | 'priority'` —— 分组方式
- `sortBy: string` —— 排序规则
- `sortOrder: 'asc' | 'desc'`
- `viewMode: 'list' | 'board'` —— 全局视图模式
- `collapsedGroups: Set<string>` —— 已折叠的分组 ID

**组件 Props**
- `GlobalTaskRow: { task: Task & { project: Project }; onToggleComplete: () => void; onNavigate: () => void }`
- `GroupSection: { groupId: string; groupName: string; groupColor?: string; taskCount: number; collapsed: boolean; onToggle: () => void; children: ReactNode }`

### 5. 交互说明

| 交互 | 行为 |
|------|------|
| **筛选组合** | 多维度筛选即时生效，内存过滤，响应 < 50ms |
| **分组切换** | 通过 UI 切换分组方式（项目/截止日期/优先级），列表平滑重排 200ms |
| **折叠/展开分组** | 点击 GroupSection 头，内容区高度动画（`max-height` 过渡 250ms），图标旋转切换 |
| **点击任务名** | 自动切换到对应项目 (`/project/:id`)，思维导图视图，高亮定位该节点并居中 |
| **视图切换** | 列表 ↔ 看板：同级滑动过渡 250ms，保留当前筛选条件 |
| **Hover 行** | 背景 `--bg-elevated`，操作按钮显示 |
| **快捷键 `G` then `L`** | 跳转到全局任务列表（从任何页面） |
| **空状态** | 无全局任务时显示 `GlobalTaskEmptyState`：Lucide `LayoutDashboard` 40px + 引导文案 + 指向 Sidebar "全局任务" 的半透明箭头动画 |

### 6. 视觉检查点

- [ ] **项目色与优先级色空间分离**：项目色圆点位于行最左侧（外缘），优先级圆点位于任务名旁（内侧），两者物理距离 ≥ 8px
- [ ] 项目标签使用 `text-2xs` 缩写胶囊，`radius-full`，背景 = 项目色 10% opacity
- [ ] 全局列表行高 48px，与项目列表一致
- [ ] 截止日期过期时文字用 `--color-danger`，字体等宽 `JetBrains Mono`
- [ ] 筛选 Chip 激活态：`bg-[var(--color-primary-subtle)] text-[var(--color-primary)]`
- [ ] 无数据时提供明确的操作引导（指向思维导图创建任务），不使用空洞占位
- [ ] 所有 DropdownMenu 使用 `shadow-md`，背景 `--bg-surface`，边框 `--border-default`

---

## Design Prompt 6：全局看板 `/global-tasks/board`

### 1. 页面名称 + 路由
- **页面**：全局看板视图
- **路由**：`/global-tasks/board`
- **主题**：浅色模式
- **说明**：跨项目任务在看板三列中聚合，卡片通过项目色标识来源

### 2. 组件清单

**shadcn/ui 组件**
- `Card`
- `Badge`
- `Button`
- `ScrollArea`
- `DropdownMenu`

**自定义组件**
- `GlobalFilterBar` —— 与全局列表复用
- `GlobalKanbanColumn` —— 看板列（同项目看板，但卡片含项目色标识）
- `GlobalKanbanCard` —— 全局看板卡片（顶部 3px 项目色横条 + 项目标签）
- `GlobalTaskEmptyState` —— 复用全局列表空状态

### 3. 布局说明

```
+-------------------------------------------------------------+
|  [Logo]  MindFlow   [全局任务]  [全局搜索]   [通知] [头像]    |  ← AppHeader (48px)
+------+------------------------------------------------------+
|全局任|                                                      |
|务入口|  项目 ▼ | 优先级 ▼ | 状态 ▼ | 截止 ▼   排序 ▼ [列表][看板✓]|
|选中态|  ───────────────────────────────────────────────────   |
|      |                                                      |
|      | +--------+  +--------+  +--------+                  |
|      | | 待办 4   |  | 进行中 2 |  | 已完成 3 |                  |
|      | |        |  |        |  |        |                  |
|      | |████████|  |████████|  |████████|  ← 卡片顶部 3px 项目色横条 |
|      | | [●] 需求 |  | [●] 首页 |  | [●] 竞品 |                  |
|      | | 分析    |  | mockup  |  | 分析    |                  |
|      | | ●项目A  |  | ●项目A  |  | ●项目A  |                  |
|      | +--------+  +--------+  +--------+                  |
|      |                                                      |
+------+------------------------------------------------------+
```

**DOM 结构与 CSS**
- 看板容器：同项目看板（`flex-1 overflow-x-auto overflow-y-hidden bg-[var(--bg-primary)] px-[var(--space-4)] py-[var(--space-4)] flex gap-[var(--space-6)]`）
- 列结构：同项目看板（280px 固定列宽，列间距 24px）
- `GlobalKanbanCard` 在项目看板卡片基础上扩展：
  - **项目色横条**：卡片顶部绝对定位 `div`，`h-[3px] w-full`，背景 = 项目分配色，圆角顶部继承 `--radius-md`（即卡片上边缘圆角内）
  - **项目标签**：卡片内容区第一行或末行，`radius-full` 胶囊，`text-2xs`，10px 项目色圆点 + 项目名称缩写
    - 样式：`display:inline-flex align-items:center gap-[4px] px-[6px] py-[2px] radius-full`
    - 背景：`rgba(var(--project-color-rgb), 0.10)`（通过 Tailwind `bg-{color}-500/10` 或 inline style 动态计算）
    - 文字：`var(--project-color-dark-1)`（项目色深 1 级）
  - 点击卡片标题区域：跳转至 `/project/:projectId`，思维导图视图，高亮节点

### 4. 状态说明

**Zustand Store（read/write）**
- `allTasks: Task[]` —— 全部任务（含完整 project 信息）
- `allTasksByStatus: Record<'todo' | 'in_progress' | 'done', Task[]>` —— 按状态分组的跨项目任务
- `filters: FilterState` —— 全局筛选（与列表视图共享同一份状态）
- `draggingCardId: string | null`
- `dragOverColumn: string | null`

**组件 Props**
- `GlobalKanbanCard: { task: Task & { project: Project }; onDragStart: () => void; onClick: () => void }`
- `GlobalKanbanColumn: { status: string; title: string; tasks: Task[]; onDrop: (taskId, targetStatus) => void }`

### 5. 交互说明

| 交互 | 行为 |
|------|------|
| **跨列拖拽** | 同项目看板逻辑，但**拖拽不改变项目归属**，仅改变状态。释放后显示 toast："状态已更新" |
| **卡片点击** | 点击标题/主体跳转至对应项目思维导图并高亮节点 |
| **项目标签点击** | 可筛选为该项目的所有任务（快捷筛选） |
| **全局→项目切换** | 深度切换动画：当前视图 `scale(1) → scale(0.98) + opacity 0`，新视图 reverse，持续 300ms |
| **快捷键 `G` then `K`** | 跳转到全局看板（从任何页面） |
| **筛选持久** | 从全局列表切换到全局看板，筛选条件保持（共享同一份 filter state） |

### 6. 视觉检查点

- [ ] 卡片顶部 3px 项目色横条必须**横跨卡片全宽**，颜色与项目分配色一致
- [ ] 项目标签胶囊背景仅 10% 不透明度，确保不喧宾夺主
- [ ] **关键原则**：项目色横条（顶部）与优先级竖条（卡片左边缘）不可重叠，优先级竖条下移 3px 开始，或全局看板卡片不显示优先级竖条（仅通过卡片内部圆点标识）
- [ ] 项目色横条与项目标签颜色一致，形成"双重点缀"而非"信息冲突"
- [ ] 拖拽中卡片 `opacity-0.4`，无彩色阴影
- [ ] 空列显示 `GlobalTaskEmptyState` 的列内简化版
- [ ] 所有卡片 hover 反馈一致：`shadow-sm` + `border-hover`

---

## Design Prompt 7：设置 `/settings`

### 1. 页面名称 + 路由
- **页面**：设置
- **路由**：`/settings`
- **主题**：支持浅色/深色切换，设置页本身根据当前主题渲染
- **说明**：账户管理、主题偏好、本地存储管理、快捷键参考

### 2. 组件清单

**shadcn/ui 组件**
- `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent`（设置分页：账户 / 外观 / 存储 / 快捷键）
- `Switch`（主题切换、选项开关）
- `Input`（用户名、邮箱等表单）
- `Label`
- `Separator`
- `Button`（Primary / Ghost / Danger）
- `Card`（设置项卡片分组）
- `Select`（语言选择等）
- `Slider`（存储用量条）
- `Dialog`（确认弹窗：删除账户/清除数据）

**自定义组件**
- `ThemeToggle` —— 主题切换控件（Light / Dark / System，图标 + 文字）
- `StorageGauge` —— 存储用量仪表盘（进度条 + 数值 + 警告阈值）
- `ShortcutTable` —— 快捷键参考表格
- `SettingsSection` —— 设置分区（标题 + 描述 + 内容）

### 3. 布局说明

```
+-------------------------------------------------------------+
|  [Logo]  MindFlow        [全局搜索]      [通知] [头像]       |  ← AppHeader (48px)
+------+------------------------------------------------------+
|      |  设置                                               |
|      |  ─────────────────────────────────────────────────   |
|      |  [账户] [外观] [存储] [快捷键]                         |  ← TabsList
|      |                                                      |
|      |  ┌────────────────────────────────────────────────┐  |
|      |  │  账户信息                                        │  |
|      |  │  ─────────────────────────────────────────────   │  |
|      |  │  用户名: [_______________]                       │  |
|      |  │  邮箱:   [_______________]  [已验证 ✓]            │  |
|      |  │                                                  │  |
|      |  │  [保存更改]                              [退出登录]│  |
|      |  └────────────────────────────────────────────────┘  |
|      |                                                      |
+------+------------------------------------------------------+
```

**DOM 结构与 CSS**
- 页面外层：`flex h-screen`
- 主内容区：`flex-1 bg-[var(--bg-primary)] overflow-y-auto`
- 设置容器：`max-w-[720px] mx-auto px-[var(--space-8)] py-[var(--space-8)]`
- 页面标题：`text-2xl font-semibold text-[var(--text-primary)] mb-[var(--space-6)]`
- TabsList：`w-full mb-[var(--space-6)] border-b border-[var(--border-default)]`
  - TabsTrigger：`h-[40px] px-[var(--space-4)] text-sm text-[var(--text-secondary)]`，选中态 `text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]`
- 设置卡片：`bg-[var(--bg-surface)] border border-[var(--border-default)] radius-lg p-[var(--space-6)] mb-[var(--space-6)]`
- 设置项：`flex items-center justify-between py-[var(--space-3)]`
  - 左侧：Label `text-sm font-medium text-[var(--text-primary)]` + 描述 `text-xs text-[var(--text-muted)] mt-[var(--space-1)]`
  - 右侧：控制组件（Switch / Input / Select / Button）
- Separator：`my-[var(--space-4)] bg-[var(--border-default)]`

**各 Tab 内容**

**账户 Tab**
- 头像区：当前头像 64px，`radius-full`，hover 显示上传遮罩
- 用户名：Input，`text-base`，`h-[40px]`，`radius-md`
- 邮箱：Input（若已验证右侧显示 Badge "已验证"，`bg-[var(--color-success)]/10 text-[var(--color-success)]`）
- 操作：Primary Button "保存更改" + Ghost Button "退出登录"
- 危险区：Separator + "删除账户" Danger Button（`bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90`），点击二次确认

**外观 Tab**
- 主题选择：三选一卡片（Light / Dark / System），每项 120×80px，选中态边框 `--color-primary` 2px
- 侧边栏宽度：Slider（180px ~ 320px），实时预览
- 紧凑模式：Switch，开启后列表行高从 48px → 36px

**存储 Tab**
- `StorageGauge`：
  - 进度条容器：`h-[8px] w-full bg-[var(--bg-elevated)] radius-full overflow-hidden`
  - 已用：`h-full bg-[var(--color-primary)]`，宽度按百分比
  - 警告阈值（40MB/50MB）：进度条超 80% 后剩余段变 `--color-warning`，超 95% 变 `--color-danger`
  - 文字：`text-xs text-[var(--text-secondary)]`，"已用 32.4 MB / 50 MB"
- 数据管理："清除本地缓存" Button + "导出数据" Button（Secondary）
- 项目存储明细：每个项目的缓存大小，`text-sm`，右侧显示"清除" Ghost Button

**快捷键 Tab**
- `ShortcutTable`：
  - 表格：`w-full`，表头 `text-xs text-[var(--text-muted)] uppercase tracking-wider`
  - 行：`h-[40px] border-b border-[var(--border-default)]`
  - 快捷键：`font-mono text-xs bg-[var(--bg-elevated)] px-[var(--space-2)] py-[var(--space-1)] radius-sm`

### 4. 状态说明

**Zustand Store（read/write）**
- `theme: 'light' | 'dark' | 'system'` —— 当前主题偏好
- `user: User` —— 当前用户信息（可编辑字段）
- `sidebarWidth: number` —— 侧边栏宽度（180~320）
- `compactMode: boolean` —— 紧凑模式
- `storageUsage: { used: number; limit: number; byProject: Record<string, number> }` —— 存储用量

**组件 Props**
- `ThemeToggle: { value: 'light' | 'dark' | 'system'; onChange: (v) => void }`
- `StorageGauge: { used: number; limit: number; warningAt: number }`
- `SettingsSection: { title: string; description?: string; children: ReactNode }`

### 5. 交互说明

| 交互 | 行为 |
|------|------|
| **主题切换** | 点击 Light/Dark/System 选项，即时切换 `data-theme` 属性，全局过渡 250ms（背景/文字色），支持 `prefers-reduced-motion` |
| **保存账户** | 点击"保存更改" → 显示 Saving 状态（Button 内 Spinner）→ 成功无提示 Toast（静默保存），失败显示 inline error |
| **退出登录** | 弹窗确认 → 清除本地 auth 状态 → 跳转 `/` |
| **删除账户** | 危险区 Danger Button → Dialog 二次确认（需输入"DELETE"确认）→ 调用 API 删除 → 跳转 `/` |
| **侧边栏宽度** | Slider 拖动实时调整 Sidebar 宽度（transform width），释放后持久化 |
| **紧凑模式** | Switch toggle 即时生效，列表/看板视图行高/卡片间距同步调整 |
| **清除缓存** | 点击后确认弹窗 → 清除 IndexedDB 缓存（保留项目和任务数据，清除图片/日志）→ Toast "缓存已清除" |
| **Tab 切换** | Tabs 切换默认无动画（即时），保持滚动位置 |

### 6. 视觉检查点

- [ ] 设置页最大宽度 720px，居中，两侧留白充足（`px-32`），避免内容过宽难以阅读
- [ ] 设置卡片 `radius-lg` 12px，背景 `--bg-surface`，与主背景 `--bg-primary` 形成层级
- [ ] Danger Button 使用 `--color-danger`（#EF4444 / #DC2626），不用于任何非危险操作
- [ ] 主题切换选项卡片有明确的选中态反馈（边框 + 微阴影），非仅靠文字颜色
- [ ] Switch 组件 track：`h-[20px] w-[36px]`，thumb：`h-[16px] w-[16px]`，打开态 `bg-[var(--color-primary)]`
- [ ] 快捷键表格中的键帽样式：`bg-[var(--bg-elevated)] border border-[var(--border-default)] radius-sm`，JetBrains Mono 字体
- [ ] 所有表单 Input focus 态：`ring-2 ring-[var(--color-primary-ring)]`，border `--border-focus`
- [ ] 设置页支持键盘导航（Tab 在设置项之间移动，Space toggle Switch，Enter 触发 Button）
- [ ] 深色模式下图表/进度条颜色自动适配（已用段 `--color-primary` 在深色模式为 indigo-500）

---

## 附录：shadcn/ui 组件安装清单

执行以下命令安装本项目所需全部 shadcn/ui 组件：

```bash
npx shadcn add button
npx shadcn add card
npx shadcn add checkbox
npx shadcn add badge
npx shadcn add input
npx shadcn add label
npx shadcn add select
npx shadcn add switch
npx shadcn add separator
npx shadcn add dialog
npx shadcn add dropdown-menu
npx shadcn add tooltip
npx shadcn add scroll-area
npx shadcn add tabs
npx shadcn add slider
npx shadcn add avatar
npx shadcn add collapsible
```

---

> **冻结声明**：以上 7 个 Design Prompt 基于 SPEC.md §7 页面清单与 UIUX.md 冻结设计生成。开发阶段如需修改任何布局/交互/视觉决策，须经设计总监（颜好看）UX Review。
