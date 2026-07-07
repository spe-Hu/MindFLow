import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ClipboardList } from 'lucide-react'
import { ViewHeader } from '@/components/layout/ViewHeader'
import { useProjectStore } from '@/stores/projectStore'
import { useTaskStore } from '@/stores/taskStore'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { syncMindmapToCloud, syncTaskToCloud } from '@/lib/sync'

const COLUMNS: { status: string; title: string }[] = [
  { status: 'todo', title: '待办' },
  { status: 'in_progress', title: '进行中' },
  { status: 'done', title: '已完成' },
]

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-priority-high',
  medium: 'bg-priority-medium',
  low: 'bg-priority-low',
  urgent: 'bg-priority-urgent',
}

export function ProjectBoardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setActiveProject } = useProjectStore()
  const { projectTasks, loadProjectTasks, updateTask } = useTaskStore()

  const handleAddTask = async (status: string) => {
    const title = window.prompt('输入新任务标题')
    if (!title?.trim() || !id) return

    const mindmap = await db.mindmaps.where('project_id').equals(id).first()
    if (!mindmap) return

    const nodeUid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const tree = structuredClone(mindmap.tree_data) as Record<string, unknown>
    const root = (tree.root || tree) as Record<string, unknown>
    const children = (root.children || []) as Record<string, unknown>[]

    children.push({
      data: {
        text: title.trim(),
        uid: nodeUid,
        _isTask: true,
        _status: status,
        _priority: 'medium',
      },
      children: [],
    })

    await db.mindmaps.update(mindmap.id, {
      tree_data: tree,
      version: mindmap.version + 1,
    })

    const task = {
      id: `${id}-${nodeUid}`,
      project_id: id,
      node_uid: nodeUid,
      title: title.trim(),
      status: status as 'todo' | 'in_progress' | 'done' | 'cancelled',
      priority: 'medium' as const,
      sort_order: 0,
      created_at: new Date(),
      updated_at: new Date(),
    }

    await db.tasks.put(task)
    await loadProjectTasks(id)
    const updatedMindmap = { ...mindmap, tree_data: tree, version: mindmap.version + 1 }
    await syncMindmapToCloud(updatedMindmap).catch(() => { /* ignore offline */ })
    await syncTaskToCloud(task).catch(() => { /* ignore offline */ })
  }

  useEffect(() => {
    if (id) {
      setActiveProject(id)
      loadProjectTasks(id)
    }
  }, [id, setActiveProject, loadProjectTasks])

  if (!id) return null

  return (
    <div className="flex flex-col h-full">
      <ViewHeader projectId={id} />
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-bg-primary px-6 py-4 flex gap-6">
        {COLUMNS.map((col) => {
          const tasks = projectTasks.filter((t) => t.status === col.status)
          return (
            <div key={col.status} className="w-[280px] flex-shrink-0 flex flex-col h-full">
              <div className="h-10 flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{col.title}</span>
                  <span className="h-5 px-2 rounded-full text-2xs bg-bg-elevated text-text-secondary flex items-center">
                    {tasks.length}
                  </span>
                </div>
              </div>
              <div
                className="flex-1 overflow-y-auto flex flex-col gap-3"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const taskId = e.dataTransfer.getData('text/plain')
                  if (taskId) updateTask(taskId, { status: col.status as 'todo' | 'in_progress' | 'done' | 'cancelled' })
                }}
              >
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', task.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    className={cn(
                      'bg-bg-surface border border-border-default rounded-md p-3',
                      'hover:shadow-sm hover:border-border-hover transition-all duration-fast cursor-pointer',
                      'active:opacity-60',
                      task.status === 'done' && 'opacity-65'
                    )}
                    onClick={() => navigate(`/project/${id}`)}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', PRIORITY_DOT[task.priority] || 'bg-text-muted')} />
                      <span
                        className={cn(
                          'text-sm text-text-primary flex-1',
                          task.status === 'done' && 'line-through text-text-muted'
                        )}
                      >
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-mono text-text-muted">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString('zh-CN') : ''}
                      </span>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <EmptyState
                    icon={ClipboardList}
                    title="还没有任务"
                    description="在思维导图视图中将节点转为任务，即可在看板中追踪"
                    tone="slate"
                    compact
                  />
                )}
              </div>
              <button
                onClick={() => handleAddTask(col.status)}
                className="w-full h-9 flex items-center justify-center gap-2 text-sm text-text-muted hover:text-text-secondary hover:bg-bg-elevated rounded-md mt-2 transition-colors duration-fast"
              >
                <Plus className="h-4 w-4" />
                添加任务
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
