-- ============================================
-- MindFlow v1.2.2 — Add missing task columns for cloud sync
-- ============================================
-- 根因：sync.ts 在 upsert tasks 时携带了 pomodoro_count 字段，
--       但云端 tasks 表从未创建该列，导致所有任务同步失败。
--       报错："Could not find the 'pomodoro_count' column of 'tasks' in the schema cache"
-- 修复：给 tasks 表添加 pomodoro_count 列。
-- ============================================

-- 添加番茄钟计数列（已有本地数据，默认 0）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pomodoro_count integer DEFAULT 0;

-- ============================================
-- Migration Complete
-- ============================================
