import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import MindMap from 'simple-mind-map'
import Export from 'simple-mind-map/src/plugins/Export.js'
import type { LocalMindmap } from '@/lib/db'
import { syncTasksFromTree } from '@/lib/db'
import { cn } from '@/lib/utils'
import { CheckSquare, Square, CalendarDays, LayoutTemplate, Network, GitBranch, X, PanelRight, Download, Image, FileText, FileCode } from 'lucide-react'
import { NodeDetailSidebar } from './NodeDetailSidebar'
import { toast } from 'sonner'

// eslint-disable-next-line react-hooks/rules-of-hooks
MindMap.usePlugin(Export)

export interface MindMapCanvasRef {
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  getZoom: () => number
}

interface MindMapCanvasProps {
  projectId: string
  mindmap?: LocalMindmap | null
  className?: string
  onDataChange?: (data: Record<string, unknown>) => void
  onViewStateChange?: (viewState: Record<string, unknown>) => void
  highlightNodeUid?: string | null
  onZoomChange?: (zoom: number) => void
}

const DEFAULT_TREE_DATA = {
  data: {
    text: '中心主题',
    uid: 'root',
    expand: true,
    isRoot: true,
    children: [],
  },
}


const AVAILABLE_LAYOUTS = [
  { key: 'logicalStructure', label: '逻辑图', icon: LayoutTemplate },
  { key: 'mindMap', label: '思维导图', icon: Network },
  { key: 'organizationStructure', label: '组织结构', icon: GitBranch },
] as const

type LayoutKey = typeof AVAILABLE_LAYOUTS[number]['key']

function buildMindMapData(mindmap: LocalMindmap | null | undefined): Record<string, unknown> {
  if (!mindmap?.tree_data) return DEFAULT_TREE_DATA
  return mindmap.tree_data as Record<string, unknown>
}

// 简单防抖 + 互斥锁: simple-mind-map 在快速键入 (Tab + keyboard.type + Enter)
// 时会在毫秒级触发多次 data_change,导致 syncTasksFromTree 并发执行。
// 这里在 module 级别维护一个 pending 最新数据 + 互斥锁,
// 保证最终只有一次同步生效 (Bug 5)。
const taskSyncState = new Map<string, { latestData: Record<string, unknown>; timer: ReturnType<typeof setTimeout> | null }>()
const taskSyncRunning = new Set<string>()

function scheduleTasksSync(projectId: string, treeData: Record<string, unknown>) {
  let state = taskSyncState.get(projectId)
  if (!state) {
    state = { latestData: treeData, timer: null }
    taskSyncState.set(projectId, state)
  } else {
    state.latestData = treeData
    if (state.timer) clearTimeout(state.timer)
  }

  state.timer = setTimeout(async () => {
    state.timer = null
    // 如果上一次同步还在跑,把最新数据再排一次 (尾随)
    if (taskSyncRunning.has(projectId)) {
      scheduleTasksSync(projectId, state.latestData)
      return
    }
    taskSyncRunning.add(projectId)
    try {
      await syncTasksFromTree(projectId, state.latestData)
    } catch (e) {
      console.warn('[MindMapCanvas] syncTasksFromTree failed:', e)
    } finally {
      taskSyncRunning.delete(projectId)
      // 如果期间又有新的更新,补一次
      if (state.latestData !== treeData) {
        scheduleTasksSync(projectId, state.latestData)
      }
    }
  }, 80)
}

export const MindMapCanvas = forwardRef<MindMapCanvasRef, MindMapCanvasProps>(function MindMapCanvas({
  projectId,
  mindmap,
  className,
  onDataChange,
  highlightNodeUid,
  onViewStateChange,
  onZoomChange,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mindMapRef = useRef<MindMap | null>(null)
  const activeNodeRef = useRef<unknown>(null)
  // Keep latest projectId in a ref so async data_change callbacks always use the
  // current value, never the stale closure value from when the instance was created.
  const projectIdRef = useRef<string>(projectId)
  projectIdRef.current = projectId
  // 缓存 instance 当前最新的节点树数据 (Bug 6):
  // 切换 layout 时 React state `mindmap` 是初始加载时的快照,
  // 而 data_change 异步写 IDB 后,父组件 mindmap state 不会更新,
  // 直接 destroy + init 会用旧数据重建 → 子节点全部丢失。
  // 这里缓存 getData() 拿到的最新数据,init 时优先用 ref 里的最新数据。
  const latestTreeRef = useRef<Record<string, unknown> | null>(null)
  const [activeNodeData, setActiveNodeData] = useState<Record<string, unknown> | null>(null)
  const [activeNodePos, setActiveNodePos] = useState<{ x: number; y: number } | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [layout, setLayout] = useState<LayoutKey>(() => {
    const saved = mindmap?.view_state?.layout as LayoutKey
    return AVAILABLE_LAYOUTS.find(l => l.key === saved) ? saved : 'logicalStructure'
  })
  const [exportOpen, setExportOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  // 用 ref 持有最新 layout,避免 layout 变化导致 initMindMap useCallback 重建,
  // 进而触发 [initMindMap, projectId] effect 与 [layout] effect 竞争 (Bug 6 竞态)。
  const layoutRef = useRef<LayoutKey>(layout)
  layoutRef.current = layout

  // Bug 6 续: useState lazy initializer 只在 mount 时跑一次,
  // 但 ProjectMindMapPage 异步加载 mindmap prop 在 mount 之后才到达。
  // 这里在 mindmap prop 到达后同步 layout,保证刷新页面后恢复用户上次选择的布局。
  // 仅当 saved layout 与当前 state 不同时才 setLayout,
  // 避免 [layout] effect 死循环 (setLayout → 重建 → mindmap 不变 → 不再 set)。
  useEffect(() => {
    if (!mindmap) return
    const saved = mindmap.view_state?.layout as LayoutKey | undefined
    if (saved && AVAILABLE_LAYOUTS.find(l => l.key === saved) && saved !== layout) {
      setLayout(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mindmap])

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mindMapRef.current as any)?.view?.enlarge()
      const scale = Math.round(((mindMapRef.current as any)?.view?.scale || 1) * 100)
      onZoomChange?.(scale)
    },
    zoomOut: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mindMapRef.current as any)?.view?.narrow()
      const scale = Math.round(((mindMapRef.current as any)?.view?.scale || 1) * 100)
      onZoomChange?.(scale)
    },
    resetZoom: () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mindMapRef.current as any)?.view?.fit()
      } catch {
        // ignore: View.fit 可能因 rbox 暂不可用失败
      }
      const scale = Math.round(((mindMapRef.current as any)?.view?.scale || 1) * 100)
      onZoomChange?.(scale)
    },
    getZoom: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Math.round(((mindMapRef.current as any)?.view?.scale || 1) * 100)
    },
  }), [onZoomChange])

  const initMindMap = useCallback(() => {
    if (!containerRef.current) return
    if (mindMapRef.current) {
      mindMapRef.current.destroy()
      mindMapRef.current = null
    }

    // Bug 6: 优先使用缓存的最新数据 (仅 layout effect 显式写入),
    // 否则回退到 prop 中的初始数据。用完后立即清空,避免污染下次重建。
    const data = latestTreeRef.current ?? buildMindMapData(mindmap)
    latestTreeRef.current = null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = new MindMap({
      el: containerRef.current,
      data,
      layout: layoutRef.current as any,
      theme: 'default',
      readonly: false,
      enableFreeDrag: false,
      // 关闭库内部自动 fit: 节点的 SVG <g> 元素在 onRenderEnd 时可能尚未稳定,
      // 触发 View.fit → G.rbox 报 "Getting rbox of element 'g' is not possible"。
      // 我们在 init 末尾自己延迟 fit 并 try/catch 兜底。
      fit: false,
      nodeTextEditZIndex: 1000,
      selectTranslateLimit: 100,
      customInnerElsAppendTo: null,
      initRootNodePosition: null,
      useLeftKeySelectionRightKeyDrag: false,
      customHandleMousewheel: null,
      mousewheelAction: 'zoom',
      mousewheelZoomActionReverse: false,
      enableAutoEnterTextEditWhenKeydown: true,
      selectTextOnEnterEditText: true,
      // 修复 placeholder 截断：将默认插入节点的文本设为空，
      // 配合 selectTextOnEnterEditText 自动选中，用户直接输入即可。
      defaultInsertSecondLevelNodeText: '',
      defaultInsertBelowSecondLevelNodeText: '',
      // Allow shortcuts globally (not only when mouse in SVG)
      enableShortcutOnlyWhenMouseInSvg: false,
    } as any)

    instance.on('data_change', (newData: Record<string, unknown>) => {
      // 注意:不要写 latestTreeRef,以免污染缓存。
      // latestTreeRef 只在 [layout] effect 中显式设置,用于一次性重建。
      // 否则 simple-mind-map init 完成后会立刻触发一次 data_change,
      // 把 DEFAULT_TREE_DATA 写入 ref,后续 mindmap prop 更新时反而读到过期数据。
      onDataChange?.(newData)
      // 改为防抖同步,避免快速 data_change 竞态导致 task 记录丢失 (Bug 5)
      scheduleTasksSync(projectIdRef.current, newData)
    })

    instance.on('node_active', (node: unknown) => {
      activeNodeRef.current = node
      // node is the renderer node object, node.nodeData.data holds the real data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodeData = (node as any)?.nodeData?.data || {}
      setActiveNodeData(node ? (nodeData as Record<string, unknown>) : null)

      if (node && containerRef.current) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const group = (node as any).group
          if (group && group.node) {
            const rect = group.node.getBoundingClientRect()
            const containerRect = containerRef.current.getBoundingClientRect()
            setActiveNodePos({
              x: rect.right - containerRect.left + 8,
              y: rect.top - containerRect.top,
            })
          } else {
            setActiveNodePos(null)
          }
        } catch {
          setActiveNodePos(null)
        }
      } else {
        setActiveNodePos(null)
      }
    })

    // Double-click to open detail sidebar
    instance.on('node_dbclick', () => {
      setDetailOpen(true)
    })

    // Register custom T key shortcut via instance.keyCommand
    const toggleTaskShortcut = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const active = (instance as any).renderer?.activeNodeList?.[0]
      if (!active) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodeData = active.nodeData || {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (nodeData as any).data || {}
      const isTask = Boolean(data._isTask)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(instance as any).execCommand('SET_NODE_DATA', active, {
        _isTask: !isTask,
        _status: isTask ? undefined : 'todo',
        _priority: isTask ? undefined : 'medium',
        fillColor: isTask ? undefined : '#eff6ff',
        borderColor: isTask ? undefined : '#93c5fd',
        color: isTask ? undefined : '#1e40af',
      })
      // Directly update React state so toolbar refreshes immediately
      setActiveNodeData(prev => ({
        ...prev,
        _isTask: !isTask,
        _status: !isTask ? 'todo' : undefined,
        _priority: !isTask ? 'medium' : undefined,
      }))
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(instance as any).keyCommand.addShortcut('t', toggleTaskShortcut)

    mindMapRef.current = instance
    // Expose for E2E automation via Playwright evaluate (dev only)
    if (import.meta.env.DEV) {
      ;(window as any).__mindMap = instance
    }

    // 延迟 fit: 等 DOM 完成布局 + 节点全部挂载,再用 try/catch 兜底
    // 避免 simple-mind-map 内部 View.fit → rbox 报错
    const safeFit = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(instance as any)?.view?.fit?.()
      } catch {
        // ignore: 节点 SVG <g> 尚未稳定,跳过本次 fit
      }
    }
    // 多重延迟,确保 root / 子节点都完成渲染
    requestAnimationFrame(() => {
      setTimeout(safeFit, 50)
      setTimeout(safeFit, 300)
    })

    // Handle highlight node from global task navigation
    if (highlightNodeUid) {
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(instance as any).execCommand('GO_TARGET_NODE', highlightNodeUid, (targetNode: unknown) => {
          if (targetNode) {
            // Add a visual flash/highlight effect
            const el = (targetNode as any)?.group?.node
            if (el && el.style) {
              el.style.transition = 'filter 300ms ease'
              el.style.filter = 'drop-shadow(0 0 8px rgba(79, 70, 229, 0.6))'
              setTimeout(() => {
                el.style.filter = ''
              }, 1200)
            }
          }
        })
      }, 400)
    }
  }, [mindmap, onDataChange, highlightNodeUid])

  useEffect(() => {
    initMindMap()
    return () => {
      if (mindMapRef.current) {
        mindMapRef.current.destroy()
        mindMapRef.current = null
      }
      // cleanup is void
    }
  }, [initMindMap, projectId])

  // Close export menu on click outside
  useEffect(() => {
    if (!exportOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [exportOpen])

  // Re-init when layout changes
  useEffect(() => {
    // Save layout preference to parent
    onViewStateChange?.({ layout })
    if (!mindMapRef.current) return
    // Bug 6: destroy 前先从 instance 拿最新数据,
    // 缓存到 latestTreeRef 并同步触发 onDataChange (写入 IDB),
    // 避免 initMindMap 重建时使用过期的 mindmap state 数据。
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fullData = (mindMapRef.current as any)?.getData?.(true)
      const root = fullData?.root
      if (root && typeof root === 'object') {
        const treeData = { ...root, smmVersion: fullData?.smmVersion } as Record<string, unknown>
        latestTreeRef.current = treeData
        // 把当前 layout 一起传入 onDataChange,确保 view_state.layout 同步写入 IDB
        // 否则 handleDataChange 在 onViewStateChange 完成前跑会用空 view_state 覆盖。
        onDataChange?.(treeData, { layout })
      }
    } catch {
      // 拿到最新数据失败,fallback 到 prop 数据
    }
    mindMapRef.current.destroy()
    mindMapRef.current = null
    initMindMap()
    return () => {
      // cleanup is void
    }
  }, [layout]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleTask = useCallback(() => {
    const instance = mindMapRef.current
    const node = activeNodeRef.current
    if (!instance || !node) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeData = (node as any).nodeData || {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (nodeData as any).data || {}
    const curIsTask = Boolean(data._isTask)
    const newIsTask = !curIsTask

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(instance as any).execCommand('SET_NODE_DATA', node, {
      _isTask: newIsTask,
      _status: newIsTask ? 'todo' : undefined,
      _priority: newIsTask ? 'medium' : undefined,
      fillColor: newIsTask ? '#eff6ff' : undefined,
      borderColor: newIsTask ? '#93c5fd' : undefined,
      color: newIsTask ? '#1e40af' : undefined,
    })

    setActiveNodeData(prev => ({
      ...prev,
      _isTask: newIsTask,
      _status: newIsTask ? 'todo' : undefined,
      _priority: newIsTask ? 'medium' : undefined,
    }))
  }, [])

  const isTask = Boolean(activeNodeData?._isTask)

  const handleUpdateNodeData = useCallback((updates: Record<string, unknown>) => {
    const instance = mindMapRef.current
    const node = activeNodeRef.current
    if (!instance || !node) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(instance as any).execCommand('SET_NODE_DATA', node, updates)
    setActiveNodeData(prev => (prev ? { ...prev, ...updates } : prev))
  }, [])

  const handleExport = useCallback(async (type: 'png' | 'svg' | 'md') => {
    const instance = mindMapRef.current
    if (!instance) return
    try {
      toast.info('正在导出...')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doExport = (instance as any).doExport
      if (!doExport) {
        toast.error('导出插件未就绪')
        return
      }
      if (type === 'png') {
        await doExport.png('mindflow', true)
      } else if (type === 'svg') {
        await doExport.svg('mindflow', true)
      } else if (type === 'md') {
        await doExport.md('mindflow', true)
      }
      toast.success('导出成功')
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('导出失败', {
        description: err instanceof Error ? err.message : '请重试',
      })
    }
    setExportOpen(false)
  }, [])

  return (
    <div className={cn('w-full h-full relative dot-grid bg-bg-primary transition-colors duration-300', className)}>
      <div ref={containerRef} className="w-full h-full outline-none" />

      {/* Floating toolbar for selected node */}
      {activeNodeData && activeNodePos && (
        <div
          className="absolute z-50 flex flex-col gap-1 bg-bg-surface border border-border-default rounded-lg shadow-md p-1.5 animate-in fade-in zoom-in-95 duration-150"
          style={{ left: activeNodePos.x, top: activeNodePos.y }}
        >
          <button
            onClick={() => setDetailOpen(true)}
            className="flex items-center gap-2 h-8 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
          >
            <PanelRight className="h-3.5 w-3.5" />
            查看详情
          </button>
          <button
            onClick={handleToggleTask}
            className={cn(
              'flex items-center gap-2 h-8 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
              isTask
                ? 'bg-primary-subtle text-primary-600'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
            )}
          >
            {isTask ? (
              <>
                <CheckSquare className="h-3.5 w-3.5" />
                已标记为任务
              </>
            ) : (
              <>
                <Square className="h-3.5 w-3.5" />
                转为任务
              </>
            )}
          </button>
          {isTask && (
            <>
              <div className="flex items-center gap-1 pt-1 border-t border-border-default">
                <span className="text-[10px] text-text-muted ml-1">优先级</span>
                {(['high', 'medium', 'low'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      const instance = mindMapRef.current
                      if (!instance || !activeNodeRef.current) return
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ;(instance as any).execCommand('SET_NODE_DATA', activeNodeRef.current, {
                        _priority: p,
                      })
                      setActiveNodeData(prev => ({ ...prev, _priority: p }))
                    }}
                    className={cn(
                      'h-5 w-5 rounded-full border-2 transition-all',
                      p === 'high' && 'border-priority-high',
                      p === 'medium' && 'border-priority-medium',
                      p === 'low' && 'border-priority-low',
                      activeNodeData._priority === p
                        ? 'bg-bg-elevated scale-110'
                        : 'opacity-40 hover:opacity-80'
                    )}
                    title={p}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 pt-1 border-t border-border-default">
                <CalendarDays className="h-3 w-3 text-text-muted ml-1" />
                <span className="text-[10px] text-text-muted">截止</span>
                <input
                  type="date"
                  value={activeNodeData._dueDate ? String(activeNodeData._dueDate).slice(0, 10) : ''}
                  onChange={(e) => {
                    const instance = mindMapRef.current
                    if (!instance || !activeNodeRef.current) return
                    const dateVal = e.target.value
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ;(instance as any).execCommand('SET_NODE_DATA', activeNodeRef.current, {
                      _dueDate: dateVal ? new Date(dateVal).toISOString() : undefined,
                    })
                    setActiveNodeData(prev => ({
                      ...prev,
                      _dueDate: dateVal ? new Date(dateVal).toISOString() : undefined,
                    }))
                  }}
                  className="h-6 px-1.5 rounded border border-border-default bg-bg-primary text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
                              {!!activeNodeData._dueDate && (
                  <button
                    onClick={() => {
                      const instance = mindMapRef.current
                      if (!instance || !activeNodeRef.current) return
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ;(instance as any).execCommand('SET_NODE_DATA', activeNodeRef.current, {
                        _dueDate: undefined,
                      })
                      setActiveNodeData(prev => ({ ...prev, _dueDate: undefined }))
                    }}
                    className="text-text-muted hover:text-status-error"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Layout switcher + Export */}
      <div className="absolute top-3 left-3 flex items-center gap-1 bg-bg-surface/90 backdrop-blur border border-border-default rounded-lg shadow-sm z-40 px-1 py-1">
        {AVAILABLE_LAYOUTS.map((l) => {
          const Icon = l.icon
          return (
            <button
              key={l.key}
              onClick={() => setLayout(l.key)}
              className={cn(
                'flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-medium transition-colors',
                layout === l.key
                  ? 'bg-primary-subtle text-primary-600'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
              )}
              title={l.label}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{l.label}</span>
            </button>
          )
        })}
        <div className="w-px h-4 bg-border-default mx-0.5" />
        <div className="relative">
          <button
            onClick={() => setExportOpen(v => !v)}
            className={cn(
              'flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-medium transition-colors',
              exportOpen
                ? 'bg-primary-subtle text-primary-600'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
            )}
            title="导出"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">导出</span>
          </button>
          {exportOpen && (
            <div ref={exportMenuRef} className="absolute left-0 top-8 z-50 w-36 bg-bg-surface border border-border-default rounded-lg shadow-lg py-1 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => handleExport('png')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
              >
                <Image className="h-3.5 w-3.5" />
                导出 PNG
              </button>
              <button
                onClick={() => handleExport('svg')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
              >
                <FileCode className="h-3.5 w-3.5" />
                导出 SVG
              </button>
              <button
                onClick={() => handleExport('md')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                导出 Markdown
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-bg-surface/90 backdrop-blur border border-border-default rounded-full px-4 py-1.5 shadow-sm z-40">
        <span className="text-[10px] text-text-muted">Enter 添加节点</span>
        <span className="text-border-default">|</span>
        <span className="text-[10px] text-text-muted">Tab 添加子节点</span>
        <span className="text-border-default">|</span>
        <span className="text-[10px] text-text-muted">T 转为任务</span>
        <span className="text-border-default">|</span>
        <span className="text-[10px] text-text-muted">滚轮缩放</span>
      </div>

      {/* Node Detail Sidebar */}
      <NodeDetailSidebar
        open={detailOpen}
        onOpenChange={setDetailOpen}
        nodeData={activeNodeData}
        projectId={projectId}
        onUpdateNodeData={handleUpdateNodeData}
      />
    </div>
  )
})
