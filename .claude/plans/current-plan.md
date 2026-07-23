# Plan: 三栏固定布局改造

## 目标
将思维导图页面从「浮动弹出式侧边栏」改为「VS Code 风格三栏固定布局」：
```
┌──────────────┬─────────────────┬──────────────┐
│ 全局侧边栏    │  MindMapCanvas  │ 详情面板     │
│  (Sidebar)    │  (浮动工具栏保留)│ (NodeDetail) │
└──────────────┴─────────────────┴──────────────┘
```

## 设计决策

1. **保留 MindMapCanvas 内部浮动工具栏** — 不做大拆改，保持 `activeNodeData` 和 `activeNodePos` 继续由 MindMapCanvas 内部管理
2. **右侧详情面板提升到 ProjectMindMapPage** — 作为固定第三栏引入
3. **数据流通过 ref 连接** — `canvasRef.current.updateActiveNode()` 让详情面板触发节点更新

## 改动文件

### 1. apps/web/src/components/mindmap/MindMapCanvas.tsx
- ✅ `onNodeActive` callback prop — 节点激活时通知父级
- ✅ `updateActiveNode` ref 方法 — 供外部调用以修改节点数据
- ❌ 内嵌 `NodeDetailSidebar` 渲染 — 删除

### 2. apps/web/src/pages/ProjectMindMapPage.tsx
- 管理 `activeNodeData` state
- 三栏布局: ViewHeader (跨满) + [Canvas | DetailPanel]
- 控制详情面板的折叠/展开状态（默认打开）
- 挂载点从 MindMapCanvas 内部移到此处
- 保留 loading 和无数据遮罩

### 3. apps/web/src/components/mindmap/NodeDetailSidebar.tsx
- ❌ 移除 `Sheet` 弹出包装
- ✅ 改为固定面板（带左侧拖拽手柄调整宽度）
- ✅ 接收外部 `activeNodeData` + `onNodeUpdate` props
- ✅ 接收 `canvasRef` prop，内部调用 `updateActiveNode`

## 数据流
```
[MindMapCanvas]         [ProjectMindMapPage]          [NodeDetailSidebar]
  node_active ──→        activeNodeData state ──→     展示节点详情
  updateActiveNode ←──   canvasRef.updateActiveNode     用户修改详情
```

## 验证清单
- [ ] 切换项目无闪烁
- [ ] 点击节点右侧详情即时更新（无弹出动画）
- [ ] 右侧面板可拖拽调整宽度
- [ ] 有折叠/展开按钮
- [ ] 浮动工具栏正常工作
- [ ] Lint 0 errors
- [ ] Build 成功
