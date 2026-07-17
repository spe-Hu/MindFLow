import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import MindMap from 'simple-mind-map'
import KeyboardNavigation from 'simple-mind-map/src/plugins/KeyboardNavigation.js'
import Export from 'simple-mind-map/src/plugins/Export.js'
import ExportPDF from 'simple-mind-map/src/plugins/ExportPDF.js'
import Select from 'simple-mind-map/src/plugins/Select.js'
import type { LocalMindmap } from '@/lib/db'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import { devLog, devError, devWarn } from '@/lib/devConsole'
import { scheduleTasksSync } from './taskSyncEngine'
import { markProjectDirty } from '@/lib/localSyncEngine'
import { NodeToolbar } from './NodeToolbar'
import { ExportToolbar } from './ExportToolbar'
import { LayoutTemplate, Network, GitBranch, ChevronsDown, ChevronsUp } from 'lucide-react'
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

// Task sync logic with debounce + mutex is now in taskSyncEngine.ts

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
  // 标记当前项目是否为 obsidian 本地项目，data_change 时触发 dirty sync
  const isObsidianRef = useRef(false)
  // 防止同一 projectId 的重复 setData 触发多次闪烁
  const setDataGuardRef = useRef<{ projectId: string; timer: ReturnType<typeof setTimeout> | null }>({ projectId: '', timer: null })

  const [activeNodeData, setActiveNodeData] = useState<Record<string, unknown> | null>(null)
  const [activeNodePos, setActiveNodePos] = useState<{ x: number; y: number } | null>(null)
  const [layout, setLayout] = useState<LayoutKey>(() => {
    const saved = mindmap?.view_state?.layout as LayoutKey
    return AVAILABLE_LAYOUTS.find(l => l.key === saved) ? saved : 'logicalStructure'
  })
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
      // 本地 Obsidian 项目标记 dirty，等待自动写回
      if (isObsidianRef.current) {
        markProjectDirty(projectIdRef.current)
      }
    })

    instance.on('node_active', (node: unknown) => {
      activeNodeRef.current = node
      // node is the renderer node object, node.nodeData.data holds the real data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodeData = (node as any)?.nodeData?.data || {}
      const data = node ? (nodeData as Record<string, unknown>) : null
      setActiveNodeData(data)
      onNodeActive?.(data)

      // NOTE: 不再自动计算并显示悬浮操作面板（选中节点时弹出的浮动工具栏），
      // 避免遮挡思维导图整体观察。用户可通过键盘快捷键操作节点。
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

    // 延迟 fit: 等 DOM 完成布局 + 节点全部挂载，再让整图居中并自适应缩放。
    // 避免 simple-mind-map 内部 View.fit → rbox 报错，用 try/catch 兜底。
    const safeFit = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(instance as any)?.view?.fit?.()
      } catch {
        // ignore: 节点 SVG <g> 尚未稳定，跳过本次 fit
      }
    }
    const showCanvas = () => {
      if (containerRef.current) {
        containerRef.current.style.visibility = 'visible'
      }
    }
    // 用 rAF 链替代固定延时：等浏览器完成一帧渲染后立刻 fit，
    // 再补一次 50ms 后备确保 SVG 节点 bbox 已稳定。
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        safeFit()
        requestAnimationFrame(() => {
          safeFit()
          showCanvas()
        })
      })
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
    // 避免 onDataChange 回写 mindmap prop 触发不必要的 setData + 闪烁。
    // 只有在项目切换或 instance 仍在使用默认数据（首次加载）时才执行。
    if (!isProjectSwitch && !usingDefaultDataRef.current) return
    prevProjectIdRef.current = projectId

    // 项目切换时查询是否为 obsidian 类型
    if (isProjectSwitch) {
      db.projects.get(projectId).then((p) => {
        isObsidianRef.current = p?.project_type === 'obsidian'
      }).catch(() => { isObsidianRef.current = false })
    }

    const instance = mindMapRef.current
    const data = buildMindMapData(mindmap)
    const rootText = ((data as any)?.data?.text) || '(no text)'
    devLog('[MindMapCanvas] data update — projectId:', projectId, '| rootText:', rootText, '| isProjectSwitch:', isProjectSwitch)

    if (mindmap?.tree_data) {
      // 防抖 guard：同一 projectId 在 200ms 内多次触发只保留最后一次，
      // 避免父组件 mindmap prop 多次更新导致反复闪烁。
      if (setDataGuardRef.current.projectId === projectId) {
        if (setDataGuardRef.current.timer) clearTimeout(setDataGuardRef.current.timer)
      } else {
        setDataGuardRef.current.projectId = projectId
      }
      // 切换项目前先隐藏画布，避免用户看到未 fit 的乱序状态
      if (containerRef.current) {
        containerRef.current.style.visibility = 'hidden'
      }
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
      // 切换项目后让整图居中并自适应缩放，fit 完成后淡入显示。
      // 用 rAF 链 + 50ms 后备替代原来的 600ms 固定延时，消除"一直在闪"的体感。
      setDataGuardRef.current.timer = setTimeout(() => {
        setDataGuardRef.current.timer = null
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ;(instance as any)?.view?.fit?.()
            } catch {
              // ignore
            }
            if (containerRef.current) {
              containerRef.current.style.visibility = 'visible'
            }
          })
        })
      }, 50)
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

  const handleSetPriority = useCallback((priority: 'high' | 'medium' | 'low') => {
    const instance = mindMapRef.current
    if (!instance || !activeNodeRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(instance as any).execCommand('SET_NODE_DATA', activeNodeRef.current, {
      _priority: priority,
    })
    setActiveNodeData(prev => ({ ...prev, _priority: priority }))
  }, [])

  const handleSetDueDate = useCallback((date: string | undefined) => {
    const instance = mindMapRef.current
    if (!instance || !activeNodeRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(instance as any).execCommand('SET_NODE_DATA', activeNodeRef.current, {
      _dueDate: date,
    })
    setActiveNodeData(prev => ({ ...prev, _dueDate: date }))
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
  }, [])

  return (
    <div className={cn('w-full h-full relative dot-grid bg-bg-primary transition-colors duration-300', className)}>
      <div ref={containerRef} className="w-full h-full outline-none" style={{ visibility: 'hidden' }} />

      {/* Floating toolbar for selected node */}
      <NodeToolbar
        activeNodeData={activeNodeData}
        activeNodePos={activeNodePos}
        isTask={isTask}
        onToggleTask={handleToggleTask}
        onDeleteNode={handleDeleteNode}
        onSetPriority={handleSetPriority}
        onSetDueDate={handleSetDueDate}
      />

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
        <ExportToolbar onExport={handleExport} />
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
