/**
 * .smm.md 解析与序列化引擎
 *
 * Obsidian simple-mind-map 插件生成的 .smm.md 格式示例：
 * ```
 * ---
 * path: 05_知识库构建/02_大模型训练全流程/MindMap 2026-07-06 20.50.55.smm.md
 * tags:
 *   - simplemindmap
 * ---
 * > 请勿修改除YAML外的任何信息
 * # metadata
 * ```metadata
 * <base64-encoded-json>
 * ```
 * # textdata
 * ```textdata
 * ... （可选）
 * ```
 * # svgdata
 * ```svgdata
 * ... （可选）
 * ```
 * ```
 *
 * metadata 区块中的 Base64 解码后即为 simple-mind-map 原生 JSON 格式：
 *   { data: { text, uid, expand, ... }, children: [ { data, children }, ... ] }
 */

// ============================================================
// Types
// ============================================================

export interface MindMapNodeData {
  text: string
  uid: string
  expand?: boolean
  isRoot?: boolean
  checkbox?: boolean
  fillColor?: string
  borderColor?: string
  color?: string
  /** MindFlow 内部扩展 */
  _isTask?: boolean
  _status?: string
  _priority?: string
  _dueDate?: string
  _completedAt?: string
  /** 任意额外属性 */
  [key: string]: unknown
}

export interface MindMapTreeNode {
  data: MindMapNodeData
  children?: MindMapTreeNode[]
}

/** simple-mind-map 顶层树结构（包含根节点） */
export interface MindMapData {
  data: MindMapNodeData
  children?: MindMapTreeNode[]
}

export interface SmmMdParseResult {
  /** YAML frontmatter 原始文本 */
  frontmatterRaw: string
  /** metadata 区块原始文本（不含围栏） */
  metadataRaw: string
  /** Base64 解码后的结构化数据 */
  metadata: MindMapData
  /** textdata 区块原始文本（可选） */
  textdataRaw?: string
  /** svgdata 区块原始文本（可选） */
  svgdataRaw?: string
  /** 除 frontmatter 外的所有 Markdown 原文 */
  bodyRaw: string
}

export interface TaskInfo {
  title: string
  status: 'todo' | 'done'
  /** 节点在树中的路径索引，如 [0, 1] 表示根节点的第 0 个子节点的第 1 个子节点 */
  nodePath: number[]
  /** 对应节点的 uid */
  nodeUid: string
}

export interface TaskUpdate {
  nodeUid: string
  status: 'todo' | 'done'
}

// ============================================================
// Constants
// ============================================================

const MARKDOWN_CHECKBOX_RE = /^- \[(.)\]\s*(.+)$/
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/

// ============================================================
// Parse
// ============================================================

/**
 * 解析 .smm.md 文件内容
 * @throws 当缺少 metadata 区块或 Base64 解码失败时抛出
 */
export function parseSmmMd(content: string): SmmMdParseResult {
  // 1. Extract YAML frontmatter
  const frontmatterMatch = content.match(FRONTMATTER_RE)
  const frontmatterRaw = frontmatterMatch ? frontmatterMatch[1]! : ''
  const bodyAfterFrontmatter = frontmatterMatch
    ? content.slice(frontmatterMatch[0].length).trimStart()
    : content

  // 2. Extract fenced blocks from body
  const {
    metadataRaw,
    textdataRaw,
    svgdataRaw,
    bodyRaw,
  } = extractFencedBlocks(bodyAfterFrontmatter)

  if (!metadataRaw) {
    throw new Error('Missing or malformed # metadata block in .smm.md')
  }

  // 3. Decode Base64 metadata
  let metadata: MindMapData
  try {
    const decoded = Buffer.from(metadataRaw, 'base64').toString('utf-8')
    metadata = JSON.parse(decoded) as MindMapData
  } catch {
    throw new Error('Failed to decode Base64 metadata in .smm.md')
  }

  return {
    frontmatterRaw,
    metadataRaw,
    metadata,
    textdataRaw,
    svgdataRaw,
    bodyRaw,
  }
}

/**
 * 从 Markdown body 中提取 fenced code blocks
 * 格式：# sectionName\n```fenceName\ncontent\n```
 */
function extractFencedBlocks(
  body: string
): {
  metadataRaw: string
  textdataRaw: string | undefined
  svgdataRaw: string | undefined
  bodyRaw: string
} {
  let metadataRaw = ''
  let textdataRaw: string | undefined
  let svgdataRaw: string | undefined

  // We'll reconstruct bodyRaw by removing the extracted blocks,
  // but keeping section headings and placeholders so serialize can work.
  // For simplicity, bodyRaw is just the original body — serialize will
  // do a targeted replacement.

  // Use regex to find each fenced block
  const lines = body.split('\n')
  let i = 0
  while (i < lines.length) {
    const trimmed = lines[i]!.trim()
    if (trimmed.startsWith('# metadata') || trimmed.startsWith('# textdata') || trimmed.startsWith('# svgdata')) {
      const sectionName = trimmed.replace('# ', '').trim()
      // Find the opening fence on the next non-empty line
      let j = i + 1
      while (j < lines.length && lines[j]!.trim() === '') j++
      if (j < lines.length) {
        const fenceLine = lines[j]!.trim()
        const fenceMatch = fenceLine.match(/^```(\w+)$/)
        if (fenceMatch) {
          const fenceName = fenceMatch[1]!
          // Gather content until closing fence
          const contentLines: string[] = []
          j++
          while (j < lines.length && lines[j]!.trim() !== '```') {
            contentLines.push(lines[j]!)
            j++
          }
          // j now points at the closing ``` or past the end
          const content = contentLines.join('\n')
          if (sectionName === 'metadata') metadataRaw = content
          else if (sectionName === 'textdata') textdataRaw = content
          else if (sectionName === 'svgdata') svgdataRaw = content
          i = j + 1
          continue
        }
      }
    }
    i++
  }

  return { metadataRaw, textdataRaw, svgdataRaw, bodyRaw: body }
}

// ============================================================
// Serialize
// ============================================================

/**
 * 将修改后的 MindMapData 序列化回 .smm.md 格式
 * 保留原始 frontmatter、textdata、svgdata 不变，只更新 metadata 区块
 */
export function serializeSmmMd(
  parseResult: SmmMdParseResult,
  updatedMetadata: MindMapData
): string {
  let result = ''

  // 1. Frontmatter
  if (parseResult.frontmatterRaw) {
    result += `---\n${parseResult.frontmatterRaw}\n---\n`
  }

  // 2. Body: replace metadata block's content with new Base64
  let body = parseResult.bodyRaw

  // Encode new metadata
  const newMetadataBase64 = Buffer.from(
    JSON.stringify(updatedMetadata),
    'utf-8'
  ).toString('base64')

  // Replace the content inside ```metadata ... ```
  body = body.replace(
    /(# metadata\s*\n\s*```metadata\s*\n)([\s\S]*?)(\n\s*```)/,
    `$1${newMetadataBase64}$3`
  )

  result += body
  return result
}

// ============================================================
// Task Detection
// ============================================================

/**
 * 从 simple-mind-map 树中提取任务节点
 * 优先级：先检查 data.checkbox，再检查 Markdown checkbox 格式
 */
export function extractTasksFromTree(tree: MindMapData): TaskInfo[] {
  const tasks: TaskInfo[] = []

  function walk(node: MindMapTreeNode, path: number[]): void {
    const data = node.data as Record<string, unknown>
    const text = String(data.text || '')

    // Strategy 1: data.checkbox (simple-mind-map native)
    if (data.checkbox === true) {
      tasks.push({
        title: text,
        status: 'done',
        nodePath: [...path],
        nodeUid: String(data.uid || ''),
      })
      // Remove checkbox and text from further matching
      return
    }

    // Strategy 2: Markdown checkbox in node text
    const match = MARKDOWN_CHECKBOX_RE.exec(text)
    if (match) {
      const isChecked = match[1] === 'x' || match[1] === 'X'
      const title = match[2]!
      tasks.push({
        title: title.trim(),
        status: isChecked ? 'done' : 'todo',
        nodePath: [...path],
        nodeUid: String(data.uid || ''),
      })
      return
    }

    // Recurse into children
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        walk(node.children[i]!, [...path, i])
      }
    }
  }

  // Start from root's children (root itself is not a task)
  if (tree.children) {
    for (let i = 0; i < tree.children.length; i++) {
      walk(tree.children[i]!, [i])
    }
  }

  return tasks
}

// ============================================================
// Task Merge
// ============================================================

/**
 * 将 MindFlow 任务状态写回树节点
 * 策略：优先使用 data.checkbox，同时保留原始 Markdown checkbox 格式
 */
export function mergeTaskMarkersIntoTree(
  tree: MindMapData,
  tasks: TaskUpdate[]
): MindMapData {
  const uidToStatus = new Map(tasks.map((t) => [t.nodeUid, t.status]))

  function walk(node: MindMapTreeNode): void {
    const data = node.data as Record<string, unknown>
    const uid = String(data.uid || '')
    const status = uidToStatus.get(uid)
    if (!status) return

    const text = String(data.text || '')
    const markdownMatch = MARKDOWN_CHECKBOX_RE.exec(text)

    if (markdownMatch) {
      // Has markdown checkbox: update brackets while keeping the rest
      const newMarker = status === 'done' ? '- [x]' : '- [ ]'
      const rest = markdownMatch[2]!
      data.text = `${newMarker} ${rest}`
    }

    // Always set/checkbox for simple-mind-map native support
    data.checkbox = status === 'done'

    // Recurse
    if (node.children) {
      for (const child of node.children) {
        walk(child)
      }
    }
  }

  if (tree.children) {
    for (const child of tree.children) {
      walk(child)
    }
  }

  return tree
}
