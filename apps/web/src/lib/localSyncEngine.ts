/**
 * Store-level sync helper — orchestrates bidirectional sync between
 * MindFlow (IndexedDB mindmap tree) and local .smm.md files.
 *
 * Responsible for:
 * - Tracking which obsidian projects have dirty (unsynced) changes
 * - Reading mindmap tree from IndexedDB + serialising back to .smm.md
 * - LWW conflict resolution (file.lastModified vs _lastMindflowEditAt)
 */

import { devLog, devWarn } from '@/lib/devConsole'
import { db } from '@/lib/db'
import { serializeSmmMd } from '@/lib/smmMdParser'
import type { ObsidianFile } from '@/lib/localFileSync'

// projectId → last modified timestamp (from file.lastModified when we wrote it)
const lastWrittenVersion = new Map<string, number>()

/**
 * Mark a project as having unsaved changes to its local file.
 * Call from MindMapCanvas data_change handler when project_type === 'obsidian'.
 */
export function markProjectDirty(projectId: string): void {
  devLog('[localSyncEngine] project dirty:', projectId)
  // Persist dirty flag in session only (not stored)
  _dirtyProjectIds.add(projectId)
}

const _dirtyProjectIds = new Set<string>()

export function isProjectDirty(projectId: string): boolean {
  return _dirtyProjectIds.has(projectId)
}

/**
 * Sync a potentially-dirty project back to its local file.
 */
export async function syncDirtyProjectToLocal(
  projectId: string,
  lookupFile: (projectId: string) => ObsidianFile | undefined
): Promise<void> {
  if (!_dirtyProjectIds.has(projectId)) return

  const project = await db.projects.get(projectId)
  if (!project) {
    _dirtyProjectIds.delete(projectId)
    return
  }
  if (project.project_type !== 'obsidian') {
    _dirtyProjectIds.delete(projectId)
    return
  }

  const file = lookupFile(projectId)
  if (!file) {
    devWarn('[localSyncEngine] no file handle for project:', projectId)
    return
  }

  // LWW: check if file was modified externally since last write
  const lastWritten = lastWrittenVersion.get(projectId) || 0
  if (file.lastModified > lastWritten + 500) {
    // External file is newer — skip overwriting; re-scan will handle
    devLog('[localSyncEngine] external file newer, skipping write:', projectId)
    _dirtyProjectIds.delete(projectId)
    return
  }

  // Read current mindmap tree
  const mindmap = await db.mindmaps.where('project_id').equals(projectId).first()
  if (!mindmap || !mindmap.tree_data) {
    devWarn('[localSyncEngine] no mindmap for project:', projectId)
    return
  }

  // Read original smm.md to preserve frontmatter
  const { content: originalContent } = await file.read()
  const parsed = parseSmmMd(originalContent)

  // Serialize updated tree
  const serialized = serializeSmmMd(
    parsed,
    mindmap.tree_data as Record<string, unknown>
  )

  // Write back
  await writeObsidianFile(file, serialized)

  // Record write timestamp
  lastWrittenVersion.set(projectId, Date.now())

  // Clear dirty flag
  _dirtyProjectIds.delete(projectId)

  // Update project last_synced_at in IndexedDB
  await db.projects.update(projectId, {
    last_synced_at: new Date(),
  })

  devLog('[localSyncEngine] synced to local:', projectId)
}

/** Check if any dirty projects exist */
export function hasDirtyProjects(): boolean {
  return _dirtyProjectIds.size > 0
}

/** Get array of dirty project ids */
export function getDirtyProjectIds(): string[] {
  return Array.from(_dirtyProjectIds)
}

/** Only for tests */
export function __clearDirtyProjectsForTests(): void {
  _dirtyProjectIds.clear()
  lastWrittenVersion.clear()
}

/* ════════════════════════════════════════════════════════════ */
/*  Re-exports to avoid circular deps with localFileSync.ts    */
/* ════════════════════════════════════════════════════════════ */

import { parseSmmMd } from '@/lib/smmMdParser'

/** Write content to an Obsidian file handle */
export async function writeObsidianFile(
  file: ObsidianFile,
  content: string
): Promise<void> {
  const writable = await file.handle.createWritable()
  await writable.write(content)
  await writable.close()
}
