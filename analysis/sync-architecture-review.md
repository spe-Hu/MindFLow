# MindFlow 同步架构深度审查报告

> **审查范围**：Supabase（云端）↔ Dexie/IndexedDB（本地）双向同步
> **审查日期**：2026-07-24
> **文件范围**：`src/lib/sync.ts`、`src/stores/syncStore.ts`、`src/lib/db/`、`src/components/sync/`、`supabase/migrations/`

---

## 一、执行摘要

当前 MindFlow 的同步方案在**单设备 + 始终在线**场景下基本可用，但在**多端同步**和**离线-恢复**场景下存在**结构性缺陷**，已多次导致真实 Bug（004/006 migration 修复、task 并发竞态、stale `data_change` 覆盖等）。核心问题是：**缺少增量同步机制、缺少冲突解决策略、缺少实时通知机制**。当前方案本质上是一个"定时全量覆盖"模式，无法满足多端数据一致性要求。

---

## 二、当前架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        同步架构全景                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────┐                    ┌─────────────┐                   │
│   │  Device A│                    │  Device B   │   ← 多端场景      │
│   │ (浏览器)  │                    │ (浏览器)     │                   │
│   └────┬─────┘                    └──────┬──────┘                   │
│        │                                  │                         │
│        ▼                                  ▼                         │
│   ┌──────────────────────────────────────────────────┐             │
│   │              Supabase PostgreSQL (云端)            │             │
│   │  projects / mindmaps / tasks / mindmap_nodes     │             │
│   │  RLS + 全量 upsert + select('*')                  │             │
│   └──────────────────────────────────────────────────┘             │
│                              ▲                                      │
│                              │                                      │
│   ┌──────────┐         ┌─────┴─────┐          ┌──────────┐        │
│   │ Dexie    │         │ Supabase  │          │ Dexie    │        │
│   │ IndexedDB│◄───────►│ Client    │◄────────►│ IndexedDB│        │
│   └──────────┘         └───────────┘          └──────────┘        │
│                                                                     │
│   同步模式：定时全量双向（Push → Pull，Last-Write-Wins）             │
│   触发时机：App 启动(2s)、窗口聚焦、网络恢复                          │
│   最小间隔：30s + 500ms 防抖                                         │
│   冲突策略：无 — 直接以云端为准覆盖本地                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 关键链路

| 阶段 | 实现 | 文件 |
|------|------|------|
| 本地写操作 | `db.xxx.put()` → 立即 `syncXxxToCloud()` | `projectRepo.ts`, `taskRepo.ts`, `ProjectMindMapPage.tsx` |
| 定时全量同步 | `doAutoSync()`: push 全部 → pull 全部 → 覆盖本地 | `syncStore.ts` |
| 迁移弹窗 | 登录后检测本地数据，提供上传/恢复/跳过 | `SyncMigrationDialog.tsx` |
| 状态指示 | idle/syncing/error/offline 四种状态 Toast | `SyncStatusIndicator.tsx` |
| 本地文件同步 | Native File System API + 5s 轮询（仅 Obsidian） | `localFileSync.ts`, `localSyncEngine.ts` |

---

## 三、缺陷清单（按严重程度）

### 🔴 P0 — 数据丢失/覆盖风险

#### P0-1: 无真正的冲突解决机制 — Last-Write-Wins 导致数据丢失

**表现**：多设备同时离线编辑后联网同步，后同步的设备会覆盖先同步的修改。

**根因**：
- `doAutoSync` 的 Pull 阶段直接删除本地多余记录并以云端为准覆盖（`syncStore.ts:126-149`）
- 没有任何 timestamp/version 比较逻辑
- `syncXxxToCloud` 的 `updated_at` 是前端生成的新时间戳，不是"最后修改时间"
- `version` 字段存在于 schema 但从未用于条件更新

**代码**：
```typescript
// syncStore.ts:126-149 — Pull 阶段直接覆盖本地
await db.transaction('rw', [db.projects, db.mindmaps, db.tasks], async () => {
  const localIds = (await db.projects.toArray()).map((p) => p.id)
  const cloudIds = new Set(cloud.projects.map((p) => p.id))
  const toDelete = localIds.filter((id) => !cloudIds.has(id))
  if (toDelete.length > 0) await db.projects.bulkDelete(toDelete)
  await db.projects.bulkPut(cloud.projects)  // ← 直接覆盖，不比较
})
```

**影响面**：所有多设备用户，所有离线后恢复联网场景。

#### P0-2: 全量同步 = 性能灾难 + 网络浪费

**表现**：数据量稍大时同步超时、UI 卡顿。

**根因**：
- `doAutoSync` 每次都要读取本地所有表 → 逐个 upsert → 拉取云端所有数据 → 全量对比删除 → 批量写入
- `fetchAllFromCloud` 无任何分页：`select('*')` 直接拉全表（`sync.ts:260-268`）
- task 数量不是问题，但 mindmap 的 `tree_data` JSONB 可能很大

**量化**：假设 50 个项目，每个 tree_data 500KB → 每次 sync 传输 25MB+。

#### P0-3: 乐观锁 `version` 字段完全未启用

**表现**：并发编辑时（同一用户多 tab）可能产生不可预期的数据覆盖。

**根因**：
- schema 定义了 `projects.version` 和 `mindmaps.version`，默认 1
- `syncProjectToCloud` 的 upsert 没有 `WHERE version = ?` 条件
- 增量版本号只在本地自增，从未参与云端并发控制

#### P0-4: 删除操作的两阶段不一致风险

**表现**：本地已删但云端未删，或反之。

**根因**：
- `deleteProject()` 先删本地再删云端，中间失败会导致不一致
- 没有"软删除 + 同步删除标记"机制
- `doAutoSync` Pull 阶段的 diff-delete 逻辑只能处理"云端不存在"的情况，不能处理"云端已删但本地仍在"

---

### 🟠 P1 — 同步不及时 / 同步失败

#### P1-1: 无 Supabase Realtime 订阅 — 其他设备修改完全无感知

**表现**：在设备 A 上修改，设备 B 必须等待窗口切换或网络重连才能看到。

**根因**：
- `supabase.ts:19-23` 配置了 `realtime: { eventsPerSecond: 10 }` 但代码中没有任何 `supabase.channel().on().subscribe()` 调用
- 检查确认：全局搜索无任何 realtime 订阅代码

**用户体验**：多端场景下，用户在设备 B 上看到的是"过期数据"，编辑时极易产生覆盖冲突。

#### P1-2: 同步触发时机过于稀疏

**表现**：连续编辑后长时间不触发同步，用户以为已同步但实际上没有。

**根因**：
| 触发时机 | 条件 | 问题 |
|----------|------|------|
| App 启动 | 延迟 2s，且只执行一次 | 快速操作根本等不到 |
| 窗口聚焦 | `visibilitychange === 'visible'` | 后台标签页永远不会触发 |
| 网络恢复 | `online` 事件 | 正常在线时不触发 |
| 30s 防抖 | `MIN_SYNC_INTERVAL_MS` | 编辑密集时被抑制 |

**缺失的触发时机**：
- 编辑完成后的 debounce 自动同步（如 3s 无编辑触发）
- 手动保存/切换页面时强制同步
- 关闭页面前 `beforeunload` 同步

#### P1-3: 缺少脏标记 / 变更队列

**表现**：无关紧要的操作（如只改变了 `sort_order`）也被推送到云端。

**根因**：
- 除了 Obsidian 项目的 `_dirtyProjectIds`，云端同步没有任何 dirty tracking
- `upsertProject` → 总是 full sync
- `syncTasksFromTree` → 总是先 `delete()` 所有 task 再 `bulkPut()`，触发 N 次云端同步
- 没有区分 Create / Update / Delete 操作类型

#### P1-4: `syncTaskToCloud` schema fallback 是症状而非病因

**表现**：003/004/006 migration 多次修复后仍然可能遇到 schema 不匹配。

**根因**：
- 前端代码假设云端 schema 必然与本地字段一一对应
- fallback 链（完整 payload → 去掉 attachments → 去掉 pomodoro_count → 核心字段）是一种 hack
- 正确的做法：前端 upsert 时应明确指定云端确认存在的字段，或云端使用 `jsonb` 存储扩展字段

---

### 🟡 P2 — 架构设计缺陷

#### P2-1: `mindmap_nodes` 表完全未使用

**根因**：schema 定义了完整的节点扁平化表（`001_initial_schema.sql:137-166`），但代码中没有任何 CRUD 使用。
- 所有节点数据只存储在 `mindmaps.tree_data` JSONB 中
- 无法对单个节点做增量同步
- `mindmap_nodes` 表的设计初衷（扁平化便于查询和同步）完全没有实现

#### P2-2: `taskTreeSync.ts` 的"全删全插"模式

**代码**：
```typescript
// taskTreeSync.ts:50-55
await db.transaction('rw', db.tasks, async () => {
  await db.tasks.where('project_id').equals(projectId).delete()
  if (tasks.length > 0) {
    await db.tasks.bulkPut(tasks)
  }
})
```
- 每次 mindmap data_change 都删除全部 task 再重新插入
- 丢失了 task 的独立属性（如 `pomodoro_count` 做了特殊 preserve）
- 任务 ID 是 `${projectId}-${uid}`，如果 uid 变了 task 就变了

#### P2-3: `localStorage` 的 `last-sync-time` 不可靠

**根因**：
- 全局 `mindflow-last-sync-time` 没有按用户区分
- 不同设备的时间可能不同步
- 这个时间戳不能用来做增量判断（`syncStore.ts:66, 72, 157`）

#### P2-4: 错误恢复和离线队列缺失

**表现**：网络恢复后，离线期间的修改不会自动补偿同步。

**根因**：
- `syncXxxToCloud` 的 catch 只是 `devWarn`，没有入队重试
- `doAutoSync` 收集 push errors 但不重试
- 没有"离线期间变更日志"概念
- `SyncMigrationDialog` 只处理首次登录，不处理断网恢复

#### P2-5: 时序竞态问题

**根因**：
- `handleDataChange` 是 async 回调，包含 DB 读取+更新+云端同步三步，中间可能被新的 data_change 打断
- Bug 5 和 Bug 6 已经修复过相关问题（stale data_change 覆盖、并发竞态），但底层模式没变
- `scheduleAutoSync()` 是模块级防抖，多 tab 场景下可能竞争

---

## 四、多端同步场景的特殊问题

### 场景 1：双设备同时在线编辑

```
Device A                    Device B
   |                           |
   ├── 修改 Project X name ───►|  (Realtime 无通知，B 看不到)
   |                           ├── 也修改 Project X name
   |                           |    (基于过期数据)
   ├── scheduleAutoSync()      |
   |   Push → 云端 name=A      |
   |                           ├── scheduleAutoSync()
   |                           |   Push → 云端 name=B
   |                           |   Pull → 本地被覆盖为 A
   ├── 窗口聚焦                |
       Pull → 本地被覆盖为 B   │
```

**结果**：两次修改都"成功"上传到云端，但最终数据取决于最后一次 Pull 的顺序，用户的修改实际上丢失了。

### 场景 2：设备离线编辑后恢复

```
Device A (在线)             Device B (离线 2 小时)
   |                           |
   └── 正常同步 ───────────────►| X 无法同步
   |                           ├── 离线期间大量编辑
   |                           ├── 网络恢复
   |                           ├── Push 全部到云端
   |                           │   (覆盖 Device A 的在线修改)
   └── 窗口聚焦                |
       Pull → 本地被 B 覆盖    │
```

**结果**：Device B 的离线修改覆盖了 Device A 的在线修改，且 Device A 的用户完全不知情。

### 场景 3：Obsidian 本地文件 + 云同步混合

```
本地 .smm.md 文件  ←→  Dexie IndexedDB  ←→  Supabase 云端
        ↑               (当前未桥接)           ↑
        └────────────  两个独立同步域 ──────────┘
```

- Obsidian 同步和 Supabase 同步是两个完全独立的系统
- `localSyncEngine.ts` 的 dirty flag 只在内存中，刷新页面丢失
- 没有机制确保"文件系统 → IndexedDB → Supabase"的一致性

---

## 五、改进方案

### 短期可做的补丁（1-2 周）

#### 5.1 增加 `updated_at` 冲突检测

在 `doAutoSync` 的 Pull 阶段，比较云端 `updated_at` 和本地 `updated_at`，**不同时才覆盖**：

```typescript
// 伪代码：Pull 阶段增加冲突检测
for (const cloudProject of cloud.projects) {
  const localProject = await db.projects.get(cloudProject.id)
  if (!localProject) {
    await db.projects.put(cloudProject) // 新增
  } else {
    const cloudTime = new Date(cloudProject.updated_at).getTime()
    const localTime = localProject.last_opened_at?.getTime() ?? 0
    // 如果云端更新，才覆盖本地
    if (cloudTime > localTime) {
      await db.projects.put(cloudProject)
    }
    // 否则保留本地（本地已更新，等待下一次 Push）
  }
}
```

#### 5.2 Push 阶段改为增量：只推送 `updated_at > lastSyncTime` 的记录

```typescript
const lastSync = new Date(safeGetItem('mindflow-last-sync-time') || 0)
const dirtyProjects = projects.filter(p => 
  (p.last_opened_at?.getTime() ?? 0) > lastSync.getTime()
)
```

#### 5.3 增加 Supabase Realtime 订阅

```typescript
// 在 AppLayout 中初始化
const channel = supabase
  .channel('db-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${userId}` },
    (payload) => {
      // payload.new / payload.old
      // 更新本地 IndexedDB 对应记录
      // 如果本地也有未推送的修改，需要冲突提示
    }
  )
  .subscribe()
```

#### 5.4 增加编辑后 debounce 自动同步

```typescript
// 在 handleDataChange 末尾增加
const { scheduleAutoSync } = useSyncStore.getState()
clearTimeout(editSyncTimer)
editSyncTimer = setTimeout(() => scheduleAutoSync(), 3000) // 3s 无编辑后同步
```

#### 5.5 启用乐观锁（version 字段）

```typescript
// syncProjectToCloud: 使用条件 upsert
const { error } = await supabase
  .from('projects')
  .upsert(payload, { onConflict: 'id' })
  // 可选：配合 RPC 做条件更新
```

### 中期改进（2-4 周）

#### 5.6 引入变更日志表（Change Log / Event Sourcing）

云端新增 `change_log` 表：

```sql
CREATE TABLE change_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  table_name text NOT NULL,      -- projects/mindmaps/tasks
  record_id text NOT NULL,
  operation text NOT NULL,       -- INSERT/UPDATE/DELETE
  payload jsonb NOT NULL,        -- 变更内容
  client_timestamp timestamptz,  -- 客户端时间
  server_timestamp timestamptz DEFAULT now(),
  device_id text                 -- 设备标识
);
```

同步逻辑改为：
1. 本地修改 → 写入本地 change_log
2. Push 时只发送 change_log 条目
3. Pull 时获取云端 change_log 中 `server_timestamp > lastSyncTime` 的条目
4. 本地按顺序 apply changes

优点：
- 天然支持增量同步
- 可回溯历史（最多保留 N 天）
- 冲突解决可以在 change 层面做（字段级合并）

#### 5.7 启用 `mindmap_nodes` 表实现节点级增量同步

当前 `mindmaps.tree_data` 是企业级反模式（单个 JSONB 存储整棵树）。建议：
- 编辑时仍然操作 tree_data（simple-mind-map 要求）
- 但在 `data_change` 时，diff 出变更的节点，同步更新 `mindmap_nodes` 表
- 云端同步时，mindmap 只同步 tree_data 的 metadata，节点变更通过 mindmap_nodes 的 change_log 传输

#### 5.8 引入 Soft Delete + 墓碑机制

```sql
ALTER TABLE projects ADD COLUMN deleted_at timestamptz;
ALTER TABLE tasks ADD COLUMN deleted_at timestamptz;
-- 查询时过滤 deleted_at IS NULL
-- 同步时携带 deleted_at 标记
```

### 长期重构方向（1-2 个月）

#### 5.9 评估 CRDT 方案（如 Yjs / Automerge）

如果强一致性的多端实时协作是核心需求，需要评估：
- 是否将 mindmap tree_data 改为 CRDT 结构
- Yjs 的 Y.Map/Y.Array 可以直接映射到 simple-mind-map 的节点结构
- Supabase 可作为 Yjs 的 persistence provider

#### 5.10 状态机驱动的同步引擎

```
[Idle] ──edit──► [Dirty] ──debounce──► [Pushing] ──success──► [Idle]
                                          │ failure
                                          ▼
                                      [PendingQueue] ──online──► [Pushing]
```

将同步逻辑从散落在各 store/repo/page 中的 ad-hoc 调用，集中到一个状态机驱动的引擎中。

---

## 六、建议的决策路线图

```
Phase 1: 止血（本周）
├── P0-1: doAutoSync Pull 阶段增加 updated_at 比较，不同时才覆盖
├── P0-2: fetchAllFromCloud 增加 limit/offset 分页
├── P1-1: 接入 Supabase Realtime subscription（最小可行为 projects 表）
└── P1-2: 增加编辑后 3s debounce 自动触发 scheduleAutoSync

Phase 2: 改进（2-3 周）
├── 引入云端 change_log 表 + 增量同步逻辑
├── 启用 mindmap_nodes 表，实现节点级增量
├── 离线变更队列（local change_log）
└── Soft delete + 墓碑同步

Phase 3: 重构（1-2 个月）
├── 评估 CRDT 方案（Yjs / Automerge）
├── 状态机驱动的同步引擎
└── E2E 多端同步测试覆盖
```

---

## 七、附录：已修复的历史 Bug（溯源）

| Bug | 根因 | 修复方式 | 是否根治 |
|-----|------|----------|----------|
| #4 `pomodoro_count` 列缺失 | 前端 upsert 含 `pomodoro_count`，云端无该列 | Migration 004 + fallback | ❌ 是 hack |
| #5 task 并发竞态丢失 | `data_change` 多发 + 无互斥锁 | 模块级防抖 + 互斥锁 + 单事务 | ❌ 边界 case 仍存 |
| #6 新建项目名被覆盖 | stale `data_change` 携带默认 root text | stale guard | ❌ 底层模式未变 |
| #10 attachments schema cache 失败 + 状态静默 | 同 #4 | fallback + error 状态不再静默 | ❌ 是 hack |

**共同模式**：这些 Bug 本质上都源于"全量覆盖 + 无变更追踪 + schema 不匹配"的架构问题，短期补丁只能缓解症状。

---

## 八、结论

当前同步方案在 MVP 阶段够用，但要支持真正意义上的多端同步，必须进行**以增量同步 + 冲突解决为核心的架构重构**。最小的可行改进是在 `doAutoSync` 中增加时间戳比较和 Supabase Realtime 订阅，但这只是过渡方案。长期来看，需要引入 Change Log 机制或 CRDT 方案才能根本性地解决多端数据一致性问题。

**当前同步方案成熟度评分**：⭐⭐☆☆☆（2/5）
- 单设备在线：⭐⭐⭐⭐☆
- 单设备离线：⭐⭐⭐☆☆
- 多设备在线：⭐☆☆☆☆
- 多设备离线：⭐☆☆☆☆
