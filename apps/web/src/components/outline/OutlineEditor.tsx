import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronDown, CircleDot, Check, Square } from 'lucide-react'

// ============================================================
// Types
// ============================================================

export interface MindMapNode {
  data: Record<string, unknown>
  children?: MindMapNode[]
}

interface OutlineRow {
  id: string
  text: string
  indent: number
  path: number[]
  hasChildren: boolean
  collapsed: boolean
  hidden: boolean
  isTask: boolean
  status?: 'todo' | 'done'
  priority?: 'high' | 'medium' | 'low' | 'urgent'
  dueDate?: string
  rawData: Record<string, unknown>
}

interface OutlineEditorProps {
  treeData: MindMapNode
  onTreeChange: (newTree: MindMapNode) => void
  projectId: string
}

// ============================================================
// Utilities: Tree <-> Flat rows
// ============================================================

function treeToRows(node: MindMapNode, path: number[] = [], ancestorsCollapsed = false): OutlineRow[] {
  const data = node.data || {}
  const text = String(data.text || '')
  const id = String(data.uid || generateUid())
  const collapsed = data.expand === false
  const children = node.children || []

  const rowBase = {
    id,
    text,
    path: [...path],
    hasChildren: children.length > 0,
    collapsed,
    hidden: ancestorsCollapsed,
    isTask: Boolean(data._isTask),
    status: (data._status as 'todo' | 'done') || undefined,
    priority: (data._priority as 'high' | 'medium' | 'low' | 'urgent') || undefined,
    dueDate: data._dueDate ? String(data._dueDate).slice(0, 10) : undefined,
    rawData: { ...data },
  }

  const result: OutlineRow[] = []
  if (path.length === 0) {
    result.push({ ...rowBase, indent: 0 })
  } else {
    result.push({ ...rowBase, indent: path.length })
  }

  if (!collapsed && !ancestorsCollapsed) {
    for (let i = 0; i < children.length; i++) {
      result.push(...treeToRows(children[i]!, [...path, i], ancestorsCollapsed || collapsed))
    }
  }

  return result
}

/**
 * Build tree from flat rows using indent levels.
 */
function rowsToTree(rootRow: OutlineRow, allRows: OutlineRow[]): MindMapNode {
  const rootData: Record<string, unknown> = {
    ...rootRow.rawData,
    text: rootRow.text,
    uid: rootRow.id,
    expand: true,
    isRoot: true,
  }
  const root: MindMapNode = { data: rootData, children: [] }

  interface StackItem { node: MindMapNode; indent: number }
  const stack: StackItem[] = [{ node: root, indent: 0 }]

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i]!
    if (row.hidden) continue

    const nodeData: Record<string, unknown> = {
      ...row.rawData,
      text: row.text,
      uid: row.id,
      expand: !row.collapsed,
    }
    if (row.isTask) {
      nodeData._isTask = true
      nodeData._status = row.status || 'todo'
      nodeData._priority = row.priority || 'medium'
      if (row.dueDate) {
        nodeData._dueDate = new Date(row.dueDate).toISOString()
      }
      if (row.status === 'done') {
        nodeData.fillColor = '#dcfce7'
        nodeData.borderColor = '#86efac'
        nodeData.color = '#15803d'
      } else {
        nodeData.fillColor = '#eff6ff'
        nodeData.borderColor = '#93c5fd'
        nodeData.color = '#1e40af'
      }
    }
    const newNode: MindMapNode = { data: nodeData }

    while (stack.length > 0 && stack[stack.length - 1]!.indent >= row.indent) {
      stack.pop()
    }
    const parent = stack[stack.length - 1]!
    if (parent) {
      if (!parent.node.children) parent.node.children = []
      parent.node.children.push(newNode)
    }

    stack.push({ node: newNode, indent: row.indent })
  }

  if (!root.children || root.children.length === 0) {
    delete root.children
  }
  return root
}

function generateUid(): string {
  return 'n_' + Math.random().toString(36).slice(2, 7) + '_' + Date.now().toString(36).slice(-3)
}

// ============================================================
// Single row component
// ============================================================

interface OutlineRowItemProps {
  row: OutlineRow
  index: number
  isFocused: boolean
  onFocus: (index: number) => void
  onTextChange: (index: number, text: string) => void
  onToggleCollapse: (index: number) => void
  onToggleTask: (index: number) => void
  onKeyDown: (index: number, e: React.KeyboardEvent) => void
}

function OutlineRowItem({
  row, index, isFocused, onFocus, onTextChange,
  onToggleCollapse, onToggleTask, onKeyDown,
}: OutlineRowItemProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const lastTextRef = useRef(row.text)

  useEffect(() => {
    if (!isEditing && editorRef.current && editorRef.current.textContent !== row.text) {
      editorRef.current.textContent = row.text
      lastTextRef.current = row.text
    }
  }, [row.text, isEditing])

  useEffect(() => {
    if (isFocused && editorRef.current && !isEditing) {
      editorRef.current.focus()
      const sel = window.getSelection()
      const range = document.createRange()
      if (editorRef.current.firstChild) {
        range.setStart(editorRef.current.firstChild, editorRef.current.textContent?.length || 0)
        range.collapse(true)
        if (sel) {
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }
    }
  }, [isFocused, isEditing])

  if (row.hidden) return null
  if (index === 0 && row.path.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 select-none">
        <div className="flex-1">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className={cn(
              'outline-none text-lg font-semibold text-text-primary px-2 py-1 rounded cursor-text',
              'focus:bg-bg-primary focus:ring-1 focus:ring-primary-300 focus:shadow-sm',
            )}
            onFocus={() => { setIsEditing(true); onFocus(0) }}
            onBlur={() => {
              setIsEditing(false)
              const text = editorRef.current?.textContent || ''
              if (text !== lastTextRef.current) {
                lastTextRef.current = text
                onTextChange(0, text)
              }
            }}
            onInput={() => {
              const text = editorRef.current?.textContent || ''
              lastTextRef.current = text
              onTextChange(0, text)
            }}
            onKeyDown={(e) => onKeyDown(0, e)}
          >
            {row.text}
          </div>
        </div>
      </div>
    )
  }

  const indentPx = Math.max(0, (row.indent - 1) * 20)

  return (
    <div
      className={cn(
        'flex items-start gap-1 group select-none min-h-[32px] py-0.5',
        isFocused && 'bg-primary-50/50',
        'hover:bg-bg-elevated/30 transition-colors'
      )}
      style={{ paddingLeft: `${indentPx}px` }}
    >
      <div className="flex-shrink-0 w-5 h-6 flex items-center justify-center mt-0.5">
        {row.hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(index) }}
            className="flex items-center justify-center w-4 h-4 rounded hover:bg-bg-elevated transition-colors"
          >
            {row.collapsed ? (
              <ChevronRight className="h-3 w-3 text-text-muted" />
            ) : (
              <ChevronDown className="h-3 w-3 text-text-muted" />
            )}
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleTask(index) }}
            className="flex items-center justify-center w-4 h-4"
          >
            <CircleDot
              className={cn('h-2.5 w-2.5', row.isTask ? 'text-primary-400' : 'text-border-default')}
            />
          </button>
        )}
      </div>

      {row.isTask && (
        <div className="flex-shrink-0 w-5 h-6 flex items-center justify-center mt-0.5">
          <button
            onClick={() => onToggleTask(index)}
            className="flex items-center justify-center w-4 h-4 rounded border border-border-default hover:border-primary-400 transition-colors"
          >
            {row.status === 'done' ? (
              <Check className="h-3 w-3 text-status-success" />
            ) : (
              <Square className="h-3 w-3 text-text-muted" />
            )}
          </button>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            'outline-none text-sm leading-relaxed px-1 py-0.5 rounded cursor-text',
            'focus:bg-bg-primary focus:ring-1 focus:ring-primary-300 focus:shadow-sm',
            row.status === 'done' && 'text-text-muted line-through',
          )}
          onFocus={() => {
            setIsEditing(true)
            onFocus(index)
          }}
          onBlur={() => {
            setIsEditing(false)
            const text = editorRef.current?.textContent || ''
            if (text !== lastTextRef.current) {
              lastTextRef.current = text
              onTextChange(index, text)
            }
          }}
          onInput={() => {
            const text = editorRef.current?.textContent || ''
            lastTextRef.current = text
            onTextChange(index, text)
          }}
          onKeyDown={(e) => onKeyDown(index, e)}
          onClick={() => onFocus(index)}
        >
          {row.text}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Main Editor
// ============================================================

export function OutlineEditor({ treeData, onTreeChange }: OutlineEditorProps) {
  const [rows, setRows] = useState<OutlineRow[]>(() => treeToRows(treeData))
  const [focusedIndex, setFocusedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastTreeDataRef = useRef(JSON.stringify(treeData))

  useEffect(() => {
    const serialized = JSON.stringify(treeData)
    if (serialized !== lastTreeDataRef.current) {
      lastTreeDataRef.current = serialized
      const newRows = treeToRows(treeData)
      setRows(newRows)
    }
  }, [treeData])

  const syncTree = useCallback((updatedRows: OutlineRow[]) => {
    const rootRow = updatedRows[0]
    if (!rootRow) return
    const newTree = rowsToTree(rootRow, updatedRows)
    onTreeChange(newTree)
  }, [onTreeChange])

  const handleTextChange = useCallback((index: number, text: string) => {
    setRows(prev => {
      const next = [...prev]
      if (next[index]) {
        next[index] = { ...next[index]!, text }
      }
      setTimeout(() => syncTree(next), 10)
      return next
    })
  }, [syncTree])

  const handleToggleCollapse = useCallback((index: number) => {
    setRows(prev => {
      const next = [...prev]
      const row = next[index]
      if (!row || !row.hasChildren) return prev

      const newCollapsed = !row.collapsed
      next[index] = { ...row, collapsed: newCollapsed }

      for (let i = index + 1; i < next.length; i++) {
        if (next[i]!.indent <= row.indent) break
        let nowHidden = false
        for (let j = i - 1; j >= 0; j--) {
          if (next[j]!.indent < next[i]!.indent) {
            if (next[j]!.collapsed) {
              nowHidden = true
              break
            }
            if (next[j]!.indent <= next[i]!.indent - 2) break
          }
        }
        next[i] = { ...next[i]!, hidden: nowHidden }
      }
      return next
    })
  }, [])

  const handleToggleTask = useCallback((index: number) => {
    setRows(prev => {
      const next = [...prev]
      const row = next[index]
      if (!row) return prev
      if (row.isTask) {
        next[index] = { ...row, isTask: false, status: undefined }
      } else {
        next[index] = { ...row, isTask: true, status: 'todo', priority: 'medium' }
      }
      setTimeout(() => syncTree(next), 10)
      return next
    })
  }, [syncTree])

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    const editor = e.currentTarget as HTMLDivElement
    const sel = window.getSelection()
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null
    const text = editor.textContent || ''
    
    let isAtStart = false
    let isAtEnd = false
    if (range) {
      try {
        const preRange = range.cloneRange()
        preRange.selectNodeContents(editor)
        preRange.setEnd(range.startContainer, range.startOffset)
        isAtStart = preRange.toString().length === 0
        
        const postRange = range.cloneRange()
        postRange.selectNodeContents(editor)
        postRange.setStart(range.endContainer, range.endOffset)
        isAtEnd = postRange.toString().length === 0
      } catch {
        isAtStart = range.startOffset === 0
        isAtEnd = range.endOffset === text.length
      }
    }

    switch (e.key) {
      case 'Enter': {
        e.preventDefault()
        setRows(prev => {
          const next = [...prev]
          const currentRow = next[index]!
          const newRow: OutlineRow = {
            id: generateUid(),
            text: '',
            indent: currentRow.indent,
            path: [...currentRow.path],
            collapsed: false,
            hasChildren: false,
            hidden: currentRow.hidden,
            isTask: currentRow.isTask,
            status: currentRow.isTask ? 'todo' : undefined,
            priority: currentRow.isTask ? 'medium' : undefined,
            rawData: {},
          }

          if (!isAtEnd && range) {
            try {
              const afterCursor = text.slice(range.startOffset)
              next[index] = { ...currentRow, text: text.slice(0, range.startOffset) }
              newRow.text = afterCursor
            } catch {
              newRow.text = ''
            }
          }

          next.splice(index + 1, 0, newRow)
          return next
        })
        setTimeout(() => setFocusedIndex(index + 1), 0)
        return
      }

      case 'Tab': {
        e.preventDefault()
        if (index === 0) return
        setRows(prev => {
          const next = [...prev]
          if (e.shiftKey) {
            if (next[index]!.indent > 0) {
              const oldIndent = next[index]!.indent
              next[index] = { ...next[index]!, indent: oldIndent - 1 }
              for (let i = index + 1; i < next.length && next[i]!.indent > oldIndent; i++) {
                next[i] = { ...next[i]!, indent: next[i]!.indent - 1 }
              }
            }
          } else {
            if (index > 0 && next[index - 1]!.indent >= next[index]!.indent - 1) {
              const oldIndent = next[index]!.indent
              next[index] = { ...next[index]!, indent: oldIndent + 1 }
              for (let i = index + 1; i < next.length && next[i]!.indent > oldIndent; i++) {
                next[i] = { ...next[i]!, indent: next[i]!.indent + 1 }
              }
            }
          }
          setTimeout(() => syncTree(next), 10)
          return next
        })
        return
      }

      case 'Backspace': {
        if (text === '' && index > 0) {
          e.preventDefault()
          setRows(prev => {
            const next = [...prev]
            let end = index + 1
            while (end < next.length && next[end]!.indent > next[index]!.indent) {
              end++
            }
            next.splice(index, end - index)
            return next
          })
          setTimeout(() => setFocusedIndex(Math.max(0, index - 1)), 0)
        }
        return
      }

      case 'ArrowUp': {
        if (isAtStart && index > 0) {
          e.preventDefault()
          setFocusedIndex(index - 1)
        }
        return
      }

      case 'ArrowDown': {
        if (isAtEnd && index < rows.length - 1) {
          e.preventDefault()
          setFocusedIndex(index + 1)
        }
        return
      }
    }
  }, [rows.length, syncTree])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 bg-bg-primary"
      onClick={(e) => {
        if (e.target === containerRef.current) {
          // Clicked on empty space
        }
      }}
    >
      <div className="max-w-3xl mx-auto">
        {rows.map((row, index) => {
          if (row.hidden) return null
          return (
            <OutlineRowItem
              key={row.id}
              row={row}
              index={index}
              isFocused={focusedIndex === index}
              onFocus={setFocusedIndex}
              onTextChange={handleTextChange}
              onToggleCollapse={handleToggleCollapse}
              onToggleTask={handleToggleTask}
              onKeyDown={handleKeyDown}
            />
          )
        })}
      </div>
    </div>
  )
}
