-- Migration 007: create change_log table for incremental sync
-- 增量同步：通过触发器捕获 projects/mindmaps/tasks 的 INSERT/UPDATE/DELETE，
-- 前端 fetchChangeLog() 可以按 last_sync_checkpoint 时间戳增量拉取。

CREATE TABLE IF NOT EXISTS public.change_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL CHECK (table_name IN ('projects', 'mindmaps', 'tasks')),
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：加速增量拉取（按 user_id + 时间范围）
CREATE INDEX IF NOT EXISTS idx_change_log_user_time
  ON public.change_log (user_id, created_at);

-- 索引：加速按 (table_name, record_id) 反查
CREATE INDEX IF NOT EXISTS idx_change_log_record
  ON public.change_log (table_name, record_id);

-- RLS: 用户只能看自己的 change_log
ALTER TABLE public.change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own change_log"
  ON public.change_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- 触发器函数：为 projects/mindmaps/tasks 表自动写入 change_log
CREATE OR REPLACE FUNCTION public.write_change_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action TEXT;
  v_record_id TEXT;
  v_payload JSONB;
BEGIN
  -- 提取 user_id（所有业务表都有 user_id 列）
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_record_id := OLD.id::TEXT;
    v_action := 'DELETE';
    v_payload := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    v_user_id := NEW.user_id;
    v_record_id := NEW.id::TEXT;
    v_action := 'UPDATE';
    v_payload := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    v_user_id := NEW.user_id;
    v_record_id := NEW.id::TEXT;
    v_action := 'INSERT';
    v_payload := to_jsonb(NEW);
  END IF;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.change_log (user_id, table_name, record_id, action, payload, created_at)
    VALUES (
      v_user_id,
      TG_TABLE_NAME,
      v_record_id,
      v_action,
      v_payload,
      NOW()
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 为三个业务表挂触发器（仅在已存在的表上）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    DROP TRIGGER IF EXISTS trg_projects_change_log ON public.projects;
    CREATE TRIGGER trg_projects_change_log
      AFTER INSERT OR UPDATE OR DELETE ON public.projects
      FOR EACH ROW EXECUTE FUNCTION public.write_change_log();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mindmaps') THEN
    DROP TRIGGER IF EXISTS trg_mindmaps_change_log ON public.mindmaps;
    CREATE TRIGGER trg_mindmaps_change_log
      AFTER INSERT OR UPDATE OR DELETE ON public.mindmaps
      FOR EACH ROW EXECUTE FUNCTION public.write_change_log();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    DROP TRIGGER IF EXISTS trg_tasks_change_log ON public.tasks;
    CREATE TRIGGER trg_tasks_change_log
      AFTER INSERT OR UPDATE OR DELETE ON public.tasks
      FOR EACH ROW EXECUTE FUNCTION public.write_change_log();
  END IF;
END;
$$;