/**
 * Outline <-> MindMap tree_data 双向转换工具
 *
 * 文本格式：
 * 中心主题
 *   一级节点
 *     二级节点
 *   [ ] 待办任务 !高 @2026-07-05
 *   [x] 已完成任务 !中
 *   普通节点
 *
 * 标记语法：
 *   [ ]   待办任务
 *   [x]   已完成任务
 *   !高 / !中 / !低  优先级
 *   @YYYY-MM-DD      截止日期
 */

export interface OutlineLine {
  text: string
  indent: number
  isTask: boolean
  status?: 'todo' | 'done'
  priority?: 'high' | 'medium' | 'low'
  dueDate?: string // YYYY-MM-DD
}

// ============================================================
// Tree -> Outline Text
// ============================================================

export function treeToOutline(treeData: Record<string, unknown>): string {
  const root = (treeData.data || {}) as Record<string, unknown>
  return nodeToOutline(root, 0, true)
}

function nodeToOutline(
  nodeData: Record<string, unknown>,
  indent: number,
  isRoot: boolean
): string {
  let text = String(nodeData.text || '')

  // 根节点不加标记，也不加缩进
  if (isRoot) {
    let result = text + '\n'
    const children = (nodeData.children || []) as Record<string, unknown>[]
    for (const child of children) {
      result += nodeToOutline(child, 1, false)
    }
    return result
  }

  // 任务节点添加标记
  const isTask = Boolean(nodeData._isTask)
  if (isTask) {
    const status = nodeData._status === 'done' ? '[x]' : '[ ]'
    const priority = nodeData._priority
      ? `!${priorityToLabel(nodeData._priority as string)}`
      : ''
    const dueDate = nodeData._dueDate
      ? `@${String(nodeData._dueDate).slice(0, 10)}`
      : ''

    const parts = [status, text, priority, dueDate].filter(Boolean)
    text = parts.join(' ')
  }

  let result = '  '.repeat(indent) + text + '\n'
  const children = (nodeData.children || []) as Record<string, unknown>[]
  for (const child of children) {
    result += nodeToOutline(child, indent + 1, false)
  }
  return result
}

function priorityToLabel(priority: string): string {
  switch (priority) {
    case 'high':
      return '高'
    case 'medium':
      return '中'
    case 'low':
      return '低'
    default:
      return priority
  }
}

function labelToPriority(label: string): 'high' | 'medium' | 'low' | undefined {
  switch (label) {
    case '高':
      return 'high'
    case '中':
      return 'medium'
    case '低':
      return 'low'
    default:
      return undefined
  }
}

// ============================================================
// Outline Text -> Tree
// ============================================================

export function outlineToTree(outlineText: string, existingTree?: Record<string, unknown>): Record<string, unknown> {
  const lines = parseOutline(outlineText)

  // 保留根节点数据，只替换 children
  let rootData: Record<string, unknown>
  if (existingTree) {
    rootData = { ...(existingTree.data as Record<string, unknown> || {}) }
  } else {
    rootData = { text: lines[0]?.text || '中心主题', uid: 'root', expand: true, isRoot: true }
  }

  // 第一行是根节点文本（如果有的话）
  if (lines.length > 0 && lines[0]!.indent === 0) {
    rootData.text = lines[0]!.text
    lines.shift()
  }

  const children = buildTreeNodes(lines, 1)

  return {
    data: rootData,
    children,
  }
}

export function parseOutline(text: string): OutlineLine[] {
  const rawLines = text.split('\n')
  const result: OutlineLine[] = []

  for (const rawLine of rawLines) {
    // 保留空行但跳过纯空白
    if (rawLine.trim() === '') continue

    const { indent, content } = extractIndent(rawLine)
    const parsed = parseLineContent(content)

    result.push({
      ...parsed,
      indent,
    })
  }

  return result
}

function extractIndent(line: string): { indent: number; content: string } {
  let spaces = 0
  for (const ch of line) {
    if (ch === ' ') {
      spaces++
    } else if (ch === '\t') {
      spaces += 2
    } else {
      break
    }
  }
  // 2 spaces = 1 indent level
  const indent = Math.floor(spaces / 2)
  const content = line.slice(spaces)
  return { indent, content }
}

function parseLineContent(content: string): Omit<OutlineLine, 'indent'> {
  let text = content.trim()
  let isTask = false
  let status: 'todo' | 'done' | undefined
  let priority: 'high' | 'medium' | 'low' | undefined
  let dueDate: string | undefined

  // Parse task status: [ ] or [x]
  const statusMatch = text.match(/^\[([ xX])\]\s*/)
  if (statusMatch) {
    isTask = true
    status = statusMatch[1] === 'x' || statusMatch[1] === 'X' ? 'done' : 'todo'
    text = text.slice(statusMatch[0]!.length)
  }

  // Parse due date: @YYYY-MM-DD
  const dueDateMatch = text.match(/@(\d{4}-\d{2}-\d{2})$/)
  if (dueDateMatch) {
    dueDate = dueDateMatch[1]
    text = text.slice(0, -dueDateMatch[0]!.length).trim()
  }

  // Parse priority: !高 / !中 / !低
  const priorityMatch = text.match(/!([高中低])\s*$/)
  if (priorityMatch) {
    priority = labelToPriority(priorityMatch[1]!)
    text = text.slice(0, -priorityMatch[0]!.length).trim()
  }

  return {
    text: text.trim(),
    isTask,
    status,
    priority,
    dueDate,
  }
}

// ============================================================
// Build tree nodes from flat indent-based lines
// ============================================================

function buildTreeNodes(lines: OutlineLine[], expectedIndent: number): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!
    if (line.indent < expectedIndent) break
    if (line.indent > expectedIndent) {
      // skip orphaned deeper lines (shouldn't happen with proper indent)
      i++
      continue
    }

    const nodeData: Record<string, unknown> = {
      text: line.text,
      uid: generateUid(),
      expand: true,
    }

    if (line.isTask) {
      nodeData._isTask = true
      nodeData._status = line.status || 'todo'
      nodeData._priority = line.priority || 'medium'
      if (line.dueDate) {
        nodeData._dueDate = new Date(line.dueDate).toISOString()
      }
      // 任务节点默认样式
      nodeData.fillColor = '#eff6ff'
      nodeData.borderColor = '#93c5fd'
      nodeData.color = '#1e40af'

      if (line.status === 'done') {
        nodeData.fillColor = '#dcfce7'
        nodeData.borderColor = '#86efac'
        nodeData.color = '#15803d'
      }
    }

    // Collect children: consecutive lines with deeper indent
    const childStart = i + 1
    let childEnd = childStart
    while (childEnd < lines.length && lines[childEnd]!.indent > expectedIndent) {
      childEnd++
    }

    const childLines = lines.slice(childStart, childEnd)
    if (childLines.length > 0) {
      const children = buildTreeNodes(childLines, expectedIndent + 1)
      if (children.length > 0) {
        nodeData.children = children
      }
    }

    nodes.push({ data: nodeData })
    i = childEnd
  }

  return nodes
}

function generateUid(): string {
  return 'n_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36).slice(-4)
}
