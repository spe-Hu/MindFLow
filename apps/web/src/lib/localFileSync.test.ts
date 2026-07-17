import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isFileSystemAccessSupported,
  requestLocalDirectory,
  checkPermission,
  requestPermission,
  scanDirectoryForSmmMd,
  readObsidianFile,
  writeObsidianFile,
  buildProjectFromObsidianFile,
  type ObsidianFile,
} from '@/lib/localFileSync'

// ============================================================
// Mock FileSystem API for Node.js (vitest) environment
// ============================================================

type PermissionState = 'granted' | 'denied' | 'prompt'

class MockFileSystemWritableFileStream {
  private _chunks: string[] = []
  private _onClose?: (data: string) => void

  constructor(onClose?: (data: string) => void) {
    this._onClose = onClose
  }

  async write(chunk: string | BufferSource | Blob): Promise<void> {
    if (typeof chunk === 'string') {
      this._chunks.push(chunk)
    } else if (chunk instanceof Blob) {
      this._chunks.push(await chunk.text())
    } else if (ArrayBuffer.isView(chunk)) {
      const decoder = new TextDecoder()
      this._chunks.push(decoder.decode(chunk))
    }
  }

  async close(): Promise<void> {
    if (this._onClose) {
      this._onClose(this._chunks.join(''))
    }
  }
}

class MockFileSystemFileHandle {
  kind = 'file' as const
  name: string
  private _content: string
  private _lastModified: number

  constructor(name: string, content = '', lastModified = Date.now()) {
    this.name = name
    this._content = content
    this._lastModified = lastModified
  }

  async getFile(): Promise<File> {
    return new File([this._content], this.name, { lastModified: this._lastModified })
  }

  async createWritable(): Promise<MockFileSystemWritableFileStream> {
    return new MockFileSystemWritableFileStream((data) => {
      this._content = data
      this._lastModified = Date.now()
    })
  }

  getContent(): string {
    return this._content
  }

  setContent(content: string): void {
    this._content = content
    this._lastModified = Date.now()
  }
}

class MockFileSystemDirectoryHandle {
  kind = 'directory' as const
  name: string
  private _entries = new Map<string, MockFileSystemFileHandle | MockFileSystemDirectoryHandle>()
  private _permissionState: PermissionState = 'granted'

  constructor(name: string) {
    this.name = name
  }

  addEntry(name: string, entry: MockFileSystemFileHandle | MockFileSystemDirectoryHandle): void {
    this._entries.set(name, entry)
  }

  async *entries(): AsyncGenerator<[string, MockFileSystemFileHandle | MockFileSystemDirectoryHandle], void, unknown> {
    for (const [name, entry] of this._entries) {
      yield [name, entry]
    }
  }

  async getFileHandle(name: string): Promise<MockFileSystemFileHandle> {
    const entry = this._entries.get(name)
    if (!entry || entry.kind !== 'file') {
      const err = new Error(`File not found: ${name}`)
      err.name = 'NotFoundError'
      throw err
    }
    return entry as MockFileSystemFileHandle
  }

  async getDirectoryHandle(name: string): Promise<MockFileSystemDirectoryHandle> {
    const entry = this._entries.get(name)
    if (!entry || entry.kind !== 'directory') {
      const err = new Error(`Directory not found: ${name}`)
      err.name = 'NotFoundError'
      throw err
    }
    return entry as MockFileSystemDirectoryHandle
  }

  async queryPermission(): Promise<PermissionState> {
    return this._permissionState
  }

  async requestPermission(): Promise<PermissionState> {
    if (this._permissionState === 'prompt') {
      this._permissionState = 'granted'
    }
    return this._permissionState
  }

  setPermission(state: PermissionState): void {
    this._permissionState = state
  }
}

// Helper: cast mocks to real FileSystemHandle types for the implementation
function asFileHandle(h: MockFileSystemFileHandle): FileSystemFileHandle {
  return h as unknown as FileSystemFileHandle
}
function asDirHandle(h: MockFileSystemDirectoryHandle): FileSystemDirectoryHandle {
  return h as unknown as FileSystemDirectoryHandle
}

// ============================================================
// Tests
// ============================================================

describe('isFileSystemAccessSupported', () => {
  it('returns false when window.showDirectoryPicker is absent', () => {
    vi.stubGlobal('window', {})
    expect(isFileSystemAccessSupported()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('returns true when window.showDirectoryPicker is present', () => {
    vi.stubGlobal('window', { showDirectoryPicker: vi.fn() })
    expect(isFileSystemAccessSupported()).toBe(true)
    vi.unstubAllGlobals()
  })
})

describe('requestLocalDirectory', () => {
  it('returns handle when user picks a directory', async () => {
    const mockDir = new MockFileSystemDirectoryHandle('ObsidianNotes')
    vi.stubGlobal('window', {
      showDirectoryPicker: vi.fn().mockResolvedValue(asDirHandle(mockDir)),
    })

    const result = await requestLocalDirectory()
    expect(result).not.toBeNull()
    expect(result!.name).toBe('ObsidianNotes')
    vi.unstubAllGlobals()
  })

  it('returns null when user cancels (AbortError)', async () => {
    const err = new DOMException('User cancelled', 'AbortError')
    vi.stubGlobal('window', { showDirectoryPicker: vi.fn().mockRejectedValue(err) })

    const result = await requestLocalDirectory()
    expect(result).toBeNull()
    vi.unstubAllGlobals()
  })

  it('throws on unsupported browser', async () => {
    vi.stubGlobal('window', {})
    await expect(requestLocalDirectory()).rejects.toThrow(/不受此浏览器支持/)
    vi.unstubAllGlobals()
  })
})

describe('checkPermission / requestPermission', () => {
  it('queryPermission returns granted', async () => {
    const dir = new MockFileSystemDirectoryHandle('docs')
    const state = await checkPermission(asDirHandle(dir))
    expect(state).toBe('granted')
  })

  it('queryPermission returns denied after set', async () => {
    const dir = new MockFileSystemDirectoryHandle('docs')
    dir.setPermission('denied')
    const state = await checkPermission(asDirHandle(dir))
    expect(state).toBe('denied')
  })

  it('requestPermission upgrades prompt to granted', async () => {
    const dir = new MockFileSystemDirectoryHandle('docs')
    dir.setPermission('prompt')
    const state = await requestPermission(asDirHandle(dir))
    expect(state).toBe('granted')
  })
})

describe('scanDirectoryForSmmMd', () => {
  it('finds .smm.md files recursively', async () => {
    const root = new MockFileSystemDirectoryHandle('Knowledge')
    const subDir = new MockFileSystemDirectoryHandle('SubFolder')

    subDir.addEntry('MindMap A.smm.md', new MockFileSystemFileHandle('MindMap A.smm.md'))
    root.addEntry('SubFolder', subDir)
    root.addEntry('MindMap Root.smm.md', new MockFileSystemFileHandle('MindMap Root.smm.md'))
    root.addEntry('README.md', new MockFileSystemFileHandle('README.md'))

    const result = await scanDirectoryForSmmMd(asDirHandle(root))
    expect(result.files).toHaveLength(2)
    expect(result.files.map((f) => f.name)).toContain('MindMap Root')
    expect(result.files.map((f) => f.name)).toContain('MindMap A')
    expect(result.errors).toHaveLength(0)
  })

  it('respects maxDepth', async () => {
    const root = new MockFileSystemDirectoryHandle('root')
    const l1 = new MockFileSystemDirectoryHandle('l1')
    const l2 = new MockFileSystemDirectoryHandle('l2')

    l2.addEntry('deep.smm.md', new MockFileSystemFileHandle('deep.smm.md'))
    l1.addEntry('l2', l2)
    l1.addEntry('mid.smm.md', new MockFileSystemFileHandle('mid.smm.md'))
    root.addEntry('l1', l1)
    root.addEntry('top.smm.md', new MockFileSystemFileHandle('top.smm.md'))

    const result = await scanDirectoryForSmmMd(asDirHandle(root), { maxDepth: 1 })
    expect(result.files).toHaveLength(2)
    expect(result.files.map((f) => f.name)).toEqual(expect.arrayContaining(['top', 'mid']))
  })

  it('returns empty array when no .smm.md found', async () => {
    const root = new MockFileSystemDirectoryHandle('empty')
    root.addEntry('note.md', new MockFileSystemFileHandle('note.md'))

    const result = await scanDirectoryForSmmMd(asDirHandle(root))
    expect(result.files).toHaveLength(0)
  })
})

describe('readObsidianFile', () => {
  it('reads file content and lastModified', async () => {
    const fileHandle = new MockFileSystemFileHandle('test.smm.md', 'hello world', 1700000000000)
    const obsidianFile: ObsidianFile = {
      name: 'test',
      relativePath: 'test.smm.md',
      fileHandle: asFileHandle(fileHandle),
      dirHandle: asDirHandle(new MockFileSystemDirectoryHandle('docs')),
      lastModified: 1700000000000,
    }

    const result = await readObsidianFile(obsidianFile)
    expect(result.content).toBe('hello world')
    expect(result.lastModified).toBe(1700000000000)
  })
})

describe('writeObsidianFile', () => {
  it('writes content back to file', async () => {
    const fileHandle = new MockFileSystemFileHandle('test.smm.md', 'old')
    const obsidianFile: ObsidianFile = {
      name: 'test',
      relativePath: 'test.smm.md',
      fileHandle: asFileHandle(fileHandle),
      dirHandle: asDirHandle(new MockFileSystemDirectoryHandle('docs')),
      lastModified: 1700000000000,
    }

    await writeObsidianFile(obsidianFile, 'new content')
    expect(fileHandle.getContent()).toBe('new content')
  })
})

describe('buildProjectFromObsidianFile', () => {
  it('builds correct project structure', () => {
    const fileHandle = new MockFileSystemFileHandle('MyMap.smm.md')
    const obsidianFile: ObsidianFile = {
      name: 'MyMap',
      relativePath: 'folder/MyMap.smm.md',
      fileHandle: asFileHandle(fileHandle),
      dirHandle: asDirHandle(new MockFileSystemDirectoryHandle('docs')),
      lastModified: 1700000000000,
    }

    const project = buildProjectFromObsidianFile(obsidianFile, 'dir-1', 'proj-abc')

    expect(project.id).toBe('proj-abc')
    expect(project.name).toBe('MyMap')
    expect(project.project_type).toBe('obsidian')
    expect(project.local_path).toBe('folder/MyMap.smm.md')
    expect(project.local_dir_id).toBe('dir-1')
    expect(project.color).toBe('#059669')
    expect(project.is_archived).toBe(false)
    expect(project.version).toBe(1)
  })
})
