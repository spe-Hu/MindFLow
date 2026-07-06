-- ============================================
-- MindFlow v1.2 — 修复 uuid 类型与本地 string ID 不兼容
-- ============================================
-- 问题：本地项目/导图/任务 ID 使用自定义 string（如 1783319987163-qivf9bl），
--       但 001_initial_schema 将业务表 id 设为 uuid 类型，导致 upsert 时报
--       "invalid input syntax for type uuid"。
-- 方案：将所有业务表的 id 列及相关外键从 uuid 改为 text。
--       user_id 保持 uuid（外键指向 auth.users.id）。
-- 执行方式：在 Supabase SQL Editor 中逐段执行（或整体执行）
-- ============================================

-- --------------------------------------------
-- 1. 删除所有外键约束（以便安全修改列类型）
-- --------------------------------------------
DO $$
DECLARE
    fk RECORD;
BEGIN
    FOR fk IN
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name IN (
              'mindmaps', 'tasks', 'mindmap_nodes',
              'tags', 'project_tags', 'task_tags'
          )
        ORDER BY tc.table_name, tc.constraint_name
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I CASCADE', fk.table_name, fk.constraint_name);
    END LOOP;
END $$;

-- --------------------------------------------
-- 2. 修改 projects 表
-- --------------------------------------------
ALTER TABLE projects ALTER COLUMN id TYPE text USING id::text;

-- --------------------------------------------
-- 3. 修改 mindmaps 表
-- --------------------------------------------
ALTER TABLE mindmaps ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE mindmaps ALTER COLUMN project_id TYPE text USING project_id::text;
-- user_id 保持 uuid

-- --------------------------------------------
-- 4. 修改 tasks 表
-- --------------------------------------------
ALTER TABLE tasks ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE tasks ALTER COLUMN project_id TYPE text USING project_id::text;
ALTER TABLE tasks ALTER COLUMN mindmap_id TYPE text USING mindmap_id::text;
-- user_id 保持 uuid

-- --------------------------------------------
-- 5. 修改 mindmap_nodes 表
-- --------------------------------------------
ALTER TABLE mindmap_nodes ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE mindmap_nodes ALTER COLUMN project_id TYPE text USING project_id::text;
ALTER TABLE mindmap_nodes ALTER COLUMN mindmap_id TYPE text USING mindmap_id::text;
ALTER TABLE mindmap_nodes ALTER COLUMN task_id TYPE text USING task_id::text;

-- --------------------------------------------
-- 6. 修改 tags 表
-- --------------------------------------------
ALTER TABLE tags ALTER COLUMN id TYPE text USING id::text;
-- user_id 保持 uuid

-- --------------------------------------------
-- 7. 修改 project_tags 表
-- --------------------------------------------
ALTER TABLE project_tags ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE project_tags ALTER COLUMN project_id TYPE text USING project_id::text;
ALTER TABLE project_tags ALTER COLUMN tag_id TYPE text USING tag_id::text;

-- --------------------------------------------
-- 8. 修改 task_tags 表
-- --------------------------------------------
ALTER TABLE task_tags ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE task_tags ALTER COLUMN task_id TYPE text USING task_id::text;
ALTER TABLE task_tags ALTER COLUMN tag_id TYPE text USING tag_id::text;

-- --------------------------------------------
-- 9. 重新添加外键约束
-- --------------------------------------------

-- mindmaps
ALTER TABLE mindmaps
    ADD CONSTRAINT mindmaps_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE mindmaps
    ADD CONSTRAINT mindmaps_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- tasks
ALTER TABLE tasks
    ADD CONSTRAINT tasks_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE tasks
    ADD CONSTRAINT tasks_mindmap_id_fkey
    FOREIGN KEY (mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE;

ALTER TABLE tasks
    ADD CONSTRAINT tasks_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- mindmap_nodes
ALTER TABLE mindmap_nodes
    ADD CONSTRAINT mindmap_nodes_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE mindmap_nodes
    ADD CONSTRAINT mindmap_nodes_mindmap_id_fkey
    FOREIGN KEY (mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE;

ALTER TABLE mindmap_nodes
    ADD CONSTRAINT mindmap_nodes_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- tags
ALTER TABLE tags
    ADD CONSTRAINT tags_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- project_tags
ALTER TABLE project_tags
    ADD CONSTRAINT project_tags_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_tags
    ADD CONSTRAINT project_tags_tag_id_fkey
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;

-- task_tags
ALTER TABLE task_tags
    ADD CONSTRAINT task_tags_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE task_tags
    ADD CONSTRAINT task_tags_tag_id_fkey
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;

-- ============================================
-- Migration Complete
-- ============================================
