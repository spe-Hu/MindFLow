import { useEffect, useCallback, useState, useMemo, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { ViewHeader } from '@/components/layout/ViewHeader'
import { MindMapCanvas } from '@/components/mindmap/MindMapCanvas'
import type { MindMapCanvasRef } from '@/components/mindmap/MindMapCanvas'
import { useProjectStore } from '@/stores/projectStore'
import { useTaskStore } from '@/stores/taskStore'
import { db } from '@/lib/db'
import { syncMindmapToCloud } from '@/lib/sync'
import type { LocalMindmap } from '@/lib/db'

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
      // eslint-disable-next-line no-console
      console.log('[ProjectMindMapPage] DB query done — latest root:', (latest?.tree_data as any)?.data?.text, '| loading→false')
      setMindmap(latest)
      setLoading(false)
    })
  }, [id, setActiveProject, loadProjectTasks])

  const handleDataChange = useCallback(
    async (data: Record<string, unknown>, viewState?: Record<string, unknown>) => {
      if (!id) return
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

  if (!id) return null

  return (
    <div className="flex flex-col h-full">
      <ViewHeader
        projectId={id}
        zoom={zoom}
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onZoomReset={() => canvasRef.current?.resetZoom()}
      />
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            加载思维导图中…
          </div>
        ) : !mindmap ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            暂无思维导图数据
          </div>
        ) : (
          <MindMapCanvas
            ref={canvasRef}
            projectId={id}
            mindmap={mindmap}
            onDataChange={handleDataChange}
            onViewStateChange={handleViewStateChange}
            highlightNodeUid={highlightNodeUid}
            onZoomChange={setZoom}
          />
        )}
      </div>
    </div>
  )
}
