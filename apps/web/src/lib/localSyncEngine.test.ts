import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  markProjectDirty,
  isProjectDirty,
  getDirtyProjectIds,
  __clearDirtyProjectsForTests,
} from '@/lib/localSyncEngine'

// Mock db so schema.ts window reference doesn't break in node/vitest
vi.mock('@/lib/db', () => ({
  db: {
    projects: { get: vi.fn(), update: vi.fn() },
    mindmaps: { where: vi.fn(() => ({ equals: vi.fn(() => ({ first: vi.fn() })) })) },
    tasks: { where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn() })) })) },
  },
}))
vi.mock('@/lib/smmMdParser', () => ({
  parseSmmMd: vi.fn(),
  serializeSmmMd: vi.fn(() => '---\n# serialized'),
}))

describe('localSyncEngine', () => {
  beforeEach(() => {
    __clearDirtyProjectsForTests()
  })

  describe('markProjectDirty / getDirtyProjectIds', () => {
    it('marks and retrieves dirty project ids', () => {
      expect(getDirtyProjectIds()).toHaveLength(0)
      markProjectDirty('obs-1')
      expect(getDirtyProjectIds()).toContain('obs-1')
      markProjectDirty('obs-2')
      expect(getDirtyProjectIds()).toHaveLength(2)
    })
  })

  describe('isProjectDirty', () => {
    it('returns true only for dirty projects', () => {
      expect(isProjectDirty('obs-x')).toBe(false)
      markProjectDirty('obs-x')
      expect(isProjectDirty('obs-x')).toBe(true)
    })
  })
})
