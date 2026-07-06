# Spec - MindFlow v1.1

> 生成日期：2026-07-03
> 基于：PRD v1.1 + 架构文档 v1.1 + UIUX 设计文档 v1.1
> 状态：已确认 / 已锁定

---

## 1. 产品定义

- **一句话描述**：融合思维导图与滴答清单的个人项目推进工具——在多个项目的思维导图中直接拆解任务、设置截止日期、追踪进度，并通过全局任务看板跨项目聚合管理
- **目标用户**：25-35 岁知识工作者（产品经理、设计师、开发者），需要同时管理多个项目的多线并行场景
- **核心问题**：思维导图（想清楚）和任务管理（做下去）之间存在断裂——在 Xmind 里拆解，手动搬运到滴答清单执行，两边信息不同步

---

## 2. MVP 范围（锁定——不在此列表的功能一律不做）

| 优先级 | 功能 | 验收标准摘要 | RICE 评分 |
|--------|------|-------------|-----------|
| P0 | 思维导图编辑 | 节点增删改、拖拽排序、折叠展开、多种结构 | 1500 |
| P0 | 节点转任务 | 一键标记为任务，出现复选框+截止日期+优先级，自动出现在项目看板 | 1500 |
| P0 | 项目看板视图 | To Do / In Progress / Done 三列，拖拽改状态，状态同步回导图 | 1417 |
| P0 | 项目管理 | 创建/切换/重命名/删除项目，每个项目独立导图+看板 | 1275 |
| P1 | 本地数据持久化 | IndexedDB 按项目分表存储，刷新不丢失，离线可用 | 2533 |
| P1 | 全局任务管理 | 聚合所有项目任务，按项目/优先级/截止日期筛选，全局看板分色分组 | 960 |

### 明确不做的功能（Won't Have）
- **移动端原生 App** — 先做响应式网页，原生 App 是远期
- **多人实时协作** — 个人工具为主，协作是 P3
- **AI 生成导图** — 排期待定
- **甘特图视图** — 排期待定
- **第三方日历订阅（iCal）** — 工作量较大，MVP 先保证自有流转
- **导入导出（PNG/PDF/XMind）** — 放 Should Have，版本2
- **大纲/导图双向编辑（幕布模式）** — 放 Should Have，版本2
- **Supabase 账户多端同步** — 放 Should Have，版本2

---

## 3. 技术架构（锁定）

| 层级 | 选型 | 说明 |
|------|------|------|
| 前端框架 | React 18 + Vite 5 | 框架无关库兼容，团队熟悉 |
| 状态管理 | Zustand | 轻量（<1KB），TypeScript 友好 |
| UI 组件 | shadcn/ui + Tailwind CSS + Lucide icons | 源码级控制，无运行时依赖 |
| 思维导图 | `simple-mind-map@0.14.0-fix.2` (npm) | 纯 JS 框架无关，自定义字段 `_isTask` |
| 本地存储 | IndexedDB (Dexie.js 封装) | 按项目动态表，离线可用 |
| 认证 | Supabase Auth | OAuth/邮箱登录 |
| 数据库 | Supabase PostgreSQL | 用户/项目/导图/节点/任务/标签 |
| 实时同步 | Supabase Realtime | Broadcast + Postgres Changes |
| 部署 | Cloudflare Pages | SPA 原生支持，国内 CDN 快 |

### 核心设计决策（锁定）
- `projects` 表为顶层实体，`mindmaps` 与 `projects` 1:1（MVP 简化，未来移除 UNIQUE 即可扩展）
- 版本号基准在 `projects` 表（项目级乐观锁，`projects.version`）
- 全局筛选前端本地过滤（先全量拉 IndexedDB，内存筛选，离线可用 + 秒级响应）
- IndexedDB 动态表：`mindflow_project_{projectId}_mindmap`

---

## 4. API 端点清单（锁定——开发时以此为唯一依据）

### 4.1 认证

| Method | 路径风格 | 功能 | 认证 |
|--------|---------|------|------|
| `/auth` | `supabase.auth.signInWithOtp()` | 邮箱 Magic Link | 无 |
| `/auth` | `supabase.auth.signInWithOAuth()` | OAuth 登录 | 无 |

### 4.2 项目级

| 操作 | Supabase SDK | 参数/说明 |
|------|-------------|-----------|
| 获取项目列表 | `from('projects').select('*, mindmaps(id)')` | `.eq('user_id', uid) .order('sort_order')` |
| 创建项目 | `from('projects').insert({ name, color })` | 同时创建空白 mindmap |
| 更新项目 | `from('projects').update({ name, color })` | `eq('id', pid) .eq('user_id', uid)` |
| 删除项目 | `from('projects').delete()` | ON DELETE CASCADE 级联删除关联数据 |

### 4.3 导图级

| 操作 | Supabase SDK | 参数/说明 |
|------|-------------|-----------|
| 获取导图 | `from('mindmaps').select('*, mindmap_nodes(*)')` | `eq('project_id', pid) .single()` |
| 更新导图 | `from('mindmaps').update({ tree_data, version })` | 乐观锁：`eq('version', currentVersion)` |
| 获取节点 | `from('mindmap_nodes').select('*')` | `eq('mindmap_id', mid) .order('depth, sort_order')` |

### 4.4 任务级（含全局查询）

| 操作 | Supabase SDK | 参数/说明 |
|------|-------------|-----------|
| 获取项目任务 | `from('tasks').select('*, project(id, name, color)')` | `eq('project_id', pid)` |
| 获取全局任务 | `from('tasks').select('*, project(id, name, color)')` | `eq('user_id', uid)` 跨项目聚合 |
| 创建/更新任务 | `from('tasks').upsert(...)` | `upsert matching on (project_id, node_uid)` |
| 删除任务 | `from('tasks').delete()` | `eq('id', taskId)` |

### 4.5 实时频道

| 频道 | 类型 | 用途 |
|------|------|------|
| `project:{project_id}` | Broadcast | 同一项目内广播导图/任务操作 |
| `db:projects` | Postgres Changes | 监听当前用户项目变更 |
| `db:tasks` | Postgres Changes | 监听当前用户任务变更 |

---

## 5. 数据库表清单（锁定）

### 5.1 表结构

| 表名 | 核心字段 | 索引 | 关联 |
|------|----------|------|------|
| `users` | id(PK), username, display_name, avatar_url | username UNIQUE | auth.users |
| `projects` | id(PK), user_id(FK), name, color, icon, sort_order, is_archived, version | user_id+sort_order, user_id+last_opened_at | 1:N→mindmaps,tasks,nodes |
| `mindmaps` | id(PK), project_id(FK,UNIQUE), user_id(FK), title, tree_data(JSONB), view_state(JSONB), version | project_id | 1:1→projects |
| `mindmap_nodes` | id(PK), project_id(FK), mindmap_id(FK), uid, parent_uid, text, data(JSONB), depth, is_task, task_id(FK) | mindmap_id+uid(UNIQUE), project_id, parent_uid, is_task | N:1→mindmaps, tasks |
| `tasks` | id(PK), user_id(FK), project_id(FK), mindmap_id(FK), node_uid, title, status, priority, due_date, completed_at | project_id+status, user_id+status+priority, user_id+due_date, project_id+node_uid(UNIQUE) | N:1→projects,mindmaps |
| `tags` | id(PK), user_id(FK), name, color | user_id+name(UNIQUE) | M:N→projects(via project_tags) |
| `project_tags` | id(PK), project_id(FK), tag_id(FK) | project_id+tag_id(UNIQUE) | N:1→projects, tags |
| `task_tags` | id(PK), task_id(FK), tag_id(FK) | task_id+tag_id(UNIQUE) | N:1→tasks, tags |

### 5.2 RLS Policy（数据隔离核心——必须执行）

**每张业务表必须建立以下 Policy，确保用户只能访问自己的数据**

```sql
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
```

**隔离强度说明**：RLS Policy 在 PostgreSQL 层面生效，不依赖前端信任。即使有人绕过前端直接调用 Supabase API，`auth.uid()` 不匹配的数据也会被过滤掉，返回 403。这是 100% 的数据隔离保证。

### 5.3 外键级联

```sql
-- 删除 project 自动级联删除所有关联数据
ALTER TABLE mindmaps ADD CONSTRAINT fk_mindmaps_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE mindmap_nodes ADD CONSTRAINT fk_nodes_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_tags ADD CONSTRAINT fk_pt_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
```

---

## 6. 数据主从策略（锁定——新增补充）

### 6.1 主从关系

| 层级 | 角色 | 说明 |
|------|------|------|
| **Supabase 云端** | **唯一主子源 (Source of Truth)** | 所有写入最终必须到达云端才算持久化成功 |
| **IndexedDB 本地** | **缓存 + 离线操作队列** | 在线时读缓存提速，离线时排队等待同步 |
| `projects.version` | 乐观锁 | 冲突时以云端为准 |

### 6.2 数据流向

```
在线（有网）
    用户操作 → Supabase 写入 → 成功后写 IndexedDB 缓存
                                    ↓
                              失败 → 入 IndexedDB 重试队列
                                    ↓
                              其他设备通过 Realtime 收到变更

离线（无网）
    用户操作 → 直接写入 IndexedDB 缓存 + 操作队列
                                    ↓
                              恢复联网 → 队列回放 → Supabase 写入
                                    ↓
                              冲突（version 不匹配）→ 弹窗让用户选
```

### 6.3 关键规则

- Supabase 云端永远是最终权威。用户更换浏览器/设备，IndexedDB 从零从云端拉取
- 多设备同时编辑同一项目 → 以云端 `projects.version` 为准，Last-Write-Wins
- IndexedDB 存储上限 ~50MB，监测到 40MB 时提示导出清理
- 项目删除时同时 drop 对应的 IndexedDB 动态表，无残留

---

## 7. 页面清单（锁定）

| 页面 | 路由 | 核心组件 | 对应 API | 设计 Token 主题 |
|------|------|----------|----------|-----------------|
| 首页/空状态 | `/` | 空状态插画 + "创建项目" CTA | — | 浅色主题 |
| 项目思维导图 | `/project/:id` | MindMap 实例 + View Header + 悬浮工具栏 | mindmaps.nodes, mindmap_nodes | 浅色主题 |
| 项目列表视图 | `/project/:id/list` | 任务列表行 + 筛选栏 | tasks (project scope) | 浅色主题 |
| 项目看板视图 | `/project/:id/board` | 看板三列 + 任务卡片 + 拖拽 | tasks (project scope) | 浅色主题 |
| 全局任务列表 | `/global-tasks` | 全局任务行 + 筛选栏 + 分组切换 | tasks (user scope) | 浅色主题 |
| 全局看板视图 | `/global-tasks/board` | 看板三列 + 项目色卡片 | tasks (user scope) | 浅色主题 |
| 设置 | `/settings` | 账户/主题/存储管理面板 | users, local storage | 浅色/深色 |

### 路由守卫
- 未登录用户访问任何 `/project/...` 或 `/global-tasks` → 重定向到 `/`
- 未登录用户访问 `/` → 显示空状态引导（无需登录即可体验）
- 登录后首次进入 → 加载最近打开的项目

---

## 8. 设计 Token（锁定）

### 8.1 主色
- **主交互色**：`#4F46E5` (indigo-600)
- **优先级色**：高 `#EF4444` / 中 `#F59E0B` / 低 `#3B82F6`

### 8.2 字体
- **全局**：Inter + Noto Sans SC + PingFang SC fallback
- **等宽**：JetBrains Mono（时间戳/数值）

### 8.3 图标库
- **Lucide**（16/20/24px 三档，无 emoji）

### 8.4 6 项目色池
| 编号 | Token | 色值 |
|---|---|---|
| Project-1 | `--project-indigo` | `#4F46E5` |
| Project-2 | `--project-teal` | `#0D9488` |
| Project-3 | `--project-amber` | `#D97706` |
| Project-4 | `--project-rose` | `#BE123C` |
| Project-5 | `--project-emerald` | `#059669` |
| Project-6 | `--project-violet` | `#7C3AED` |

### 8.5 主题
- 浅色：bg `#F8FAFC`, surface `#FFFFFF`, text `#0F172A`
- 深色：bg `#0B0F19`, surface `#111827`, text `#F1F5F9`

### 8.6 侧边栏结构（用户最终确认版）
```
顶部: 全局任务入口（工作台）
  ↓ 分隔线
中部: 项目区（最多20项，可拖拽排序）
  ↓ 分隔线
底部: 系统区（设置/帮助）
```

---

## 9. 验收标准（锁定——QA 测试时以此为唯一依据）

| 编号 | 功能 | Given | When | Then |
|------|------|-------|------|------|
| AC-1 | 创建节点 | 用户在思维导图画布 | 按 Enter / 点击按钮 | 创建同级兄弟节点，光标进入编辑态 |
| AC-2 | 节点任务化 | 用户选中普通节点 | 点击"转为任务" | 节点出现复选框+截止日期+优先级，任务出现在看板 To Do |
| AC-3 | 拖拽改状态 | 用户在看板 To Do 列 | 拖拽卡片到 Done | 卡片移到 Done，导图节点显示完成态 |
| AC-4 | 双向同步 | 用户取消已勾选复选框 | 操作完成后 | 看板卡片自动移回 To Do |
| AC-5 | 数据持久化 | 用户已有项目和任务 | 刷新浏览器 | 导图和看板状态与刷新前完全一致 |
| AC-6 | 创建项目 | 用户在侧边栏 | 点击"+ 新建项目"并输入名称 | 侧边栏出现新项目，画布切换到空白导图 |
| AC-7 | 项目切换 | 用户有多个项目 | 点击侧边栏项目 B | 画布显示项目 B 的导图，顶部更新名称 |
| AC-8 | 数据隔离 | 用户有项目 A 和 B | 在 A 创建节点后切换到 B | B 的画布中没有 A 的任何数据 |
| AC-9 | 全局任务聚合 | 用户有 A(2任务)+B(3任务) | 点击"全局任务" | 显示5个任务，每个带项目名称和颜色 |
| AC-10 | 全局筛选 | 用户在全局任务视图 | 选择"项目 = A" | 列表只显示 A 的2个任务 |
| AC-11 | 全局看板分色 | 用户在全局看板 | 查看卡片 | A 卡片蓝色边框/标签，B 卡片绿色 |
| AC-12 | 全局↔项目同步 | 用户在全局看板将 A 的任务拖到 Done | 操作完成后 | A 的导图节点和项目看板同步显示完成态 |
| AC-13 | 全局定位跳转 | 用户在全局列表点击任务 | 点击后 | 自动切换到对应项目导图并高亮该节点 |
| AC-14 | 数据隔离（RLS） | 用户 A 已登录 | 尝试通过 API 访问用户 B 的数据 | 返回 403，数据不可见（QA 通过直接查 DB 验证） |

---

## 10. 边界与约束

- **浏览器**：Chrome/Edge/Firefox/Safari 最新 2 版本
- **最小分辨率**：1280×720，低于此显示宽度警告
- **项目上限**：20 个（性能红线）
- **节点上限**：单个项目 1000 节点
- **嵌套层级上限**：10 层
- **文本长度限制**：节点 2000 字符
- **IndexedDB 上限**：~50MB，触及 40MB 时提醒
- **性能红线**：
  - 首次加载 < 2s
  - 节点操作响应 < 100ms
  - 看板拖拽同步 < 200ms
  - 项目切换 < 300ms
  - 全局聚合（10项目×100任务）< 1s
- **离线**：基础功能完全离线可用，联网后自动同步

---

## 11. 变更记录

| 日期 | 变更内容 | 原因 | 影响范围 |
|------|----------|------|----------|
| 2026-07-03 | 三文档 v1.0 初版 | 初始调研完成 | PRD + ARCHITECTURE + UIUX |
| 2026-07-03 | 三文档 v1.1 — 增加多项目 + 全局任务 | 用户新需求 | 增加 `projects` 表为顶层实体，4项 → 6项 MVP |
| 2026-07-03 | Spec v1.1.0 — 锁定全部范围 | 用户确认 | 生成 Spec 文档 |
| 2026-07-03 | Spec v1.1.1 — 补 RLS SQL + 数据主从策略 | 用户数据安全确认 | Architecture §7 RLS Policy + §6 数据主从策略 |
| 2026-07-03 | UIUX — 侧边栏结构调整 | 用户偏好：全局任务置顶 | Sidebar Section 顺序 |

---

> **Spec 状态**：已锁定。开发过程中任何超出此 Spec 的功能新增，必须走变更流程。
