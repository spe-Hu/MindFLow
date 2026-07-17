/**
 * Native File System API 封装 — 本地思�的工具目录扫描与文件读写
 *
 * 仅 Chromium 系浏览器支持 (Chrome/Edge)
 * Spec: https://wicg.github.io/file-system-access/
 */

import { devLog, devWarn } from '@/lib/devConsole'

// ============================================================
// Types
// ============================================================

export interface ObsidianFile {
  /** 文件显示名（不含扩展名） */
  name: string
  /** 相对于目录根的路径 */
  relativePath: string
  /** 文件系统句柄 */
  fileHandle: FileSystemFileHandle
  /** 所在目录句柄 */
  dirHandle: FileSystemDirectoryHandle
  /** 文件最后修改时间戳 */
  lastModified: number
}

export interface LocalWorkspaceDirEntry {
  id: string
  name: string
  handle: FileSystemDirectoryHandle
}

export interface ScanResult {
  files: ObsidianFile[]
  errors: string[]
}

// ============================================================
// Compatibility
// ============================================================

/**
 * 检测当前浏览器是否支持 Native File System API
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

// ============================================================
// Directory Picking
// ============================================================

/**
 * 弹出目录选择器，让用户选择一个本地目录
 * @returns FileSystemDirectoryHandle 或 null（用户取消）
 */
export async function requestLocalDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('Native File System API 不受此浏览器支持，请使用 Chrome 或 Edge')
  }
  try {
    const handle = await window.showDirectoryPicker()
    devLog('[localFileSync] Directory picked:', handle.name)
    return handle
  } catch (err) {
    // 用户点击取消或安全策略阻止
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null
    }
    throw err
  }
}

// ============================================================
// Permission
// ============================================================

/**
 * 查询目录句柄的当前权限状态
 */
export async function checkPermission(
  handle: FileSystemDirectoryHandle
): Promise<PermissionState> {
  try {
    return await handle.queryPermission({ mode: 'readwrite' })
  } catch {
    // 如果 queryPermission 不支持，尝试 requestPermission 回退
    try {
      return await handle.requestPermission({ mode: 'readwrite' })
    } catch {
      return 'prompt'
    }
  }
}

/**
 * 重新请求目录权限（用于权限过期后恢复）
 */
export async function requestPermission(
  handle: FileSystemDirectoryHandle
): Promise<PermissionState> {
  try {
    return await handle.requestPermission({ mode: 'readwrite' })
  } catch {
    return 'denied'
  }
}

// ============================================================
// Scanning
// ============================================================

/**
 * 递归扫描目录下的所有 `.smm.md` 文件
 */
export async function scanDirectoryForSmmMd(
  dirHandle: FileSystemDirectoryHandle,
  options?: { maxDepth?: number }
): Promise<ScanResult> {
  const maxDepth = options?.maxDepth ?? Infinity
  const results: ObsidianFile[] = []
  const errors: string[] = []

  async function walk(
    currentDir: FileSystemDirectoryHandle,
    relativePath: string,
    depth: number
  ): Promise<void> {
    if (depth > maxDepth) return

    try {
      for await (const [name, entry] of currentDir.entries()) {
        const entryPath = relativePath ? `${relativePath}/${name}` : name

        if (entry.kind === 'directory') {
          await walk(entry as FileSystemDirectoryHandle, entryPath, depth + 1)
        } else if (entry.kind === 'file' && name.endsWith('.smm.md')) {
          try {
            const file = await (entry as FileSystemFileHandle).getFile()
            results.push({
              name: name.replace(/\.smm\.md$/, ''),
              relativePath: entryPath,
              fileHandle: entry as FileSystemFileHandle,
              dirHandle: currentDir,
              lastModified: file.lastModified,
            })
          } catch (e) {
            errors.push(`无法读取文件 ${entryPath}: ${e instanceof Error ? e.message : String(e)}`)
          }
        }
      }
    } catch (e) {
      errors.push(`无法扫描目录 ${relativePath || dirHandle.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  await walk(dirHandle, '', 0)
  devLog(`[localFileSync] Scanned ${dirHandle.name}: ${results.length} .smm.md file(s)`)
  return { files: results, errors }
}

// ============================================================
// Read
// ============================================================

export interface ReadResult {
  content: string
  lastModified: number
}

/**
 * 读取 Obsidian 文件内容
 */
export async function readObsidianFile(file: ObsidianFile): Promise<ReadResult> {
  const f = await file.fileHandle.getFile()
  const content = await f.text()
  return { content, lastModified: f.lastModified }
}

// ============================================================
// Write
// ============================================================

/**
 * 将内容写回本地 .smm.md 文件
 */
export async function writeObsidianFile(file: ObsidianFile, content: string): Promise<void> {
  const writable = await file.fileHandle.createWritable()
  try {
    await writable.write(content)
  } finally {
    await writable.close()
  }
  devLog('[localFileSync] Wrote file:', file.relativePath)
}

// ============================================================
// Project Creation
// ============================================================

/**
 * 从 ObsidianFile 构造 LocalProject 所需的基础信息
 * （调用方负责写入 IndexedDB）
 */
export function buildProjectFromObsidianFile(
  file: ObsidianFile,
  dirId: string,
  projectId: string
): {
  id: string
  name: string
  project_type: 'obsidian'
  local_path: string
  local_dir_id: string
  color: string
  sort_order: number
  is_archived: boolean
  version: number
  last_opened_at: Date
} {
  return {
    id: projectId,
    name: file.name,
    project_type: 'obsidian',
    local_path: file.relativePath,
    local_dir_id: dirId,
    color: '#059669', // emerald-600, distinct from cloud projects
    sort_order: 0,
    is_archived: false,
    version: 1,
    last_opened_at: new Date(),
  }
}
