# Spec — MindFlow 同步架构改进方案

> Issue: #sync-rework-v2  
> 生成时间：2026-07-24  
> 状态：`ready-for-agent`  
> 负责人：（待指派）  
> 预计工期：3 阶段，Phase 1 约 2~3 天 / Phase 2 约 1~2 周 / Phase 3 评估项（排期待定）

---

## Problem Statement

当前 MindFlow 的同步方案（Supabase ↔ Dexie/IndexedDB）在**实际使用中频繁出现同步失败、同步不及时、多端数据丢失**的问题。具体表现：

1. **同步经常失败**：前端新增字段（如 `attachments`、`pomodoro_count`）后，若远程 Supabase schema 未及时迁移，PostgREST 会直接拒绝所有含该字段的 upsert，导致全量同步失败。
2. **同步不及时**：触发点仅有 App 启动（延迟 2s，只跑一次）、窗口聚焦、网络恢复。用户在单个窗口内连续编辑大量内容后，只要不切窗口或不掉网，数据不会同步到云端。
3. **多端数据覆盖/丢失**：`doAutoSync` Pull 阶段直接以云端为准覆盖本地，不比较时间戳。设备 A 离线编辑后联网同步，设备 B 随后联网，B 的修改会覆盖 A 的修改。
4. **无增量同步**：每次 sync 全量 push + 全量 pull，`select('*')` 无分页。数据量稍大就超时/卡顿，且浪费大量网络资源。
5. **乐观锁 `version` 完全未生效**：schema 定义了 `projects.version` 但代码里从不检查，同一用户在多个 tab 同时编辑时互相覆盖。
6. **Realtime 是摆设**：配置写了 `eventsPerSecond: 10`，但代码里没有任何 Supabase Realtime subscription，设备 B 完全不知道设备 A 改了什么，只能等窗口切回来再同步。

---

## Solution

用三阶段递进方案重建同步引擎，核心原则是：**冲突可感知、增量可追踪、失败可恢复**。

```
Phase 1（止血）—— 2~3 天
├── Pull 阶段增加 updated_at 比较，云端比本地新才覆盖
├── 接入 Supabase Realtime Postgres Changes subscription
├── 编辑操作完成后 3s debounce 自动触发同步
├── fetchAllFromCloud 加分页（limit/offset）
└── syncTaskToCloud 增加 schema 字段白名单，避免 fallback hack

Phase 2（增量同步 + 离线队列）—— 1~2 周
├── 云端新增 sync_queue / change_log 表 → 记录变更事件流
├── 启用 mindmap_nodes 表（SPEC v1.1 中已定义但未启用）→ 节点级增量
├── 离线变更写入 IndexedDB pending_changes 队列，恢复联网后批量回放
├── 软删除（本地 `is_deleted` + 云端 `deleted_at`）取代物理删除
└── 冲突检测 UI：当检测到 version/updated_at 冲突时弹出「保留本地/保留云端/合并编辑」选择

Phase 3（远期评估）—— 排期待定
├── 评估 Yjs / Automerge (CRDT) 替换当前同步引擎
└── 状态机驱动的同步引擎（idle → syncing → conflict → retry → idle）
```

---

## User Stories

### Phase 1

1. As a user who edits mind map nodes for 5 minutes without switching windows, I want my changes to sync to the cloud automatically, so that I don't lose data if my browser crashes.
2. As a user with two browser tabs open on the same project, I want changes in tab A to appear in tab B within seconds, so that I don't see stale data or cause overwrites.
3. As a user switching between devices, I want the system to compare timestamps before overwriting my local data, so that the most recent edit always wins instead of blindly replacing everything.
4. As a user with 500+ tasks across 10 projects, I want sync to use pagination instead of fetching everything at once, so that it doesn't timeout or freeze the UI.
5. As a developer deploying a new feature with new fields, I want the sync layer to gracefully handle schema mismatches instead of hard-failing the entire sync, so that users don't experience data loss during a rollout.
6. As a user who just came back online after hours of offline editing, I want the sync indicator to show clear progress and final status, so that I know whether my data is safe or needs attention.

### Phase 2

7. As a user editing on a train without network, I want all my changes queued locally and automatically uploaded when I reconnect, so that I never have to remember to sync manually.
8. As a user who accidentally deleted a task while offline, I want the delete to be reversible before it reaches the cloud, so that I can undo mistakes during the offline window.
9. As a user who edited the same node on device A (offline) and device B (online), I want a clear conflict resolution UI when both come online, so that I can choose which version to keep instead of silently losing one.
10. As a user with many projects, I want sync to only transfer changed records instead of the entire dataset, so that it completes in under 1 second even for large accounts.
11. As a user checking my task list on a second device immediately after creating a task on the first, I want the task to appear there within 2 seconds, so that the multi-device experience feels seamless.
12. As a user archiving old projects, I want archived data to remain accessible locally without blocking sync of active projects, so that my daily sync stays fast.

### Phase 3

13. As a user collaborating with a teammate on a shared project, I want real-time cursor awareness and conflict-free concurrent editing, so that we can brainstorm together without stepping on each other's changes.

---

## Implementation Decisions

### 1. Sync Engine Module Boundaries

- **`syncStore`** (Zustand store)：全局同步状态机。状态：`idle` | `pushing` | `pulling` | `syncing` | `error` | `offline`。暴露 `scheduleAutoSync()`、`triggerImmediateSync()`、`resolveConflict(strategy)`。
- **`syncEngine`** (module)：核心同步逻辑。职责：编排 push/pull/full-sync 流程，管理 debounce，处理错误分类（retryable vs fatal）。
- **`cloudSync`** (module)：Supabase 网络层封装。职责：所有 Supabase API 调用（upsert/select/delete/realtime subscribe），字段白名单过滤，分页遍历，错误解析。
- **`offlineQueue`** (module)：IndexedDB 离线变更队列。职责：在接受用户操作时判断是否在线，离线则将变更序列化为操作记录（CRUD + target + payload + timestamp），恢复联网后批量回放。
- **`conflictResolver`** (module)：冲突检测与 UI 触发。职责：对比本地/云端 `updated_at` + `version`，当检测到冲突时向 `syncStore` 提交冲突事件，由 UI 层弹出 Modal。

### 2. Submodule Interfaces

#### `syncEngine`

```ts
interface SyncEngine {
  // 触发一次完整同步（push → pull），返回是否成功
  sync(): Promise<boolean>;
  // 仅推送本地变更到云端
  push(): Promise<PushResult>;
  // 仅拉取云端变更到本地
  pull(): Promise<PullResult>;
  // 注册一个数据源（projects/mindmaps/tasks）
  registerSource(source: SyncSource): void;
}

interface PushResult {
  pushed: number;
  failed: Array<{ id: string; error: string }>;
  retryable: boolean;
}

interface PullResult {
  pulled: number;
  conflicts: Conflict[];
}

interface Conflict {
  table: string;
  id: string;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
  localVersion: number;
  cloudVersion: number;
}
```

#### `cloudSync`

- 所有 upsert 操作必须经过**字段白名单过滤**——前端维护一个 `cloudKnownFields` 映射（table → Set<string>），只发送云端确认存在的字段。白名单通过 Supabase 元数据查询或本地 hardcode 维护。
- `fetchAllFromCloud` 实现分页：`range(from, to)` 循环直到无数据，每页 500 条。
- Realtime subscription：订阅 `db:projects`、`db:mindmaps`、`db:tasks` 的 Postgres Changes（`INSERT`、`UPDATE`、`DELETE`），收到变更后触发 `pull()`。

#### `offlineQueue`

- IndexedDB 表：`pending_changes`
- Schema：`{ id, operation: 'create'|'update'|'delete', table, recordId, payload, createdAt, retryCount }`
- 恢复联网后批量回放：按 `createdAt` 顺序逐条执行，每批最多 50 条，失败项标记重试次数，超过 3 次则进入 `failed_changes` 待人工处理。

### 3. Conflict Resolution Strategy

冲突检测规则（Pull 阶段逐条比较）：

```
IF local.updated_at == cloud.updated_at:
    IF local.version == cloud.version:
        → no conflict, skip
    ELSE:
        → concurrent conflict (same timestamp, different version)
        → queue for user resolution
ELIF local.updated_at > cloud.updated_at:
    → local is newer, overwrite cloud (push in next sync)
ELIF cloud.updated_at > local.updated_at:
    → cloud is newer, overwrite local
```

> **为什么这样设计**：前三个 `ELIF` 已穷尽 `updated_at` 的所有可能（`>`、`<`、`==`），第四个条件中的 `local.updated_at != cloud.updated_at` 在此上下文中恒为 `false`，永远不可达。真正的并发冲突只发生在 `updated_at` 相同但 `version` 不同的情况——这意味着两台设备同时编辑并提交，时间戳恰好相同。

用户选择策略：
- `local` — 强制推送本地版本
- `cloud` — 强制接受云端版本
- `merge` — 对 tasks/mindmaps 做字段级合并（双方修改的不同字段合并，同字段取更新的）

### 4. Auto-Sync Debounce 策略

- **编辑触发**：用户完成一次有意义的编辑（节点增删改、任务状态变更、看板拖拽）后，3s debounce 触发 `syncEngine.push()`。
- **聚焦触发**：窗口获得焦点时，检查 `lastSyncAt`，若超过 30s 则触发完整 sync。
- **网络恢复触发**：从 offline 变为 online 时，先回放 `offlineQueue`，然后触发完整 sync。
- **Realtime 触发**：收到 Realtime 事件时，延迟 500ms 聚合多个事件后触发 `pull()`。
- **最小间隔**：任意两次完整 sync 间隔 ≥ 30s（防抖动）。

### 5. Schema Changes (Supabase Migrations)

```sql
-- 007: 启用 change_log 表
CREATE TABLE change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_change_log_user_created ON change_log(user_id, created_at);

-- 008: 为 projects/mindmaps/tasks 增加 deleted_at 软删除
ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE mindmaps ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMPTZ;

-- 009: 启用 mindmap_nodes 表（SPEC v1.1 已定义）
-- （已有 migration 001 定义但未启用，需要补充 created_at/updated_at）
ALTER TABLE mindmap_nodes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE mindmap_nodes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
```

### 6. Sync Source Registration

当前 `sync.ts` 中 hardcode 了 projects/mindmaps/tasks 三套 push/pull 逻辑。改为声明式注册：

```ts
syncEngine.registerSource({
  name: 'projects',
  localStore: projectStore,
  cloudTable: 'projects',
  primaryKey: 'id',
  toCloud: (record) => whitelistFields(record, PROJECT_CLOUD_FIELDS),
  fromCloud: (record) => ({ ...record, syncedAt: now() }),
});
```

这样新增数据源（如 `mindmap_nodes`、`tags`）只需注册一行，无需修改 sync.ts 核心逻辑。

**与现有 `syncTasksFromTree` 的关系**：

`tasks` 数据在 MindFlow 中有两种来源：
1. **看板/列表页**：用户直接在 Task 界面创建/编辑任务 → 通过 `taskStore` 写入 Dexie，正常走 `registerSource` 的 push 流程。
2. **思维导图页**：用户在 mindmap 节点上点击「转为任务」→ `mindmap data_change` 事件触发 `syncTasksFromTree` → 从 mindmap 的 JSON 树中解析出 task 记录并写入 Dexie。

**Phase 1 不改变这个数据流**。`syncTasksFromTree` 继续由 simple-mind-map 的 `data_change` 事件驱动，写入 Dexie 后 Dexie 的写入 hook 自动设置 `_localDirty = true`，后续被 `syncEngine.push()` 捕获推送。

Phase 1 的 `registerSource` 把 `sync.ts` 中现有的三套硬编码循环（`for...of projects` / `for...of mindmaps` / `for...of tasks`）改为声明式注册，**数据流本身不变**。Phase 2 启用 `mindmap_nodes` 表后，`mindmaps` 和 `tasks` 的派生关系再重新设计。

### 7. Error Classification & Retry

```ts
type SyncError =
  | { type: 'SCHEMA_MISMATCH'; field: string }      // 字段不存在 → fallback 去掉该字段重试
  | { type: 'NETWORK'; retryable: true }             // 网络错误 → 指数退避重试（1s, 2s, 4s, 8s）
  | { type: 'AUTH'; retryable: false }               // 认证失败 → 标记需要重新登录
  | { type: 'CONFLICT'; details: Conflict }          // 版本冲突 → 进入 conflictResolver
  | { type: 'RATE_LIMIT'; retryable: true; after: number }; // 限流 → 延迟 after ms 重试
```

### 8. Realtime Subscription

```ts
supabase
  .channel('db-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${uid}` }, handleProjectChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'mindmaps', filter: `user_id=eq.${uid}` }, handleMindmapChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${uid}` }, handleTaskChange)
  .subscribe();
```

收到变更事件后：
1. 更新 `syncStore.lastRemoteChangeAt`
2. 延迟 500ms 聚合多个事件
3. 触发 `syncEngine.pull()`
4. 更新 UI store（避免整页刷新）

### 9. pending_changes Queue Schema

Phase 2 离线队列的 IndexedDB 表结构：

```ts
interface PendingChange {
  id: string;          // ULID / autoIncrement
  operation: 'create' | 'update' | 'delete';
  table: string;       // 'projects' | 'mindmaps' | 'tasks'
  recordId: string;    // 对应记录的主键
  payload: any;        // 变更内容（delete 时为 null）
  createdAt: string;   // ISO 8601
  retryCount: number;  // 回放失败次数（≥3 次后转入 failed_changes）
}

// Dexie 表定义（追加到现有 db schema）
class MindFlowDB extends Dexie {
  // 现有表...
  pending_changes!: Dexie.Table<PendingChange, string>;
  failed_changes!: Dexie.Table<PendingChange, string>;
}
```

**回放约束**：
- 按 `createdAt` 顺序逐条执行，不可乱序。
- 每条回放前检查目标记录的 `updated_at`，若本地已被后续编辑覆盖（本地 updated_at > change.createdAt），则跳过该条（幂等保护）。
- **Dexie 事务保护**：回放过程中如果用户继续编辑，必须在同一事务中完成 pending_changes 删除 + 目标表写入 + dirty flag 设置，防止并发 rupture。

### 10. Dirty Flag & Push Granularity

Phase 1 不解决增量 push（仍需走全量遍历），但引入 **dirty flag** 减少无用上传：

```ts
// 每个 record 新增本地字段
interface SyncableRecord {
  // ... 原有字段
  _localDirty?: boolean;     // 自上次成功 push 后是否被本地修改过
  _dirtyFields?: Set<string>; // 具体哪些字段被修改（Phase 2 增量用）
}
```

**规则**：
- 用户每次编辑写入 Dexie 时，自动设置 `_localDirty = true`，并记录 `updated_at = now()`、`version++`。
- `syncEngine.push()` 阶段只筛选 `_localDirty === true` 的记录推送，push 成功后清除 dirty flag。
- 未 dirty 的记录跳过，不发送网络请求。

**为什么 Phase 1 不做字段级增量**：`tasks` 表的 `tree_data` 是整棵 JSON 树，字段级增量对 mindmap 无效。Phase 2 启用 `mindmap_nodes` 表后，可对独立节点做逐字段增量。

### 11. Timestamp Comparison Strategy

`updated_at` 的比较需要解决精度差异：

| 来源 | 精度 | 示例 |
|------|------|------|
| 本地 Dexie | `Date.now()` 毫秒 | `1753332345123` |
| PostgreSQL `TIMESTAMPTZ` | 微秒（μs） | `2026-07-24 12:05:23.123456+08` |
| Supabase JS 返回 | ISO 8601 字符串 | `"2026-07-24T12:05:23.123456+08:00"` |

**比较函数**：

```ts
function isNewerThan(localAt: string, cloudAt: string): boolean {
  const a = new Date(localAt).getTime();
  const b = new Date(cloudAt).getTime();
  const EPSILON = 500; // 容忍 500ms 误差（时钟漂移 + 序列化损耗）
  return a > b + EPSILON;
}
```

- `local.updated_at == cloud.updated_at` 定义为 `Math.abs(a - b) <= EPSILON`。
- 极端情况：两台设备在 500ms 内各自编辑同一记录 → 会被判定为 `updated_at` 相同，落入 `version` 冲突检测分支（由用户弹窗裁决）。

### 12. Version Increment Strategy

`version` 字段的职责：只检测并发冲突，不参与 LWW 决策。

**递增规则**：
- 每次本地写入（`update`/`put`）时，`version = (record.version ?? 0) + 1`。
- 云端更新时**不递增** version（云端不感知 version，version 是本地乐观锁）。
- Pull 阶段若需覆盖本地，保持本地 version 不变（因为这只是接收云端数据，不是本地编辑）。
- 覆盖本地时 `updated_at` 同步更新为云端值，version 保持不变，下次本地编辑时自动 `+1`。

```ts
// 本地写入前的 hook（在 Dexie put/update 中注入）
function beforeLocalWrite(record) {
  record.updated_at = new Date().toISOString();
  record.version = (record.version ?? 0) + 1;
  record._localDirty = true;
}

// Pull 阶段覆盖本地时
function overwriteLocal(cloudRecord, localRecord) {
  const merged = { ...cloudRecord, version: localRecord.version };
  // version 不变，updated_at 用云端值
}
```

---

## Testing Decisions

### 现有 E2E 测试的类型与局限

现有 15 个 journey + `sync-fallback.spec.ts` 全部是 **mock-based E2E**，按数据来源分为两类：

| 类型 | 代表文件 | 说明 | 能验证什么 | 不能验证什么 |
|------|---------|------|-----------|------------|
| **纯本地模式** | journey-1~8, 10~15 | `clearIndexedDB` + 点击"离线使用"，所有数据在 IndexedDB，`sync.ts` 中的云端逻辑被短路 | 前端 UI、Dexie 存储、simple-mind-map 交互 | 任何云端行为 |
| **Mock 云端** | journey-9, sync-fallback.spec.ts | `injectMockSession` + `page.route` 拦截 Supabase REST API，返回固定响应 | 前端 `syncStore` 状态流转、UI toast、按钮 disabled 态 | 真实后端数据一致性、RLS policy、Realtime、并发冲突 |

**核心问题**：现有 E2E 不验证「前端写入 Supabase → Supabase 真实入库 → 另一前端真实读到」这条完整链路。这也是 sync 相关 bug（schema mismatch 全军覆没、Pull 覆盖本地数据、Realtime 不工作）能在生产环境出现但 E2E 全绿的根本原因。

### 新增 E2E 层级：真实后端 E2E（Backend-Integrated E2E）

Phase 1~2 需要新增 **一个独立的真实后端 E2E 套件**，与现有 mock E2E 并行：

```
tests/e2e/
├── all-journeys.spec.ts        # 现有 15 journey（mock，保持）
├── sync-fallback.spec.ts       # 现有 schema fallback 测试（mock，保持）
└── backend-integration/        # 新增：真实后端 E2E
    ├── setup.ts                # 测试环境初始化：创建测试账户、清理数据
    ├── teardown.ts             # 测试环境清理：删除测试账户全部数据
    ├── auth-helper.ts          # 真实登录/登出 helper
    ├── journey-16-auto-sync.spec.ts     # 自动同步触发
    ├── journey-17-conflict.spec.ts      # 多设备冲突
    ├── journey-18-offline-queue.spec.ts # 离线队列
    └── journey-19-realtime.spec.ts      # Realtime 即时同步
```

#### 真实后端 E2E 的基础设施

| 依赖 | 说明 |
|------|------|
| `SUPABASE_URL` | 环境变量，指向真实 Supabase 项目 |
| `SUPABASE_SERVICE_ROLE_KEY` | 环境变量，测试 setup/teardown 用（绕过 RLS 清理数据）|
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | 环境变量，预注册的测试账户 |
| `@supabase/supabase-js` | 在测试代码中直接调用后端 API 做断言（`supabase.from('tasks').select()`）|
| `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)` | 在 browser context 中真实初始化 supabase，不走 mock |

**数据隔离策略**：每次测试执行前，`setup.ts` 用 service role key 删除该测试账户的所有 `projects`、`mindmaps`、`tasks`、RLS policy 不保护但后续需清理的 `change_log` 记录。测试名称编码在 project name 中，确保不跨测试污染。

#### 测试模块详情

**Mock E2E（现有，继续维护）**

1. **Mock — 自动同步触发**：编辑节点 → 等待 debounce → `page.route` 验证 POST 请求被发出（body 包含正确字段）。不涉及后端。
2. **Mock — 字段白名单降级**：含未知字段的 upsert → 第一次 400 → 去掉字段重试 → 200。验证前端 fallback 逻辑。
3. **Mock — 离线禁用 UI**：`navigator.onLine = false` → 按钮 disabled → toast 显示离线。验证 UI 响应。

**真实后端 E2E（新增）**

4. **Backend — 真实写入读取**：在浏览器 A 创建项目 + 节点 + 转任务 → 3s debounce 后 → 用 `supabase-js` 直接查 DB 确认记录存在且字段正确 → 浏览器 B（新 context）打开同一账户 → 确认数据已同步展示。这是验证 **`push → Supabase 入库** 链路的唯一方法。
5. **Backend — 冲突检测**：浏览器 A 断网编辑节点标题 → 浏览器 B 在线编辑同一节点 → A 恢复联网 → 验证 `syncStore` 进入 `conflict` 状态，弹窗出现，用户选择后 DB 数据符合选择结果。两个浏览器共享同一测试账户，通过 `localStorage` 注入相同的真实 session。
6. **Backend — 离线队列回放**：`context.setOffline(true)` → 创建 5 个任务 → `context.setOffline(false)` → 验证 DB 中新增 5 条 task 记录，且 `pending_changes` 队列为空。
7. **Backend — Realtime 即时同步**：浏览器 A 编辑任务标题 → 不操作浏览器 B → 验证浏览器 B 在 2s 内自动收到数据更新（通过 DOM 文本变化检测）。**这是验证 Realtime subscription 真正接通的唯一方法**。
8. **Backend — RLS 数据隔离**：用户 A 的 session 尝试通过 `supabase-js` 直接查询用户 B 的数据 → 验证返回空数组（403）。
9. **单元 — Error Classification**：在 `syncEngine` 层注入各种 Supabase 错误响应（network/auth/rate-limit/400/409），验证分类器和重试策略。
10. **单元 — 字段白名单过滤函数**：输入含未知字段的 record → 验证输出仅包含白名单字段。

### Test Seams 选择

- **Mock E2E seam**：复用现有 `page.route` + `injectMockSession` 模式。局限：只能验证前端发出的 HTTP 请求形态，不验证后端真实行为。
- **真实后端 E2E seam**：`browser.newContext({ storageState })` + 真实 `supabase-js` client + `SUPABASE_SERVICE_ROLE_KEY` 直接 DB 断言。这是唯一能验证前后端耦合的方式。

两个 seam 同时存在，互为补充。Mock E2E 保证前端逻辑不因小改动而崩（跑得快，CI 常驻）；真实后端 E2E 保证 sync 架构在真实环境中真的工作（跑得慢，CI nightly 或 pre-release 跑）。

### Prior art

- 现有 `tests/e2e/journey-9.ts`：mock 云端同步 UI 流程（登录、上传、下载），可作为 mock E2E 模板继续复用，**但不能替代真实后端测试**。
- 现有 `tests/e2e/sync-fallback.spec.ts`：mock schema fallback，验证前端重试逻辑，同样不涉及真实后端。
- `tests/e2e/helpers.ts` 的 `focusNodeByText` 和 store expose 模式（`window.__pomodoroStore`）继续复用。
- **新增参考**：Playwright 官方多设备测试示例（`browser.newContext()` + `storageState`）+ Supabase 官方测试最佳实践（service role key 清理数据）。

---

## Out of Scope

1. **多人实时协作 CRDT 完整实现** — Phase 3 为评估项，不在本次实施范围内。当前仅做 Phase 1~2。
2. **移动端原生 App 同步** — 仍保持响应式网页方案，不涉及 iOS/Android 原生层。
3. **端到端加密 (E2EE)** — 传输层已使用 HTTPS，不涉及客户端加密方案。
4. **数据压缩/二进制序列化** — 当前 JSON 传输已足够，暂不引入 MessagePack/Protobuf。
5. **跨账户数据迁移** — 不涉及将用户 A 的数据迁移到用户 B。
6. **物理删除的 hard delete 保留** — 软删除后云端 `deleted_at` 保留历史记录，但不提供用户级数据恢复 UI（可通过 Supabase Dashboard 手动恢复）。

---

## Further Notes

### 关于 `version` 乐观锁

SPEC v1.1 设计时定义了 `projects.version` 但作为乐观锁，但代码从未使用。Phase 1 中将其改为**双重校验**：`updated_at` 用于 Last-Write-Wins，`version` 用于检测并发冲突（version mismatch 但 updated_at 相同时意味着并发冲突而非简单的时间先后）。

详见 Implementation Decision **§12 Version Increment Strategy** — 递增规则、云端/本地交互时 version 的保持策略、与 `_localDirty` 的协作。

### 关于 Dexie 事务与 sync 并发

当前 `syncTasksFromTree` 使用 `scheduleTasksSync` 防抖锁 + Dexie 事务。Phase 2 中 `offlineQueue` 的回放也需要 Dexie 事务保护，确保回放过程中如果用户继续编辑，不会破坏数据一致性。

### 关于 Supabase Realtime 的已知限制

- Realtime 在 Supabase 免费 tier 中有连接数限制（默认 200 并发）。对于个人工具场景（单用户少量设备）完全够用。
- Realtime 不保证 delivery 顺序，因此收到事件后必须做 `updated_at` 比较，避免旧数据覆盖新数据。

### 关于 Dexie → Supabase 字段映射

Dexie 中的 `boolean` 在 PostgreSQL 中存储为 `boolean` 类型，但 Supabase JS 客户端可能返回 `true/false` 或 `1/0`，取决于 PostgREST 版本。需要统一在 `fromCloud` 转换器中做规范化处理。

### 与现有 E2E 的兼容性

Phase 1 改动**必须保持向后兼容**：
- 现有的 `journey-1.ts` ~ `journey-15.ts` 应不修改或仅微调继续通过。
- `sync-fallback.spec.ts` 需要升级以覆盖 Phase 1 的新 fallback 机制。
- 新增 `tests/e2e/backend-integration/journey-16~19.spec.ts` 覆盖真实后端验证（auto-sync / conflict / offline-queue / realtime），与现有 mock E2E 互为补充。

---

## 任务拆分与估计

| # | 任务 | Phase | 估计 | 依赖 |
|---|------|-------|------|------|
| 1 | 重构 sync.ts → registerSource 模式 | 1 | 4h | — |
| 2 | Pull 阶段增加 updated_at 比较逻辑 | 1 | 3h | #1 |
| 3 | 接入 Supabase Realtime subscription | 1 | 4h | — |
| 4 | 编辑后 3s debounce 自动触发 push | 1 | 2h | #1 |
| 5 | fetchAllFromCloud 分页实现 | 1 | 3h | — |
| 6 | 字段白名单 + schema fallback 规范化 | 1 | 4h | #1 |
| 7 | 迁移 007/008/009 (change_log + deleted_at + mindmap_nodes) | 2 | 2h | — |
| 8 | offlineQueue 模块 (IndexedDB + 回放) | 2 | 8h | — |
| 9 | conflictResolver 模块 + UI Modal | 2 | 8h | #2 |
| 10 | 增量同步 (change_log 消费) | 2 | 8h | #7 |
| 11a | Mock E2E 升级 (sync-fallback.spec.ts 规范化 + journey-9 mock 层调整) | 1 | 2h | #6 |
| 11b | 真实后端 E2E 基础设施 (backend-integration/setup.ts + auth-helper + teardown) | 1 | 4h | — |
| 11c | 真实后端 E2E (journey-16 auto-sync / 17 conflict / 18 offline-queue / 19 realtime) | 2 | 8h | #11b + 各功能完成 |
| 12 | Yjs/Automerge PoC 调研报告 | 3 | 4h | Phase 2 完成 |
| 13 | 状态机同步引擎设计 | 3 | 8h | #12 |

---

> **Triage Label**: `ready-for-agent`  
> **Priority**: P0（同步架构问题是当前最大体验隐患）
