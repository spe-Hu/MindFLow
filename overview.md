# MindFlow 迭代 30 — AI 辅助生成思维导图

## 本次交付

- **新增** `src/lib/aiMindMap.ts` — AI 思维导图生成引擎
  - 本地语义规则引擎：按主题关键词自动匹配 4 类模板骨架（产品/论文/活动/周计划）
  - 通用 OKR 回退骨架：核心目标 / 执行计划 / 资源与风险 / 复盘与度量
  - 可选外部 LLM API 层（探测 `VITE_OPENAI_API_KEY`）
- **修改** `src/components/project/NewProjectDialog.tsx` — 模板网格新增"AI 生成"卡片，选中后自动生成结构并创建项目
- **修改** `src/lib/templates.ts` — 导出 `createNode` 和 `generateId` 供生成引擎复用

## 验证结果

- Build 零 errors ✅
- Lint 6 warnings 均为已有，无新增 ✅

## 关键决策

- 不强制依赖外部 LLM：本地规则引擎毫秒级生成，无需 API key 即可工作；配置 key 后自动升级到 LLM 生成
- 复用现有模板骨架 + `createNode` helper，保证 tree_data 格式与 simple-mind-map 100% 兼容
- NewProjectDialog UI 最小改动：在现有 2×3 网格中填满第 6 格，交互模式与模板选择完全一致
