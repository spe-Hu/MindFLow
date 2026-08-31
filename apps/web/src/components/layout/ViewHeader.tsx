import { useNavigate, useLocation } from 'react-router-dom'
import { Minus, Plus, Maximize2, Pencil, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore, type ViewMode } from '@/stores/uiStore'
import { useProjectStore } from '@/stores/projectStore'

interface ViewHeaderProps {
  projectId: string
  zoom?: number
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoomReset?: () => void
  onShare?: () => void
}

const VIEW_TABS: { key: ViewMode; label: string; pathSuffix: string }[] = [
  { key: 'mindmap', label: '思维导图', pathSuffix: '' },
  { key: 'outline', label: '大纲', pathSuffix: '/outline' },
  { key: 'list', label: '列表', pathSuffix: '/list' },
  { key: 'board', label: '看板', pathSuffix: '/board' },
]

export function ViewHeader({
  projectId,
  zoom = 100,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onShare,
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

  const showZoom = currentView === 'mindmap'

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
    <div className="h-9 px-4 flex items-center border-b border-border-default bg-bg-surface shrink-0">
      {/* Left: project title with edit hint */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {project && (
          <div className="group flex items-center gap-1.5 min-w-0">
            <h2
              className="text-sm font-medium text-text-primary truncate max-w-[200px] cursor-text"
              title="点击或双击编辑项目名"
              onClick={(e) => {
                const target = e.currentTarget
                if (target.contentEditable === 'true') return
                target.contentEditable = 'true'
                target.focus()
                // Place cursor at end
                const range = document.createRange()
                range.selectNodeContents(target)
                range.collapse(false)
                const sel = window.getSelection()
                sel?.removeAllRanges()
                sel?.addRange(range)
              }}
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
                if (e.key === 'Escape') {
                  e.preventDefault()
                  if (project) {
                    e.currentTarget.textContent = project.name
                  }
                  e.currentTarget.contentEditable = 'false'
                }
              }}
              suppressContentEditableWarning
            >
              {project.name}
            </h2>
            <Pencil
              className="h-3 w-3 text-text-muted opacity-30 group-hover:opacity-70 transition-opacity duration-150 shrink-0"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {/* Center: view tabs — underline style, always centered */}
      <nav className="flex items-center flex-none" aria-label="项目视图切换">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleViewChange(tab.key)}
            className={cn(
              'relative h-9 px-3 text-xs font-medium transition-colors',
              currentView === tab.key
                ? 'text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            )}
            aria-current={currentView === tab.key ? 'page' : undefined}
          >
            {tab.label}
            {currentView === tab.key && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-600 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Right: zoom controls (mindmap only) */}
      <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
        {showZoom ? (
          <>
            <div className="flex items-center gap-0.5 bg-bg-elevated rounded-md px-1.5 h-6">
              <button
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-bg-surface text-text-muted"
                aria-label="缩小"
                onClick={onZoomOut ?? (() => {})}
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-xs text-text-secondary w-9 text-center tabular-nums font-mono">
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
              className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-bg-elevated text-text-muted"
              aria-label="适应画布"
              onClick={onZoomReset ?? (() => {})}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            {onShare && (
              <button
                onClick={onShare}
                className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-primary-subtle text-text-muted hover:text-primary-600 transition-colors"
                aria-label="分享项目"
                title="分享项目"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        ) : (
          /* spacer to keep centering consistent */
          <div className="w-[90px]" />
        )}
      </div>
    </div>
  )
}
