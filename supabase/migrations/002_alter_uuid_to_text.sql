-- ============================================
-- MindFlow v1.2 — 修复 uuid 类型与本地 string ID 不兼容
-- ============================================
-- 策略：新表替换旧表（避免 ALTER TYPE 与 policy/index/trigger 冲突）
-- 步骤：
--   1. 创建新表（text id）
--   2. 迁移旧表数据（如有）
--   3. 删除旧表 CASCADE（连带清除 policy/trigger/index/FK/RLS）
--   4. 重命名新表
--   5. 重建 index / trigger / policy / RLS
-- ============================================

-- --------------------------------------------
-- 0. 确保扩展已启用
-- --------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------
-- 1. 创建新表
-- --------------------------------------------

CREATE TABLE projects_new (
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name varchar(200) NOT NULL,
    color varchar(7) DEFAULT '#4F46E5',
    icon varchar(50) DEFAULT 'folder',
    description text,
    sort_order int DEFAULT 0,
    is_archived boolean DEFAULT false,
    version int DEFAULT 1,
    last_opened_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE mindmaps_new (
    id text PRIMARY KEY,
    project_id text NOT NULL UNIQUE REFERENCES projects_new(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title varchar(200) NOT NULL,
    root_node_id varchar(64) NOT NULL,
    layout varchar(30) DEFAULT 'logicalStructure',
    theme jsonb DEFAULT '{}',
    tree_data jsonb NOT NULL,
    view_state jsonb DEFAULT '{}',
    version int DEFAULT 1,
    last_sync_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE tasks_new (
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id text NOT NULL REFERENCES projects_new(id) ON DELETE CASCADE,
    mindmap_id text NOT NULL REFERENCES mindmaps_new(id) ON DELETE CASCADE,
    node_uid varchar(64) NOT NULL,
    title text NOT NULL,
    status varchar(20) DEFAULT 'todo',
    priority varchar(10) DEFAULT 'medium',
    due_date date,
    completed_at timestamptz,
    sort_order int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE mindmap_nodes_new (
    id text PRIMARY KEY,
    project_id text NOT NULL REFERENCES projects_new(id) ON DELETE CASCADE,
    mindmap_id text NOT NULL REFERENCES mindmaps_new(id) ON DELETE CASCADE,
    uid varchar(64) NOT NULL,
    parent_uid varchar(64),
    text text NOT NULL,
    data jsonb NOT NULL DEFAULT '{}',
    depth int NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    is_task boolean DEFAULT false,
    task_id text REFERENCES tasks_new(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE tags_new (
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name varchar(50) NOT NULL,
    color varchar(7) DEFAULT '#3B82F6',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE project_tags_new (
    id text PRIMARY KEY,
    project_id text NOT NULL REFERENCES projects_new(id) ON DELETE CASCADE,
    tag_id text NOT NULL REFERENCES tags_new(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE task_tags_new (
    id text PRIMARY KEY,
    task_id text NOT NULL REFERENCES tasks_new(id) ON DELETE CASCADE,
    tag_id text NOT NULL REFERENCES tags_new(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- --------------------------------------------
-- 2. 迁移旧表数据（uuid → text 自动兼容）
-- --------------------------------------------
INSERT INTO projects_new SELECT * FROM projects;
INSERT INTO mindmaps_new SELECT * FROM mindmaps;
INSERT INTO tasks_new SELECT * FROM tasks;
INSERT INTO mindmap_nodes_new SELECT * FROM mindmap_nodes;
INSERT INTO tags_new SELECT * FROM tags;
INSERT INTO project_tags_new SELECT * FROM project_tags;
INSERT INTO task_tags_new SELECT * FROM task_tags;

-- --------------------------------------------
-- 3. 删除旧表（CASCADE 连带清除 policy/trigger/index/FK/RLS）
-- --------------------------------------------
DROP TABLE IF EXISTS task_tags CASCADE;
DROP TABLE IF EXISTS project_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS mindmap_nodes CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS mindmaps CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- --------------------------------------------
-- 4. 重命名新表为正式名称
-- --------------------------------------------
ALTER TABLE projects_new RENAME TO projects;
ALTER TABLE mindmaps_new RENAME TO mindmaps;
ALTER TABLE tasks_new RENAME TO tasks;
ALTER TABLE mindmap_nodes_new RENAME TO mindmap_nodes;
ALTER TABLE tags_new RENAME TO tags;
ALTER TABLE project_tags_new RENAME TO project_tags;
ALTER TABLE task_tags_new RENAME TO task_tags;

-- --------------------------------------------
-- 5. 重建索引
-- --------------------------------------------
CREATE INDEX idx_projects_user_sort ON projects(user_id, sort_order);
CREATE INDEX idx_projects_user_last_opened ON projects(user_id, last_opened_at);
CREATE INDEX idx_projects_is_archived ON projects(is_archived);

CREATE INDEX idx_mindmaps_project_id ON mindmaps(project_id);
CREATE INDEX idx_mindmaps_user_id ON mindmaps(user_id);

CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_user_status_priority ON tasks(user_id, status, priority);
CREATE INDEX idx_tasks_user_due_date ON tasks(user_id, due_date);
CREATE UNIQUE INDEX idx_tasks_project_node_uid ON tasks(project_id, node_uid);

CREATE UNIQUE INDEX idx_nodes_mindmap_uid ON mindmap_nodes(mindmap_id, uid);
CREATE INDEX idx_nodes_project_id ON mindmap_nodes(project_id);
CREATE INDEX idx_nodes_mindmap_id ON mindmap_nodes(mindmap_id);
CREATE INDEX idx_nodes_parent_uid ON mindmap_nodes(parent_uid);
CREATE INDEX idx_nodes_is_task ON mindmap_nodes(is_task);

CREATE UNIQUE INDEX idx_tags_user_name ON tags(user_id, name);

CREATE UNIQUE INDEX idx_project_tags_project_tag ON project_tags(project_id, tag_id);

CREATE UNIQUE INDEX idx_task_tags_task_tag ON task_tags(task_id, tag_id);

-- --------------------------------------------
-- 6. 重建触发器
-- --------------------------------------------
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mindmaps_updated_at
    BEFORE UPDATE ON mindmaps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mindmap_nodes_updated_at
    BEFORE UPDATE ON mindmap_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------
-- 7. 启用 RLS
-- --------------------------------------------
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmap_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------
-- 8. 重建 RLS Policy
-- --------------------------------------------
CREATE POLICY "Users can only access own projects"
    ON projects FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can only access own mindmaps"
    ON mindmaps FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can only access own nodes"
    ON mindmap_nodes FOR ALL
    USING (project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access own tasks"
    ON tasks FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can only access own tags"
    ON tags FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can only access own project_tags"
    ON project_tags FOR ALL
    USING (project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only access own task_tags"
    ON task_tags FOR ALL
    USING (task_id IN (
        SELECT id FROM tasks WHERE user_id = auth.uid()
    ));

-- ============================================
-- Migration Complete
-- ============================================
