-- ============================================
-- MindFlow v1.3 — Shared Links (read-only sharing)
-- ============================================
-- 支持用户生成只读分享链接，Snapshot 模式保证分享安全性和简化查询
-- ============================================

CREATE TABLE IF NOT EXISTS shared_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  token text UNIQUE NOT NULL,
  snapshot jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- 通过 token 快速查询的索引
CREATE INDEX IF NOT EXISTS idx_shared_links_token ON shared_links(token);
-- 按创建者查询的索引
CREATE INDEX IF NOT EXISTS idx_shared_links_created_by ON shared_links(created_by);

-- 行级安全策略
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;

-- 任何人（包括未登录用户）都可以凭 token 读取某条 shared_link
CREATE POLICY "Anyone can read shared links by token"
  ON shared_links
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 登录用户只能创建自己的 shared_link
CREATE POLICY "Authenticated users can create shared links"
  ON shared_links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 登录用户只能删除自己的 shared_link
CREATE POLICY "Authenticated users can delete own shared links"
  ON shared_links
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ============================================
-- Migration Complete
-- ============================================