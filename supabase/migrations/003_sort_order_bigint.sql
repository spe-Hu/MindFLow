-- ============================================
-- MindFlow v1.2.1 — Fix sort_order int overflow
-- ============================================
-- 根因：前端 NewProjectDialog.tsx 使用 Date.now() 作为 sort_order，
--       2026 年时间戳约 1.78×10¹²，超出 PostgreSQL int (32-bit) 上限 2,147,483,647，
--       导致 projects 插入失败，进而 mindmaps/tasks 的 FK 约束也爆炸。
-- 修复：将 sort_order 列改为 bigint，兼容现有本地老数据。
-- ============================================

ALTER TABLE projects ALTER COLUMN sort_order TYPE bigint;
ALTER TABLE tasks ALTER COLUMN sort_order TYPE bigint;
ALTER TABLE mindmap_nodes ALTER COLUMN sort_order TYPE bigint;

-- ============================================
-- Migration Complete
-- ============================================
