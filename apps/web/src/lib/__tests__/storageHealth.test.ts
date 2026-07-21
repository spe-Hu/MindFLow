import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/lib/db/schema'
import { getStorageStats, runHealthCheck, fixHealthIssues } from '@/lib/storageHealth'
import type { HealthIssue } from '@/lib/storageHealth'

vi.mock('@/lib/db/schema', () => ({
  db: {
    projects: { toArray: vi.fn() },
    mindmaps: { toArray: vi.fn() },
    tasks: { toArray: vi.fn(), bulkDelete: vi.fn() },
  },
}))

function makeTree(name: string, uid: string, ...children: ReturnType<typeof makeTree>[]) {
  return {
    data: { uid, text: name },
    children,
  }
}

describe('storageHealth', () => {
  const mockProjects = vi.mocked(db.projects.toArray)
  const mockMindmaps = vi.mocked(db.mindmaps.toArray)
  const mockTasksArr = vi.mocked(db.tasks.toArray)
  const mockTasksBulkDelete = vi.mocked(db.tasks.bulkDelete)

  beforeEach(() => {
    vi.clearAllMocks()
    mockProjects.mockResolvedValue([])
    mockMindmaps.mockResolvedValue([])
    mockTasksArr.mockResolvedValue([])
    mockTasksBulkDelete.mockResolvedValue(undefined)
  })

  // ───────────────────────── getStorageStats ──────────────────────
  describe('getStorageStats', () => {
    it('returns all zeros on empty DB', async () => {
      const stats = await getStorageStats()
      expect(stats.projectCount).toBe(0)
      expect(stats.taskCount).toBe(0)
      expect(stats.nodeCount).toBe(0)
      expect(stats.estimatedSizeKB).toBeGreaterThanOrEqual(0)
    })

    it('counts nodes recursively and filters archived', async () => {
      mockProjects.mockResolvedValue([
        { id: 'p1', name: 'Active', is_archived: false },
        { id: 'p2', name: 'Archived', is_archived: true },
      ] as any)
      mockMindmaps.mockResolvedValue([
        { id: 'm1', project_id: 'p1', tree_data: makeTree('Root', 'u1', makeTree('Child', 'u2')) },
      ] as any)
      mockTasksArr.mockResolvedValue([
        { id: 't1', project_id: 'p1', title: 'Done', status: 'done' },
        { id: 't2', project_id: 'p1', title: 'Todo', status: 'todo' },
      ] as any)

      const stats = await getStorageStats()
      expect(stats.projectCount).toBe(2)
      expect(stats.activeProjectCount).toBe(1)
      expect(stats.archivedProjectCount).toBe(1)
      expect(stats.taskCount).toBe(2)
      expect(stats.completedTaskCount).toBe(1)
      expect(stats.nodeCount).toBe(2)
    })
  })

  // ───────────────────────── runHealthCheck ───────────────────────
  describe('runHealthCheck', () => {
    it('reports missing mindmap', async () => {
      mockProjects.mockResolvedValue([{ id: 'p1', name: 'NoMindmap' }] as any)
      mockMindmaps.mockResolvedValue([])
      mockTasksArr.mockResolvedValue([])

      const issues = await runHealthCheck()
      expect(issues).toHaveLength(1)
      expect(issues[0].type).toBe('missing_mindmap')
      expect(issues[0].severity).toBe('error')
      expect(issues[0].autoFixable).toBe(false)
    })

    it('reports orphan task (missing node in tree)', async () => {
      mockProjects.mockResolvedValue([{ id: 'p1', name: 'Proj' }] as any)
      mockMindmaps.mockResolvedValue([
        { id: 'm1', project_id: 'p1', tree_data: makeTree('Root', 'u1') },
      ] as any)
      mockTasksArr.mockResolvedValue([
        { id: 't1', project_id: 'p1', title: 'Orphan', node_uid: 'ghost' },
      ] as any)

      const issues = await runHealthCheck()
      expect(issues).toHaveLength(1)
      expect(issues[0].type).toBe('orphan_task')
      expect(issues[0].autoFixable).toBe(true)
    })

    it('reports empty project', async () => {
      mockProjects.mockResolvedValue([{ id: 'p1', name: 'Empty' }] as any)
      mockMindmaps.mockResolvedValue([
        { id: 'm1', project_id: 'p1', tree_data: makeTree('Root', 'u1') },
      ] as any)
      mockTasksArr.mockResolvedValue([])

      const issues = await runHealthCheck()
      expect(issues).toHaveLength(1)
      expect(issues[0].type).toBe('empty_project')
    })

    it('reports duplicate node uid', async () => {
      const dupChild1 = makeTree('A', 'dup')
      const dupChild2 = makeTree('B', 'dup')
      const root = makeTree('Root', 'u1', dupChild1, dupChild2)

      mockProjects.mockResolvedValue([{ id: 'p1', name: 'DupProj' }] as any)
      mockMindmaps.mockResolvedValue([
        { id: 'm1', project_id: 'p1', tree_data: root },
      ] as any)
      mockTasksArr.mockResolvedValue([])

      const issues = await runHealthCheck()
      const dupIssues = issues.filter((i) => i.type === 'duplicate_node_uid')
      expect(dupIssues).toHaveLength(1)
      expect(dupIssues[0].severity).toBe('error')
    })

    it('passes for healthy data', async () => {
      mockProjects.mockResolvedValue([{ id: 'p1', name: 'Healthy' }] as any)
      mockMindmaps.mockResolvedValue([
        { id: 'm1', project_id: 'p1', tree_data: makeTree('Root', 'u1', makeTree('TaskNode', 'u2')) },
      ] as any)
      mockTasksArr.mockResolvedValue([
        { id: 't1', project_id: 'p1', title: 'RealTask', node_uid: 'u2' },
      ] as any)

      const issues = await runHealthCheck()
      expect(issues).toHaveLength(0)
    })
  })

  // ───────────────────────── fixHealthIssues ──────────────────────
  describe('fixHealthIssues', () => {
    it('deletes orphan tasks', async () => {
      const issues: HealthIssue[] = [
        { id: 'o1', type: 'orphan_task', severity: 'warning', message: 'orphan', taskId: 't1', autoFixable: true },
        { id: 'o2', type: 'orphan_task', severity: 'warning', message: 'also orphan', taskId: 't2', autoFixable: true },
      ]
      const fixed = await fixHealthIssues(issues)
      expect(fixed).toBe(2)
      expect(mockTasksBulkDelete).toHaveBeenCalledWith(['t1', 't2'])
    })

    it('ignores non-orphan issues', async () => {
      const issues: HealthIssue[] = [
        { id: 'e1', type: 'missing_mindmap', severity: 'error', message: 'no mindmap', autoFixable: false },
        { id: 'o1', type: 'orphan_task', severity: 'warning', message: 'orphan', taskId: 't1', autoFixable: true },
      ]
      const fixed = await fixHealthIssues(issues)
      expect(fixed).toBe(1)
      expect(mockTasksBulkDelete).toHaveBeenCalledWith(['t1'])
    })

    it('does nothing when no orphan tasks', async () => {
      const fixed = await fixHealthIssues([])
      expect(fixed).toBe(0)
      expect(mockTasksBulkDelete).not.toHaveBeenCalled()
    })
  })
})
