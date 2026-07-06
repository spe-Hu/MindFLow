import { useNavigate, useLocation } from 'react-router-dom'
import { Minus, Plus, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore, type ViewMode } from '@/stores/uiStore'
import { useProjectStore } from '@/stores/projectStore'

interface ViewHeaderProps {
  projectId: string
  zoom?: number
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoomReset?: () => void
}

const VIEW_TABS: { key: ViewMode; label: string; pathSuffix: string }[] = [
  { key: 'mindmap', label: '思维导图', pathSuffix: '' },
  { key: 'outline', label: '大纲', pathSuffix: '/outline' },
  { key: 'list', label: '项目列表', pathSuffix: '/list' },
  { key: 'board', label: '项目看板', pathSuffix: '/board' },
]

export function ViewHeader({
  projectId,
  zoom = 100,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: ViewHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { setProjectView } = useUIStore()
  const { projects, updateProject } = useProjectStore()

  const project = projects.find((p) => p.id === projectId)
  const currentView =
    VIEW_TABS.find(
      (v) =>
        location.pathname === `/project/${projectId}${v.pathSuffix}` ||
        (v.pathSuffix === '' && location.pathname === `/project/${projectId}`)
    )?.key || 'mindmap'

  const handleViewChange = (view: ViewMode) => {
    setProjectView(projectId, view)
    const tab = VIEW_TABS.find((v) => v.key === view)
    if (tab) {
      navigate(`/project/${projectId}${tab.pathSuffix}`)
    }
  }

  const handleTitleEdit = (newTitle: string) => {
    if (project && newTitle.trim() && newTitle.trim() !== project.name) {
      updateProject(project.id, { name: newTitle.trim() })
    }
  }

  return (
    <div className="h-10 px-4 flex items-center justify-between border-b border-border-default bg-bg-surface shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {project && (
          <h2
            className="text-sm font-medium text-text-primary truncate max-w-[200px] cursor-pointer"
            onDoubleClick={(e) => {
              const target = e.currentTarget
              target.contentEditable = 'true'
              target.focus()
            }}
            onBlur={(e) => {
              e.currentTarget.contentEditable = 'false'
              handleTitleEdit(e.currentTarget.textContent || '')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            suppressContentEditableWarning
          >
            {project.name}
          </h2>
        )}
      </div>

      <div className="flex items-center gap-1 bg-bg-elevated rounded-full p-0.5">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleViewChange(tab.key)}
            className={cn(
              'h-7 px-3 rounded-full text-xs font-medium transition-colors duration-fast',
              currentView === tab.key
                ? 'bg-primary-600 text-white'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-0.5 bg-bg-elevated rounded-md px-1.5 h-7">
          <button
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-bg-surface text-text-muted"
            aria-label="缩小"
            onClick={onZoomOut ?? (() => {})}
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-xs text-text-secondary w-10 text-center tabular-nums font-mono">
            {zoom}%
          </span>
          <button
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-bg-surface text-text-muted"
            aria-label="放大"
            onClick={onZoomIn ?? (() => {})}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <button
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-bg-elevated text-text-muted"
          aria-label="适应画布"
          onClick={onZoomReset ?? (() => {})}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
