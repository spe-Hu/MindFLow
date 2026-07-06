# MindFlow 迭代 33 — PDF 导图导出

## 本次交付

- **修改** `src/components/mindmap/MindMapCanvas.tsx` — 新增 PDF 导出支持
  - 导入并注册 simple-mind-map 内置 `ExportPDF` 插件（基于 `pdf-lib`）
  - 导出下拉菜单新增「导出 PDF」按钮（FileInput 图标）
  - `handleExport` 新增 `pdf` 类型，使用 `instance.export('pdf', true, 'mindflow')` 触发完整导出+下载流程
  - 零新外部依赖（`pdf-lib` 已由 simple-mind-map 引入）

## 验证结果

- Build 零 errors ✅
- 无新增 lint warnings ✅
- 代码改动集中在单一文件，风险可控

## 关键决策

- 复用 simple-mind-map 原生 ExportPDF 插件，不自行封装 pdf-lib 逻辑
- 通过 `instance.export()` 调用以利用内置 downloadFile 触发浏览器下载
- PDF 通过 PNG → pdf-lib embed → PDF bytes 流程生成，单页自适应导图尺寸

## 后续建议

1. 文件附件（C5）—— IndexedDB blob 存储方案，涉及 schema 变更
2. 协作分享（C2）—— 需要 Supabase RLS + 分享 token 表，工作量较大
3. bundle 体积优化 — pdf-lib 使 gzip 后 bundle +~176KB，后续可考虑动态导入懒加载
