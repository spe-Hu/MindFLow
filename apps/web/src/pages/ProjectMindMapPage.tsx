import { useEffect, useCallback, useState, useMemo, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { ViewHeader } from '@/components/layout/ViewHeader'
import { MindMapCanvas } from '@/components/mindmap/MindMapCanvas'
import type { MindMapCanvasRef } from '@/components/mindmap/MindMapCanvas'
import { useProjectStore } from '@/stores/projectStore'
import { useTaskStore } from '@/stores/taskStore'
import { db } from '@/lib/db'
import { syncMindmapToCloud, syncProjectToCloud } from '@/lib/sync'
import { devLog } from '@/lib/devConsole'
import { createSharedLink, buildShareUrl } from '@/lib/share'
import type { LocalMindmap } from '@/lib/db'
import { toast } from 'sonner'

export function ProjectMindMapPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { setActiveProject } = useProjectStore()
  const { loadProjectTasks } = useTaskStore()
  const [mindmap, setMindmap] = useState<LocalMindmap | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(100)
  const canvasRef = useRef<MindMapCanvasRef>(null)
  // 用 prevIdRef 代替 hasQueriedRef：只在 id 真正变化时才执行查询，
  // 避免切换项目时因 ref 锁死导致加载旧项目数据（回归 Bug）。
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
    // 取同一 project 下 version 最新的 mindmap，避免竞态产生多条记录时加载到旧数据。
    // 改用 toArray + JS filter：Dexie where('project_id') 在 db.delete() 重建后偶发失效。
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
      // 根节点改名 → 同步更新项目名
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
          // 刷新 projectStore 中的项目列表（更新 Sidebar）
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
    if (!id || !mindmap) {
      toast.error('思维导图尚未加载，请稍后再试')
      return
    }
    try {
      const project = await db.projects.get(id)
      const projectName = project?.name || '未命名项目'
      const layout = (mindmap.view_state?.layout as string) || 'logicalStructure'
      const token = await createSharedLink(id, projectName, mindmap.tree_data as Record<string, unknown>, layout)
      const url = buildShareUrl(token)
      await navigator.clipboard.writeText(url)
      toast.success('分享链接已生成并复制到剪贴板', {
        description: url,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '创建分享链接失败'
      toast.error(msg)
    }
  }, [id, mindmap])

  if (!id) return null

  return (
    <div className="flex flex-col h-full relative">
      <ViewHeader
        projectId={id}
        zoom={zoom}
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onZoomReset={() => canvasRef.current?.resetZoom()}
        onShare={handleShare}
      />
      <div className="flex-1 overflow-hidden relative">
        {/* MindMapCanvas 始终挂载，避免切换项目时重新创建实例导致闪烁 */}
        <MindMapCanvas
          ref={canvasRef}
          projectId={id}
          mindmap={mindmap}
          onDataChange={handleDataChange}
          onViewStateChange={handleViewStateChange}
          highlightNodeUid={highlightNodeUid}
          onZoomChange={setZoom}
        />
        {/* Loading 遮罩层：只在加载时显示，不卸载 canvas */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              {/* Spinner */}
              <div className="h-8 w-8 rounded-full border-2 border-primary-subtle border-t-primary-600 animate-spin" />
              <span className="text-sm text-text-muted">加载思维导图中…</span>
            </div>
          </div>
        )}
        {/* 无数据遮罩：只在无数据时覆盖，不卸载 canvas */}
        {!loading && !mindmap && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm">
            <span className="text-sm text-text-muted">暂无思维导图数据</span>
          </div>
        )}
      </div>
    </div>
  )
}
