import { describe, it, expect } from 'vitest'
import {
  parseSmmMd,
  serializeSmmMd,
  extractTasksFromTree,
  mergeTaskMarkersIntoTree,
} from '@/lib/smmMdParser'
import type { MindMapData, TaskUpdate } from '@/lib/smmMdParser'

// ------------------------------------------------------------------
// Test fixtures
// ------------------------------------------------------------------

const MOCK_TREE_DATA: MindMapData = {
  data: {
    text: '中心主题',
    uid: 'root',
    expand: true,
    isRoot: true,
  },
  children: [
    {
      data: {
        text: '带 checkbox 的任务',
        uid: 'node1',
        expand: true,
        checkbox: true,
      },
      children: [],
    },
    {
      data: {
        text: '- [ ] Markdown 待办任务',
        uid: 'node2',
        expand: true,
      },
      children: [],
    },
    {
      data: {
        text: '- [x] Markdown 已完成任务',
        uid: 'node3',
        expand: true,
      },
      children: [],
    },
    {
      data: {
        text: '普通笔记节点',
        uid: 'node4',
        expand: true,
      },
      children: [],
    },
  ],
}

const BASE64_METADATA = Buffer.from(
  JSON.stringify(MOCK_TREE_DATA),
  'utf-8'
).toString('base64')

function makeSmmMd(metadataBase64: string, frontmatter?: string): string {
  const fm = frontmatter ? `---\n${frontmatter}\n---\n` : ''
  return `${fm}> 请勿修改除YAML外的任何信息\n# metadata\n\`\`\`metadata\n${metadataBase64}\n\`\`\``
}

// ------------------------------------------------------------------
// parseSmmMd
// ------------------------------------------------------------------

describe('parseSmmMd', () => {
  it('解析有效 smm.md 文件（含 frontmatter）', () => {
    const content = makeSmmMd(
      BASE64_METADATA,
      'path: 05_知识库构建/test.md\ntags:\n  - simplemindmap'
    )
    const result = parseSmmMd(content)

    expect(result.frontmatterRaw).toContain('path: 05_知识库构建/test.md')
    expect(result.frontmatterRaw).toContain('simplemindmap')
    expect(result.metadataRaw).toBe(BASE64_METADATA)
    expect(result.metadata.data.text).toBe('中心主题')
    expect(result.metadata.children).toHaveLength(4)
  })

  it('解析不带 frontmatter 的文件', () => {
    const content = makeSmmMd(BASE64_METADATA)
    const result = parseSmmMd(content)

    expect(result.frontmatterRaw).toBe('')
    expect(result.metadata.data.text).toBe('中心主题')
  })

  it('缺少 metadata 时应抛出错误', () => {
    expect(() => parseSmmMd('# 随便一些内容')).toThrow('Missing or malformed')
  })

  it('Base64 损坏时应抛出错误', () => {
    const content = makeSmmMd('!!!invalid-base64!!!')
    expect(() => parseSmmMd(content)).toThrow('Failed to decode')
  })
})

// ------------------------------------------------------------------
// serializeSmmMd
// ------------------------------------------------------------------

describe('serializeSmmMd', () => {
  it('保留原始 frontmatter', () => {
    const original = makeSmmMd(
      BASE64_METADATA,
      'path: test.md\ntags:\n  - simplemindmap'
    )
    const parsed = parseSmmMd(original)

    // Modify metadata
    const updated = structuredClone(parsed.metadata)
    updated.data.text = '新主题'

    const serialized = serializeSmmMd(parsed, updated)
    const reparsed = parseSmmMd(serialized)

    expect(serialized).toContain('path: test.md')
    expect(serialized).toContain('simplemindmap')
    expect(reparsed.metadata.data.text).toBe('新主题')
  })

  it('metadata Base64 编码正确', () => {
    const original = makeSmmMd(BASE64_METADATA)
    const parsed = parseSmmMd(original)

    const updated = structuredClone(parsed.metadata)
    updated.data.text = '更新后的主题'

    const serialized = serializeSmmMd(parsed, updated)
    const reparsed = parseSmmMd(serialized)

    expect(reparsed.metadata.data.text).toBe('更新后的主题')
  })

  it('textdata 和 svgdata 区域保持不变', () => {
    const content = `${makeSmmMd(BASE64_METADATA)}
# textdata
\`\`\`textdata
some text data here
\`\`\`
# svgdata
\`\`\`svgdata
<svg></svg>
\`\`\``

    const parsed = parseSmmMd(content)
    expect(parsed.textdataRaw).toBe('some text data here')
    expect(parsed.svgdataRaw).toBe('<svg></svg>')

    const updated = structuredClone(parsed.metadata)
    const serialized = serializeSmmMd(parsed, updated)

    expect(serialized).toContain('some text data here')
    expect(serialized).toContain('<svg></svg>')
  })
})

// ------------------------------------------------------------------
// extractTasksFromTree
// ------------------------------------------------------------------

describe('extractTasksFromTree', () => {
  it('识别 data.checkbox=true 的任务（done 状态）', () => {
    const tasks = extractTasksFromTree(MOCK_TREE_DATA)
    const task1 = tasks.find((t) => t.nodeUid === 'node1')

    expect(task1).toBeDefined()
    expect(task1!.title).toBe('带 checkbox 的任务')
    expect(task1!.status).toBe('done')
  })

  it('识别 Markdown checkbox 待办（- [ ]）', () => {
    const tasks = extractTasksFromTree(MOCK_TREE_DATA)
    const task2 = tasks.find((t) => t.nodeUid === 'node2')

    expect(task2).toBeDefined()
    expect(task2!.title).toBe('Markdown 待办任务')
    expect(task2!.status).toBe('todo')
  })

  it('识别 Markdown checkbox 已完成（- [x]）', () => {
    const tasks = extractTasksFromTree(MOCK_TREE_DATA)
    const task3 = tasks.find((t) => t.nodeUid === 'node3')

    expect(task3).toBeDefined()
    expect(task3!.title).toBe('Markdown 已完成任务')
    expect(task3!.status).toBe('done')
  })

  it('不识别普通节点', () => {
    const tasks = extractTasksFromTree(MOCK_TREE_DATA)
    const task4 = tasks.find((t) => t.nodeUid === 'node4')

    expect(task4).toBeUndefined()
    expect(tasks).toHaveLength(3)
  })

  it('正确记录 nodePath', () => {
    const tasks = extractTasksFromTree(MOCK_TREE_DATA)
    const task2 = tasks.find((t) => t.nodeUid === 'node2')

    expect(task2!.nodePath).toEqual([1])
  })
})

// ------------------------------------------------------------------
// mergeTaskMarkersIntoTree
// ------------------------------------------------------------------

describe('mergeTaskMarkersIntoTree', () => {
  it('将 todo 任务标记为 checkbox=false', () => {
    const tree = structuredClone(MOCK_TREE_DATA)
    const updates: TaskUpdate[] = [
      { nodeUid: 'node2', status: 'todo' },
    ]
    const result = mergeTaskMarkersIntoTree(tree, updates)
    const node2 = result.children![1]!.data

    expect(node2.checkbox).toBe(false)
  })

  it('将 done 任务标记为 checkbox=true', () => {
    const tree = structuredClone(MOCK_TREE_DATA)
    const updates: TaskUpdate[] = [
      { nodeUid: 'node2', status: 'done' },
    ]
    const result = mergeTaskMarkersIntoTree(tree, updates)
    const node2 = result.children![1]!.data

    expect(node2.checkbox).toBe(true)
    // Markdown text should also update
    expect(node2.text).toBe('- [x] Markdown 待办任务')
  })

  it('更新无 Markdown checkbox 的节点时只改 checkbox 属性', () => {
    const tree = structuredClone(MOCK_TREE_DATA)
    const updates: TaskUpdate[] = [
      { nodeUid: 'node1', status: 'todo' },
    ]
    const result = mergeTaskMarkersIntoTree(tree, updates)
    const node1 = result.children![0]!.data

    expect(node1.checkbox).toBe(false)
    expect(node1.text).toBe('带 checkbox 的任务') // unchanged
  })
})
