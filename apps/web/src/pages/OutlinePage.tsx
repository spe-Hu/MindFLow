import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { ViewHeader } from '@/components/layout/ViewHeader'
import { useProjectStore } from '@/stores/projectStore'
import { useTaskStore } from '@/stores/taskStore'
import { db } from '@/lib/db'
import { syncTasksFromTree } from '@/lib/taskTreeSync'
import { syncMindmapToCloud, syncProjectToCloud } from '@/lib/sync'
import { OutlineEditor } from '@/components/outline/OutlineEditor'
import type { LocalMindmap } from '@/lib/db'
import type { MindMapNode } from '@/components/outline/OutlineEditor'

export function OutlinePage() {
  const { id } = useParams<{ id: string }>()
  const { setActiveProject } = useProjectStore()
  const { loadProjectTasks } = useTaskStore()

  const [mindmap, setMindmap] = useState<LocalMindmap | null>(null)
  const [loading, setLoading] = useState(true)

  // Load mindmap data
  const loadMindmap = useCallback(async () => {
    if (!id) return
    const m = await db.mindmaps.where('project_id').equals(id).first()
    setMindmap(m ?? null)
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (id) {
      setActiveProject(id)
      loadProjectTasks(id)
      loadMindmap()
    }
  }, [id, setActiveProject, loadProjectTasks, loadMindmap])

  // Handle tree changes from the editor - auto sync to DB
  const handleTreeChange = useCallback(
    async (newTree: MindMapNode) => {
      if (!id) return
      const newRootText = String(newTree.data.text || '')
      if (newRootText) {
        const currentProject = await db.projects.get(id)
        if (currentProject && currentProject.name !== newRootText) {
          await db.projects.update(id, { name: newRootText, updated_at: new Date() })
          await syncProjectToCloud({
            ...currentProject,
            name: newRootText,
            updated_at: new Date(),
          }).catch(() => {})
          const { loadProjects } = useProjectStore.getState()
          await loadProjects().catch(() => {})
        }
      }

      const existing = await db.mindmaps.where('project_id').equals(id).first()
      if (existing) {
        const updated: LocalMindmap = {
          ...existing,
          tree_data: newTree as any,
          version: existing.version + 1,
        }
        await db.mindmaps.update(existing.id, {
          tree_data: newTree as any,
          version: existing.version + 1,
        })
        await syncMindmapToCloud(updated).catch(() => {})
      } else {
        const newMindmap: LocalMindmap = {
          id: `${Date.now()}`,
          project_id: id,
          tree_data: newTree as any,
          view_state: {},
          version: 1,
        }
        await db.mindmaps.put(newMindmap)
        await syncMindmapToCloud(newMindmap).catch(() => {})
      }

      // Update tasks from new tree
      await syncTasksFromTree(id, newTree as any)
      await loadProjectTasks(id)

      setMindmap(prev =>
        prev
          ? { ...prev, tree_data: newTree as any, version: prev.version + 1 }
          : null
      )
    },
    [id, loadProjectTasks]
  )

  if (!id) return null

  function normalizeTree(node: any): MindMapNode {
    if (!node) return { data: { text: '' }, children: [] }
    const data = node.data || {}
    const children = node.children || data.children || []
    const normalizedChildren = Array.isArray(children)
      ? children.map((c: any) => normalizeTree(c))
      : []
    return { data: { ...data }, children: normalizedChildren }
  }

  const rawTree = mindmap?.tree_data as any
  const treeData: MindMapNode = rawTree
    ? normalizeTree(rawTree)
    : {
        data: { text: '中心主题', uid: 'root', expand: true, isRoot: true },
        children: [],
      }

  return (
    <div className="flex flex-col h-full">
      <ViewHeader projectId={id} />

      <div className="h-8 px-4 flex items-center border-b border-border-default bg-bg-surface shrink-0">
        <span className="text-[11px] text-text-muted">
          大纲模式 · Enter 创建同级 · Tab 缩进 · Shift+Tab 提升 · 点击圆点折叠
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          加载大纲中…
        </div>
      ) : (
        <OutlineEditor
          key={id}
          projectId={id}
          treeData={treeData}
          onTreeChange={handleTreeChange}
        />
      )}
    </div>
  )
}
