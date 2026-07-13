import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import MindMap from 'simple-mind-map'
import KeyboardNavigation from 'simple-mind-map/src/plugins/KeyboardNavigation.js'
import Export from 'simple-mind-map/src/plugins/Export.js'
import ExportPDF from 'simple-mind-map/src/plugins/ExportPDF.js'
import Select from 'simple-mind-map/src/plugins/Select.js'
import type { LocalMindmap } from '@/lib/db'
import { syncTasksFromTree } from '@/lib/db'
import { cn } from '@/lib/utils'
import { devLog, devError, devWarn } from '@/lib/devConsole'
import { CheckSquare, Square, CalendarDays, LayoutTemplate, Network, GitBranch, X, PanelRight, Download, Image, FileText, FileCode, FileInput, Trash2, ChevronsDown, ChevronsUp } from 'lucide-react'
import { toast } from 'sonner'

// 注册插件
// oxlint-disable-next-line react-hooks/rules-of-hooks
MindMap.usePlugin(Export)
// oxlint-disable-next-line react-hooks/rules-of-hooks
MindMap.usePlugin(ExportPDF)
// oxlint-disable-next-line react-hooks/rules-of-hooks
MindMap.usePlugin(KeyboardNavigation)
// oxlint-disable-next-line react-hooks/rules-of-hooks
MindMap.usePlugin(Select)

export interface MindMapCanvasRef {
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  getZoom: () => number
  updateActiveNode: (updates: Record<string, unknown>) => void
}

interface MindMapCanvasProps {
  projectId: string
  mindmap?: LocalMindmap | null
  className?: string
  onDataChange?: (data: Record<string, unknown>) => void
  onViewStateChange?: (viewState: Record<string, unknown>) => void
  highlightNodeUid?: string | null
  onZoomChange?: (zoom: number) => void
  onNodeActive?: (nodeData: Record<string, unknown> | null) => void
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
      devWarn('[MindMapCanvas] syncTasksFromTree failed:', e)
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
  onNodeActive,
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
  // Refs for dynamic props so initMindMap can have stable deps (no destroy+reinit flash).
  const onDataChangeRef = useRef(onDataChange)
  onDataChangeRef.current = onDataChange
  const onViewStateChangeRef = useRef(onViewStateChange)
  onViewStateChangeRef.current = onViewStateChange
  const highlightNodeUidRef = useRef(highlightNodeUid)
  highlightNodeUidRef.current = highlightNodeUid
  const mindmapRef = useRef(mindmap)
  mindmapRef.current = mindmap
  const onZoomChangeRef = useRef(onZoomChange)
  onZoomChangeRef.current = onZoomChange
  const prevProjectIdRef = useRef(projectId)

  const [activeNodeData, setActiveNodeData] = useState<Record<string, unknown> | null>(null)
  const [activeNodePos, setActiveNodePos] = useState<{ x: number; y: number } | null>(null)
  const [layout, setLayout] = useState<LayoutKey>(() => {
    const saved = mindmap?.view_state?.layout as LayoutKey
    return AVAILABLE_LAYOUTS.find(l => l.key === saved) ? saved : 'logicalStructure'
  })
  const [exportOpen, setExportOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  // 标记是否跳过 simple-mind-map 初始化后自动触发的首次 data_change
  // 避免 mindmap prop 尚未到达时使用 DEFAULT_TREE_DATA 初始化,
  // 导致 data_change 把默认数据写回 IDB,覆盖已有正确数据 (Bug 6 延伸)。
  const initialChangeRef = useRef(true)
  // 标记当前 instance 是否使用了 DEFAULT_TREE_DATA 初始化。
  // 如果是，则所有 data_change 都不触发 onDataChange，直到下次重建时数据已到达。
  const usingDefaultDataRef = useRef(false)
  // 用 ref 持有最新 layout,避免 layout 变化导致 initMindMap useCallback 重建,
  // 进而触发 [initMindMap, projectId] effect 与 [layout] effect 竞争 (Bug 6 竞态)。
  const layoutRef = useRef<LayoutKey>(layout)
  layoutRef.current = layout
  // 跳过 [layout] effect 的 mount 首次执行，避免 initMindMap 创建 instance 后立即被 destroy+reinit
  const layoutEffectFirstRun = useRef(true)

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
      onZoomChangeRef.current?.(scale)
    },
    zoomOut: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mindMapRef.current as any)?.view?.narrow()
      const scale = Math.round(((mindMapRef.current as any)?.view?.scale || 1) * 100)
      onZoomChangeRef.current?.(scale)
    },
    resetZoom: () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mindMapRef.current as any)?.view?.fit()
      } catch {
        // ignore: View.fit 可能因 rbox 暂不可用失败
      }
      const scale = Math.round(((mindMapRef.current as any)?.view?.scale || 1) * 100)
      onZoomChangeRef.current?.(scale)
    },
    getZoom: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Math.round(((mindMapRef.current as any)?.view?.scale || 1) * 100)
    },
    updateActiveNode: (updates: Record<string, unknown>) => {
      const instance = mindMapRef.current
      const node = activeNodeRef.current
      if (!instance || !node) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(instance as any).execCommand('SET_NODE_DATA', node, updates)
      setActiveNodeData(prev => (prev ? { ...prev, ...updates } : prev))
    },
  }), [onZoomChangeRef])

  const initMindMap = useCallback(() => {
    if (!containerRef.current) return
    if (mindMapRef.current) {
      mindMapRef.current.destroy()
      mindMapRef.current = null
    }

    // 重置首次 data_change 跳过标志 (Bug 6 延伸)
    initialChangeRef.current = true

    // 优先使用缓存的最新数据 (data_change handler 中写入的用户编辑),
    // 否则回退到 prop 中的初始数据。用完后立即清空,避免污染下次重建。
    const currentMindmap = mindmapRef.current
    const data = latestTreeRef.current ?? buildMindMapData(currentMindmap)
    const rootText = ((data as any)?.data?.text) || '(no text)'
    const hasTreeData = !!currentMindmap?.tree_data
    devLog('[MindMapCanvas] initMindMap called — mindmap?.tree_data:', hasTreeData, '| rootText:', rootText, '| layout:', layoutRef.current)
    latestTreeRef.current = null
    // 标记当前 instance 是否使用了默认数据初始化
    // (当 mindmap prop 尚未到达时 buildMindMapData 会返回 DEFAULT_TREE_DATA)
    usingDefaultDataRef.current = !currentMindmap?.tree_data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = new MindMap({
      el: containerRef.current,
      data,
      layout: layoutRef.current as any,
      theme: 'default',
      readonly: false,
      enableFreeDrag: true,
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
      const newRootText = ((newData as any)?.data?.text) || '(no text)'
      devLog('[MindMapCanvas] data_change — usingDefault:', usingDefaultDataRef.current, '| initialChange:', initialChangeRef.current, '| rootText:', newRootText)
      // 如果当前 instance 是用 DEFAULT_TREE_DATA 初始化的（mindmap prop 尚未到达），
      // 跳过所有 data_change，避免把默认数据写回 IDB 覆盖正确数据 (Bug 6 延伸)。
      if (usingDefaultDataRef.current) return
      // 跳过 simple-mind-map 初始化后自动触发的首次 data_change
      if (initialChangeRef.current) {
        initialChangeRef.current = false
        return
      }
      // 缓存最新数据到 latestTreeRef,供 layout 变化重建 instance 时使用
      latestTreeRef.current = newData
      onDataChangeRef.current?.(newData)
      // 改为防抖同步,避免快速 data_change 竞态导致 task 记录丢失 (Bug 5)
      scheduleTasksSync(projectIdRef.current, newData)
    })

    instance.on('node_active', (node: unknown) => {
      activeNodeRef.current = node
      // node is the renderer node object, node.nodeData.data holds the real data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodeData = (node as any)?.nodeData?.data || {}
      const data = node ? (nodeData as Record<string, unknown>) : null
      setActiveNodeData(data)
      onNodeActive?.(data)

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

    // Handle highlight node from global task navigation (init-time only)
    const huid = highlightNodeUidRef.current
    if (huid) {
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(instance as any).execCommand('GO_TARGET_NODE', huid, (targetNode: unknown) => {
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
  }, [])

  // ---- Mount-only: create the single MindMap instance ----
  useEffect(() => {
    initMindMap()
    // cleanup: only destroy on component unmount
    return () => {
      if (mindMapRef.current) {
        mindMapRef.current.destroy()
        mindMapRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Data update: when mindmap or projectId changes, use setData (no flash) ----
  useEffect(() => {
    if (!mindMapRef.current) return
    const isProjectSwitch = prevProjectIdRef.current !== projectId
    if (!isProjectSwitch && mindmapRef.current === mindmap) return
    prevProjectIdRef.current = projectId

    const instance = mindMapRef.current
    const data = buildMindMapData(mindmap)
    const rootText = ((data as any)?.data?.text) || '(no text)'
    devLog('[MindMapCanvas] data update — projectId:', projectId, '| rootText:', rootText, '| isProjectSwitch:', isProjectSwitch)

    if (mindmap?.tree_data) {
      // Reset flags before setData so the auto data_change doesn't skip
      initialChangeRef.current = true
      usingDefaultDataRef.current = false
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(instance as any).setData(data)
      } catch (e) {
        devWarn('[MindMapCanvas] setData failed, fallback to reinit:', e)
        latestTreeRef.current = data
        mindMapRef.current.destroy()
        mindMapRef.current = null
        initMindMap()
        return
      }
    }

    // Restore layout preference when switching projects
    if (isProjectSwitch) {
      const saved = mindmap?.view_state?.layout as LayoutKey | undefined
      if (saved && AVAILABLE_LAYOUTS.find(l => l.key === saved) && saved !== layout) {
        setLayout(saved)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mindmap, projectId])

  // ---- Highlight node from global task navigation ----
  useEffect(() => {
    if (!mindMapRef.current || !highlightNodeUid) return
    const instance = mindMapRef.current
    const huid = highlightNodeUid
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(instance as any).execCommand('GO_TARGET_NODE', huid, (targetNode: unknown) => {
        if (targetNode) {
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
  }, [highlightNodeUid])

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
    // 跳过 mount 首次执行：initMindMap effect 会先创建 instance，
    // 此时 instance 已经用了正确的 layout。
    if (layoutEffectFirstRun.current) {
      layoutEffectFirstRun.current = false
      return
    }
    // Save layout preference to parent
    onViewStateChangeRef.current?.({ layout })
    if (!mindMapRef.current) return
    // 如果当前 instance 是用 DEFAULT_TREE_DATA 初始化的（mindmap prop 尚未到达），
    // 直接 destroy + reinit，不需要从 instance 拿数据（数据是默认的）。
    if (usingDefaultDataRef.current) {
      mindMapRef.current.destroy()
      mindMapRef.current = null
      initMindMap()
      return
    }
    // 使用 instance.setLayout() 切换布局，无需 destroy+reinit。
    // 避免 getData(true) 可能返回不完整数据导致节点丢失 (Bug: layout switch content disappears)。
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mindMapRef.current as any).setLayout(layout)
    } catch (e) {
      devWarn('[MindMapCanvas] setLayout failed, fallback to reinit:', e)
      // fallback: 尝试 safe getData + destroy + reinit
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentData = (mindMapRef.current as any).getData(true)
        if (currentData) latestTreeRef.current = currentData
      } catch {
        // ignore
      }
      mindMapRef.current.destroy()
      mindMapRef.current = null
      initMindMap()
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

  const handleDeleteNode = useCallback(() => {
    const instance = mindMapRef.current
    if (!instance) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(instance as any).execCommand('REMOVE_NODE')
  }, [])

  const isTask = Boolean(activeNodeData?._isTask)

  const handleExport = useCallback(async (type: 'png' | 'svg' | 'md' | 'pdf') => {
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
      if (type === 'pdf') {
        // PDF 需要通过 Export 插件的 export 方法触发下载
        await (instance as any).export('pdf', true, 'mindflow')
      } else if (type === 'png') {
        await doExport.png('mindflow', true)
      } else if (type === 'svg') {
        await doExport.svg('mindflow', true)
      } else if (type === 'md') {
        await doExport.md('mindflow', true)
      }
      toast.success('导出成功')
    } catch (err) {
      devError('Export failed:', err)
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
          <button
            onClick={handleDeleteNode}
            className="flex items-center gap-2 h-8 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap text-status-error hover:bg-status-error/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除节点
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
        <button
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(mindMapRef.current as any)?.execCommand('EXPAND_ALL')
          }}
          className="flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-medium transition-colors text-text-muted hover:text-text-primary hover:bg-bg-elevated"
          title="展开全部"
        >
          <ChevronsDown className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(mindMapRef.current as any)?.execCommand('UNEXPAND_ALL')
          }}
          className="flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-medium transition-colors text-text-muted hover:text-text-primary hover:bg-bg-elevated"
          title="折叠全部"
        >
          <ChevronsUp className="h-3.5 w-3.5" />
        </button>
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
              <button
                onClick={() => handleExport('pdf')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
              >
                <FileInput className="h-3.5 w-3.5" />
                导出 PDF
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
        <span className="text-[10px] text-text-muted">↑↓←→ 切换节点</span>
        <span className="text-border-default">|</span>
        <span className="text-[10px] text-text-muted">滚轮缩放</span>
        <span className="text-border-default">|</span>
        <span className="text-[10px] text-text-muted">右键框选</span>
        <span className="text-border-default">|</span>
        <span className="text-[10px] text-text-muted">Delete 删除</span>
      </div>

    </div>
  )
})
