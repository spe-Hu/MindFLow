# MindFlow 第 38 次自动迭代 — Lint 清理与运行时 Bug 修复

## 执行摘要

本轮迭代对项目进行代码质量扫描，发现并修复了 1 个运行时崩溃风险 + 1 个 React Hooks 规则违例，并清理了多个未使用导入，最终达成 **Lint 0 errors**。

## 发现的问题

| 优先级 | 文件 | 问题 | 风险 |
|--------|------|------|------|
| P0 | `ProjectBoardPage.tsx` | 使用 `<EmptyState>` 但未导入 | 看板空列时运行时崩溃 |
| P0 | `SyncStatusIndicator.tsx` | `useEffect` 在 `if (!user) return null` 之后调用 | React Hooks 顺序不一致，可能抛渲染异常 |
| P1 | `MindMapCanvas.tsx` | `MindMap.usePlugin()` 被 oxlint 误报为 Hook | 假阳性，但影响 CI/Lint 分数 |
| P2 | `OutlineEditor.tsx` | `useId` 导入未使用 | 代码冗余 |
| P2 | `OutlinePage.tsx` | `toast` 导入未使用 | 代码冗余 |
| P2 | `syncStore.ts` | `get` 参数未使用 | 代码冗余 |

## 修复内容

1. **ProjectBoardPage.tsx** — 补全 `EmptyState` 导入
2. **SyncStatusIndicator.tsx** — 将 `useEffect` 上移至所有条件 return 之前
3. **MindMapCanvas.tsx** — 为 3 行 `MindMap.usePlugin()` 添加 oxlint ignore 注释
4. **OutlineEditor.tsx** — 移除 `useId`
5. **OutlinePage.tsx** — 移除 `toast`
6. **syncStore.ts** — 将 `get` 改为 `_get`（实际移除）

## 验证结果

- **Build**: ✅ 零 errors（1.77s）
- **Lint**: ✅ 0 errors + 22 warnings（原为 4 errors + 28 warnings）
- **Commit**: `978155a`

## 剩余工作

- 22 个 warnings 中大部分为 tests/e2e 中的未使用变量（不影响生产），以及 shadcn/ui 组件的 `only-export-components` 提示。
- 功能方面：文件附件、协作分享待后续评估是否纳入 v1.2。
