-- ============================================
-- MindFlow v1.2 — Initial Schema Migration
-- ============================================
-- 说明：业务表 id 列使用 text 类型（兼容本地自定义 string ID），
--       仅 user_id / auth 相关列保持 uuid（外键指向 auth.users.id）。
-- 可直接在 Supabase SQL Editor 中执行
-- 生成日期：2026-07-06
-- ============================================

-- --------------------------------------------
-- 1. 扩展启用
-- --------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------
-- 2. updated_at 自动更新函数
-- --------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------
-- 3. 用户扩展表 (auth.users 扩展)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username varchar(50) UNIQUE,
    display_name varchar(100),
    avatar_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_users_username ON users(username);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------
-- 4. 项目表 (projects)
-- --------------------------------------------
-- 说明：项目为顶层实体，每个项目对应一张思维导图（mindmaps 1:1）
-- id 使用 text 以兼容本地自定义 string ID
CREATE TABLE IF NOT EXISTS projects (
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

-- 索引策略：侧边栏列表排序 + 最近项目 + 归档筛选
CREATE INDEX idx_projects_user_sort ON projects(user_id, sort_order);
CREATE INDEX idx_projects_user_last_opened ON projects(user_id, last_opened_at);
CREATE INDEX idx_projects_is_archived ON projects(is_archived);

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------
-- 5. 思维导图表 (mindmaps)
-- --------------------------------------------
-- 说明：MVP 阶段项目与导图 1:1 关联，project_id 带 UNIQUE 约束
CREATE TABLE IF NOT EXISTS mindmaps (
    id text PRIMARY KEY,
    project_id text NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
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

-- 索引策略：按项目查询 + 按用户查询
CREATE INDEX idx_mindmaps_project_id ON mindmaps(project_id);
CREATE INDEX idx_mindmaps_user_id ON mindmaps(user_id);

CREATE TRIGGER update_mindmaps_updated_at
    BEFORE UPDATE ON mindmaps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------
-- 6. 任务表 (tasks)
-- --------------------------------------------
-- 说明：从导图节点中提取的任务，支持项目级与全局级查询
CREATE TABLE IF NOT EXISTS tasks (
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    mindmap_id text NOT NULL REFERENCES mindmaps(id) ON DELETE CASCADE,
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

-- 索引策略：项目看板筛选 + 全局任务筛选 + 时间筛选 + 节点唯一映射
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_user_status_priority ON tasks(user_id, status, priority);
CREATE INDEX idx_tasks_user_due_date ON tasks(user_id, due_date);
CREATE UNIQUE INDEX idx_tasks_project_node_uid ON tasks(project_id, node_uid);

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------
-- 7. 节点扁平化表 (mindmap_nodes)
-- --------------------------------------------
-- 说明：将树形结构扁平化存储，便于独立查询和同步
CREATE TABLE IF NOT EXISTS mindmap_nodes (
    id text PRIMARY KEY,
    project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    mindmap_id text NOT NULL REFERENCES mindmaps(id) ON DELETE CASCADE,
    uid varchar(64) NOT NULL,
    parent_uid varchar(64),
    text text NOT NULL,
    data jsonb NOT NULL DEFAULT '{}',
    depth int NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    is_task boolean DEFAULT false,
    task_id text REFERENCES tasks(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 索引策略：节点唯一标识 + 按项目/导图/父节点/任务标记查询
CREATE UNIQUE INDEX idx_nodes_mindmap_uid ON mindmap_nodes(mindmap_id, uid);
CREATE INDEX idx_nodes_project_id ON mindmap_nodes(project_id);
CREATE INDEX idx_nodes_mindmap_id ON mindmap_nodes(mindmap_id);
CREATE INDEX idx_nodes_parent_uid ON mindmap_nodes(parent_uid);
CREATE INDEX idx_nodes_is_task ON mindmap_nodes(is_task);

CREATE TRIGGER update_mindmap_nodes_updated_at
    BEFORE UPDATE ON mindmap_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------
-- 8. 标签表 (tags)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name varchar(50) NOT NULL,
    color varchar(7) DEFAULT '#3B82F6',
    created_at timestamptz DEFAULT now()
);

-- 索引策略：用户标签去重
CREATE UNIQUE INDEX idx_tags_user_name ON tags(user_id, name);

-- --------------------------------------------
-- 9. 项目-标签关联表 (project_tags)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS project_tags (
    id text PRIMARY KEY,
    project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tag_id text NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- 联合唯一：同一项目不重复关联同一标签
CREATE UNIQUE INDEX idx_project_tags_project_tag ON project_tags(project_id, tag_id);

-- --------------------------------------------
-- 10. 任务-标签关联表 (task_tags)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS task_tags (
    id text PRIMARY KEY,
    task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id text NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- 联合唯一：同一任务不重复关联同一标签
CREATE UNIQUE INDEX idx_task_tags_task_tag ON task_tags(task_id, tag_id);

-- --------------------------------------------
-- 11. 启用 Row Level Security
-- --------------------------------------------
-- 所有业务表必须启用 RLS，数据隔离在数据库层生效
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmap_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------
-- 12. RLS Policy（SPEC §5.2 — 7 条核心业务策略）
-- --------------------------------------------

-- projects: 用户只能操作自己的项目
CREATE POLICY "Users can only access own projects"
    ON projects FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- mindmaps: 用户只能操作自己的导图
CREATE POLICY "Users can only access own mindmaps"
    ON mindmaps FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- mindmap_nodes: 用户只能操作自己项目下的节点
CREATE POLICY "Users can only access own nodes"
    ON mindmap_nodes FOR ALL
    USING (project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    ));

-- tasks: 用户只能操作自己的任务
CREATE POLICY "Users can only access own tasks"
    ON tasks FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- tags: 用户只能操作自己的标签
CREATE POLICY "Users can only access own tags"
    ON tags FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- project_tags: 用户只能操作自己项目的标签关联
CREATE POLICY "Users can only access own project_tags"
    ON project_tags FOR ALL
    USING (project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    ));

-- task_tags: 用户只能操作自己任务的标签关联
CREATE POLICY "Users can only access own task_tags"
    ON task_tags FOR ALL
    USING (task_id IN (
        SELECT id FROM tasks WHERE user_id = auth.uid()
    ));

-- users (补充): 用户只能访问自己的扩展资料
-- 注：此条为 auth 扩展表的安全补充，确保用户资料隔离
CREATE POLICY "Users can only access own profile"
    ON users FOR ALL
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============================================
-- Migration Complete
-- ============================================
