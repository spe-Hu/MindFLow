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
  const [zoom, setZoom] = useState(100)
  const canvasRef = useRef<MindMapCanvasRef>(null)

  const highlightNodeUid = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('nodeUid')
  }, [location.search])

  useEffect(() => {
    if (id) {
      setActiveProject(id)
      loadProjectTasks(id)
      db.mindmaps.where('project_id').equals(id).first().then((m) => {
        setMindmap(m ?? null)
      })
    }
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
        <MindMapCanvas
          ref={canvasRef}
          projectId={id}
          mindmap={mindmap}
          onDataChange={handleDataChange}
          onViewStateChange={handleViewStateChange}
          highlightNodeUid={highlightNodeUid}
          onZoomChange={setZoom}
        />
      </div>
    </div>
  )
}
