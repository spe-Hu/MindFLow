# MindFlow MVP 迭代总结 — 2026-07-05 第 4 次

## 本次完成

### 1. 孤儿 Task 自动清理
- **问题**: Bug 3（MindMapCanvas 切换项目时 task 错写）修复前，可能遗留了 node_uid 不在 mindmap tree 中的脏 task 数据
- **解决**: `lib/db.ts` 新增 `cleanupOrphanedTasks()`，在 `AppLayout.tsx` 初始化时异步调用
- **逻辑**: 遍历所有 task → 检查 node_uid 是否存在于对应 mindmap tree_data 中 → 不存在则 bulkDelete

### 2. 项目归档功能
- **需求**: PRD 规定 20 个项目上限，用户需要归档已完成项目来管理侧边栏
- **实现**:
  - `projectStore.ts`: `archiveProject` / `unarchiveProject` / `loadArchivedProjects`
  - `Sidebar.tsx`: 项目菜单新增「归档项目」按钮，归档后自动跳转全局任务
  - `SettingsPage.tsx` (存储 Tab): 新增「已归档项目」区域，支持恢复或彻底删除
- **数据模型**: 复用已有的 `is_archived` 字段，无需迁移

## 验证结果

| 检查项 | 结果 |
|--------|------|
| `npm run build` | ✅ 零 errors (2.95s) |
| `npm run lint` | ✅ 零 errors (6 warnings 均为已有 shadcn/hooks 问题) |

## 修改文件清单

- `src/frontend/src/lib/db.ts` — 新增 `cleanupOrphanedTasks`
- `src/frontend/src/components/layout/AppLayout.tsx` — 初始化时调用清理
- `src/frontend/src/stores/projectStore.ts` — 归档相关 state + actions
- `src/frontend/src/components/layout/Sidebar.tsx` — 归档按钮 + 确认对话框
- `src/frontend/src/pages/SettingsPage.tsx` — 已归档项目管理区域

## 后续建议

1. **simple-mind-map placeholder 截断**: 库内部 contenteditable 默认 placeholder "二级节点"，影响真实用户输入。方案：在 MindMapCanvas init 时 hook 编辑态，自动 selectAll 或替换为 input。
2. **simple-mind-map rbox 报错**: `View.fit` 报 `Getting rbox of element "g" is not possible`。方案：延迟首次 fit，等 DOM 稳定后再调用。
3. **E2E 集成到 npm scripts**: 当前 E2E 测试需手动跑，可封装为 `npm run test:e2e`。
