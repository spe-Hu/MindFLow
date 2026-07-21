import { useEffect, useCallback, useState, useMemo, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { ViewHeader } from '@/components/layout/ViewHeader'
import { MindMapCanvas } from '@/components/mindmap/MindMapCanvas'
import type { MindMapCanvasRef } from '@/components/mindmap/MindMapCanvas'
import { NodeDetailSidebar } from '@/components/mindmap/NodeDetailSidebar'
import { useProjectStore } from '@/stores/projectStore'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { db } from '@/lib/db'
import { syncMindmapToCloud, syncProjectToCloud } from '@/lib/sync'
import { devLog } from '@/lib/devConsole'
import { createSharedLink, buildShareUrl } from '@/lib/share'
import type { LocalMindmap } from '@/lib/db'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PanelRightOpen, PanelRightClose } from 'lucide-react'

export function ProjectMindMapPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { setActiveProject } = useProjectStore()
  const { loadProjectTasks, allTasks } = useTaskStore()
  const projectTasks = allTasks.filter((t) => t.project_id === id)
  const { detailSidebarWidth } = useUIStore()
  const [mindmap, setMindmap] = useState<LocalMindmap | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [activeNodeData, setActiveNodeData] = useState<Record<string, unknown> | null>(null)
  const [detailVisible, setDetailVisible] = useState(true)
  const canvasRef = useRef<MindMapCanvasRef>(null)
  const prevIdRef = useRef<string | null>(null)

  const highlightNodeUid = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('nodeUid')
  }, [location.search])

  useEffect(() => {
    if (!id || prevIdRef.current === id) return
    prevIdRef.current = id
    setLoading(true)
    setActiveProject(id)
    loadProjectTasks(id)
    db.mindmaps.toArray().then((all) => {
      const list = all.filter((m) => m.project_id === id)
      const latest = list.length > 0
        ? list.reduce((a, b) => (a.version > b.version ? a : b))
        : null
      devLog('[ProjectMindMapPage] DB query done — latest root:', (latest?.tree_data as any)?.data?.text, '| loading→false')
      setMindmap(latest)
      setLoading(false)
    })
  }, [id, setActiveProject, loadProjectTasks])

  const handleDataChange = useCallback(
    async (data: Record<string, unknown>, viewState?: Record<string, unknown>) => {
      if (!id) return
      const newRootText = ((data as any)?.data?.text) as string | undefined
      if (newRootText && newRootText.trim()) {
        const trimmed = newRootText.trim()
        const currentProject = await db.projects.get(id)
        if (currentProject && currentProject.name !== trimmed) {
          await db.projects.update(id, { name: trimmed, updated_at: new Date() })
          await syncProjectToCloud({
            ...currentProject,
            name: trimmed,
            updated_at: new Date(),
          }).catch(() => { /* ignore offline */ })
          const { loadProjects } = useProjectStore.getState()
          await loadProjects().catch(() => {})
        }
      }
      const existing = await db.mindmaps.where('project_id').equals(id).first()
      if (existing) {
        await db.mindmaps.update(existing.id, {
          tree_data: data,
          view_state: viewState ? { ...existing.view_state, ...viewState } : existing.view_state,
          version: existing.version + 1,
        })
        await syncMindmapToCloud({
          ...existing,
          tree_data: data,
          view_state: viewState ? { ...existing.view_state, ...viewState } : existing.view_state,
          version: existing.version + 1,
        }).catch(() => { /* ignore offline */ })
      } else {
        const newMindmap: LocalMindmap = {
          id: `${Date.now()}`,
          project_id: id,
          tree_data: data,
          view_state: viewState || {},
          version: 1,
        }
        await db.mindmaps.put(newMindmap)
        await syncMindmapToCloud(newMindmap).catch(() => { /* ignore offline */ })
      }
    },
    [id]
  )

  const handleViewStateChange = useCallback(
    async (viewState: Record<string, unknown>) => {
      if (!id) return
      const existing = await db.mindmaps.where('project_id').equals(id).first()
      if (existing) {
        await db.mindmaps.update(existing.id, {
          view_state: { ...existing.view_state, ...viewState },
          version: existing.version + 1,
        })
        await syncMindmapToCloud({
          ...existing,
          view_state: { ...existing.view_state, ...viewState },
          version: existing.version + 1,
        }).catch(() => { /* ignore offline */ })
      }
    },
    [id]
  )

  const handleShare = useCallback(async () => {
    if (!id) {
      toast.error('思维导图尚未加载，请稍后再试')
      return
    }
    try {
      // 直接从 IndexedDB 读取最新 mindmap，避免 stale React state
      const latestMindmap = await db.mindmaps.where('project_id').equals(id).first()
      if (!latestMindmap) {
        toast.error('思维导图尚未加载，请稍后再试')
        return
      }
      const project = await db.projects.get(id)
      const projectName = project?.name || '未命名项目'
      const layout = (latestMindmap.view_state?.layout as string) || 'logicalStructure'
      const token = await createSharedLink(id, projectName, latestMindmap.tree_data as Record<string, unknown>, layout)
      const url = buildShareUrl(token)
      await navigator.clipboard.writeText(url)
      toast.success('分享链接已生成并复制到剪贴板', {
        description: url,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '创建分享链接失败'
      toast.error(msg)
    }
  }, [id])

  const handleNodeActive = useCallback((data: Record<string, unknown> | null) => {
    setActiveNodeData(data)
  }, [])

  const handleUpdateNodeData = useCallback((updates: Record<string, unknown>) => {
    canvasRef.current?.updateActiveNode(updates)
    setActiveNodeData(prev => (prev ? { ...prev, ...updates } : prev))
  }, [])

  if (!id) return null

  return (
    <div className="flex flex-col h-full">
      <ViewHeader
        projectId={id}
        zoom={zoom}
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onZoomReset={() => canvasRef.current?.resetZoom()}
        onShare={handleShare}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {/* 中间主体: 思维导图 canvas */}
        <div className={cn('flex-1 overflow-hidden relative', !detailVisible && 'flex-1')}>
          <MindMapCanvas
            ref={canvasRef}
            projectId={id}
            mindmap={mindmap}
            onDataChange={handleDataChange}
            onViewStateChange={handleViewStateChange}
            highlightNodeUid={highlightNodeUid}
            onZoomChange={setZoom}
            onNodeActive={handleNodeActive}
          />
          {/* Loading 遮罩 */}
          {loading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 rounded-full border-2 border-primary-subtle border-t-primary-600 animate-spin" />
                <span className="text-sm text-text-muted">加载思维导图中…</span>
              </div>
            </div>
          )}
          {/* 无数据遮罩 */}
          {!loading && !mindmap && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm">
              <span className="text-sm text-text-muted">暂无思维导图数据</span>
            </div>
          )}
          {/* 右侧展开/折叠按钮（当 detail 隐藏时显示） */}
          {!detailVisible && !loading && mindmap && (
            <button
              onClick={() => setDetailVisible(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-40 h-8 px-2 bg-bg-surface border border-border-default rounded-lg shadow-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all"
              title="展开详情面板"
            >
              <PanelRightOpen className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 右侧: 固定详情面板 */}
        {detailVisible && !loading && mindmap && (
          <div
            className="shrink-0 border-l border-border-default bg-bg-primary flex flex-col relative"
            style={{ width: detailSidebarWidth }}
          >
            {/* 折叠按钮 */}
            <button
              onClick={() => setDetailVisible(false)}
              className="absolute -left-4 top-2 z-40 h-6 w-6 bg-bg-surface border border-border-default rounded-full shadow-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all flex items-center justify-center"
              title="收起详情面板"
            >
              <PanelRightClose className="h-3 w-3" />
            </button>
            <NodeDetailSidebar
              nodeData={activeNodeData}
              projectId={id}
              tasks={projectTasks}
              onUpdateNodeData={handleUpdateNodeData}
            />
          </div>
        )}
      </div>
    </div>
  )
}
