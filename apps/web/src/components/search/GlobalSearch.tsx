import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FolderKanban, FileText, CheckSquare, ArrowUp, ArrowDown, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { useUIStore } from '@/stores/uiStore'
import { EmptyState } from '@/components/ui/EmptyState'

interface SearchResult {
  id: string
  type: 'project' | 'node' | 'task'
  title: string
  projectId: string
  projectName: string
  projectColor: string
  nodeUid?: string
  status?: string
  priority?: string
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const { isSearchOpen, setSearchOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const loadSearchData = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setIsLoading(true)
    const term = q.trim().toLowerCase()

    const [projects, mindmaps, tasks] = await Promise.all([
      db.projects.toArray(),
      db.mindmaps.toArray(),
      db.tasks.toArray(),
    ])

    const projectMap = new Map(projects.map(p => [p.id, p]))
    const searchResults: SearchResult[] = []

    for (const p of projects) {
      if (!p.is_archived && p.name.toLowerCase().includes(term)) {
        searchResults.push({
          id: `project:${p.id}`,
          type: 'project',
          title: p.name,
          projectId: p.id,
          projectName: p.name,
          projectColor: p.color,
        })
      }
    }

    const taskNodeUids = new Set(tasks.map(t => t.node_uid))

    for (const mm of mindmaps) {
      const project = projectMap.get(mm.project_id)
      if (!project || project.is_archived) continue

      function traverseNodes(node: Record<string, unknown>) {
        const data = (node.data || {}) as Record<string, unknown>
        const text = String(data.text || '')
        const uid = String(data.uid || '')

        if (text.toLowerCase().includes(term)) {
          if (!taskNodeUids.has(uid)) {
            searchResults.push({
              id: `node:${mm.project_id}:${uid}`,
              type: 'node',
              title: text,
              projectId: mm.project_id,
              projectName: project.name,
              projectColor: project.color,
              nodeUid: uid,
            })
          }
        }

        const children = (node.children || []) as Record<string, unknown>[]
        children.forEach(traverseNodes)
      }

      const tree = mm.tree_data as Record<string, unknown>
      if (tree) {
        traverseNodes(tree)
      }
    }

    for (const t of tasks) {
      const project = projectMap.get(t.project_id)
      if (!project || project.is_archived) continue

      if (t.title.toLowerCase().includes(term)) {
        searchResults.push({
          id: `task:${t.id}`,
          type: 'task',
          title: t.title,
          projectId: t.project_id,
          projectName: project.name,
          projectColor: project.color,
          nodeUid: t.node_uid,
          status: t.status,
          priority: t.priority,
        })
      }
    }

    searchResults.sort((a, b) => {
      const typeOrder = { project: 0, task: 1, node: 2 }
      const diff = typeOrder[a.type] - typeOrder[b.type]
      if (diff !== 0) return diff
      return a.title.localeCompare(b.title)
    })

    setResults(searchResults)
    setSelectedIndex(0)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSearchData(query)
    }, 100)
    return () => clearTimeout(timer)
  }, [query, loadSearchData])

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isSearchOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isSearchOpen) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault()
          setSearchOpen(true)
        }
        return
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          setSearchOpen(false)
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter': {
          e.preventDefault()
          const result = results[selectedIndex]
          if (result) {
            setSearchOpen(false)
            if (result.type === 'project') {
              navigate(`/project/${result.projectId}`)
            } else {
              navigate(`/project/${result.projectId}?nodeUid=${result.nodeUid}`)
            }
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSearchOpen, results, selectedIndex, setSearchOpen, navigate])

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIndex] as HTMLElement | undefined
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const groupedResults = useMemo(() => {
    const groups = new Map<string, SearchResult[]>()
    for (const r of results) {
      const key = r.projectId
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(r)
    }
    return groups
  }, [results])

  if (!isSearchOpen) return null

  const priorityDot = (p?: string) => {
    const colors: Record<string, string> = {
      high: 'bg-priority-high',
      medium: 'bg-priority-medium',
      low: 'bg-priority-low',
      urgent: 'bg-priority-urgent',
    }
    return <span className={cn('h-1.5 w-1.5 rounded-full', colors[p || ''] || 'bg-text-muted')} />
  }

  const statusLabel = (s?: string) => {
    const labels: Record<string, string> = {
      todo: '待办',
      in_progress: '进行中',
      done: '已完成',
      cancelled: '已取消',
    }
    return labels[s || ''] || ''
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => setSearchOpen(false)}
      />

      <div className="relative w-full max-w-[640px] mx-4 bg-bg-surface rounded-xl shadow-lg border border-border-default overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-default">
          <Search className="h-5 w-5 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索项目、节点或任务..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center h-6 px-1.5 rounded bg-bg-elevated border border-border-default text-[10px] font-mono text-text-muted">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
          {isLoading && query.trim() && (
            <div className="px-4 py-6 text-center text-xs text-text-muted">
              搜索中...
            </div>
          )}

          {!isLoading && query.trim() && results.length === 0 && (
            <EmptyState
              icon={SearchX}
              title="未找到匹配结果"
              description={`未找到与 "${query.trim()}" 相关的项目、节点或任务`}
              tone="slate"
              compact
            />
          )}

          {Array.from(groupedResults.entries()).map(([projectId, items]) => {
            const project = items[0]
            return (
              <div key={projectId}>
                <div className="px-3 py-1.5 flex items-center gap-2">
                  {/* project.projectColor 是 Tailwind 颜色名 (indigo/teal/amber/...) 而非 hex,
                      用 bg-project-{color} 类名而非 inline style 才能正确显示颜色 (Bug 6) */}
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full shrink-0',
                      project.projectColor ? `bg-project-${project.projectColor}` : 'bg-text-muted'
                    )}
                  />
                  <span className="text-[11px] font-medium text-text-muted truncate">
                    {project.projectName}
                  </span>
                </div>
                {items.map((item) => {
                  const globalIdx = results.findIndex(r => r.id === item.id)
                  const isSelected = globalIdx === selectedIndex
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      onClick={() => {
                        setSearchOpen(false)
                        if (item.type === 'project') {
                          navigate(`/project/${item.projectId}`)
                        } else {
                          navigate(`/project/${item.projectId}?nodeUid=${item.nodeUid}`)
                        }
                      }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors',
                        isSelected
                          ? 'bg-primary-subtle text-primary-700'
                          : 'text-text-secondary hover:bg-bg-elevated'
                      )}
                    >
                      {item.type === 'project' && (
                        <FolderKanban className="h-4 w-4 shrink-0 text-primary-500" />
                      )}
                      {item.type === 'node' && (
                        <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                      )}
                      {item.type === 'task' && (
                        <CheckSquare className="h-4 w-4 shrink-0 text-text-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{item.title}</div>
                        {item.type === 'task' && (
                          <div className="flex items-center gap-2 mt-0.5">
                            {priorityDot(item.priority)}
                            <span className="text-[10px] text-text-muted">
                              {statusLabel(item.status)}
                            </span>
                          </div>
                        )}
                      </div>
                      {item.type === 'project' && (
                        <span className="text-[10px] text-primary-500 font-medium shrink-0">
                          项目
                        </span>
                      )}
                      {item.type === 'task' && (
                        <span className="text-[10px] text-text-muted shrink-0">任务</span>
                      )}
                      {item.type === 'node' && (
                        <span className="text-[10px] text-text-muted shrink-0">节点</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-border-default bg-bg-elevated/50">
          <div className="flex items-center gap-3 text-[10px] text-text-muted">
            <span className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" />
              选择
            </span>
            <span>Enter 跳转</span>
          </div>
          <span className="text-[10px] text-text-muted">
            {results.length} 个结果
          </span>
        </div>
      </div>
    </div>
  )
}
