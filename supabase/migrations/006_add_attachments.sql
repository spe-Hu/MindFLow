-- ============================================
-- MindFlow v1.4 — Node Attachments (Image/File upload)
-- ============================================
-- 支持在节点/任务上附加图片和文件
-- ============================================

-- 1. tasks 表添加 attachments JSONB 列（存储附件元数据数组）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- 2. 创建 storage bucket（公开读取，支持图片和常用文件）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mindflow-attachments',
  'mindflow-attachments',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- 更新 bucket 限制（如果已存在）
UPDATE storage.buckets 
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
WHERE id = 'mindflow-attachments';

-- 3. Storage RLS 策略
-- 允许任何人读取（bucket 为 public）
CREATE POLICY "Public read attachments"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'mindflow-attachments');

-- 认证用户只能上传到以自身 user_id 为前缀的路径
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'mindflow-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 认证用户只能删除以自身 user_id 为前缀的路径下的文件
CREATE POLICY "Authenticated users can delete own attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'mindflow-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 认证用户可以更新自己的文件
CREATE POLICY "Authenticated users can update own attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'mindflow-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- Migration Complete
-- ============================================
