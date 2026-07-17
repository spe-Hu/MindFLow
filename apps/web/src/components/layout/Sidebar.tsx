import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Settings, Plus, FolderOpen,
  MoreHorizontal, Pencil, Trash2, Archive, CalendarDays,
  BarChart3, GanttChart, PanelLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/stores/projectStore'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import type { LocalProject } from '@/lib/db'
import { syncProjectToCloud } from '@/lib/sync'
import { LocalWorkspacePanel } from '@/components/local/LocalWorkspacePanel'
import { useLocalWorkspaceStore } from '@/stores/localWorkspaceStore'

/* ============================================================
   Design Tokens
   ============================================================ */

/** 项目名 → 颜色 hex 映射（用于头像背景 / 圆点着色） */
const PROJECT_HEX: Record<string, string> = {
  indigo: '#4F46E5',
  teal: '#0D9488',
  amber: '#D97706',
  rose: '#BE123C',
  emerald: '#059669',
  violet: '#7C3AED',
}

/* ============================================================
   Shared Sub-components
   ============================================================ */

/** 项目彩色首字母头像 */
function ProjectAvatar({
  color,
  name,
  size = 'sm',
}: {
  color: string
  name: string
  size?: 'sm' | 'md'
}) {
  const hex = PROJECT_HEX[color] || '#94A3B8'
  const initial = name.charAt(0).toUpperCase() || '?'
  const sizeCls = size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-[22px] w-[22px] text-[10px]'

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center shrink-0 font-semibold transition-all duration-fast',
        sizeCls,
      )}
      style={{ backgroundColor: hex, color: '#fff' }}
    >
      {initial}
    </div>
  )
}

/** 折叠态导航图标按钮 */
function NavIcon({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          className={cn(
            'relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-fast ease-smooth outline-none',
            active
              ? 'bg-primary-100/70 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated focus-visible:ring-2 focus-visible:ring-primary-400/50'
          )}
        >
          <Icon className="h-5 w-5" />
          {active && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary-500" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/** 折叠态的细分隔线 */
function NavDivider() {
  return <div className="w-8 h-px bg-border-default/60 my-1" />
}

/** 展开态导航行 */
function NavItemRow({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full flex items-center gap-3 h-9 px-3 rounded-lg text-sm font-medium transition-all duration-fast outline-none',
        active
          ? 'bg-primary-100/70 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
          : 'text-text-secondary hover:bg-bg-elevated/60 hover:text-text-primary',
        'focus-visible:ring-2 focus-visible:ring-primary-400/50'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary-500" />
      )}
      <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-primary-600')} />
      <span>{label}</span>
    </button>
  )
}

/** 展开态分区标题 */
function SectionLabel({
  children,
  icon: Icon,
}: {
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-center px-1 select-none">
      {Icon && <Icon className="h-3 w-3 text-text-muted mr-1.5" />}
      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {children}
      </span>
    </div>
  )
}

/** 展开态 — 底部用户区 */
function UserSection({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { user, isLocalMode } = useAuthStore()
  const displayName = user?.display_name || user?.username || '本地用户'
  const statusLabel = user ? '已登录' : isLocalMode ? '本地模式' : '未登录'

  return (
    <div
      className="px-3 py-2.5 border-t border-border-default cursor-pointer hover:bg-bg-elevated/40 transition-colors"
      onClick={() => navigate('/settings')}
    >
      <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg-elevated transition-colors">
        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0 ring-1 ring-border-default/50">
          <span className="text-xs font-semibold text-primary-700">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary truncate">{displayName}</p>
          <p className="text-[10px] text-text-muted truncate">{statusLabel}</p>
        </div>
        <Settings className="h-3.5 w-3.5 text-text-muted" />
      </div>
    </div>
  )
}

/** 折叠态 — 底部用户头像 */
function UserAvatarMini() {
  const { user } = useAuthStore()
  const displayName = user?.display_name || user?.username || 'U'
  return (
    <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center">
      <span className="text-[10px] font-semibold text-primary-700">
        {displayName.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

/* ============================================================
   Sidebar Main Component
   ============================================================ */

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    projects,
    activeProjectId,
    setActiveProject,
    updateProject,
    removeProject,
    archiveProject,
    reorderProjects,
  } = useProjectStore()
  const { sidebarCollapsed, setNewProjectDialogOpen, toggleSidebar } = useUIStore()

  const isDashboard = location.pathname === '/dashboard'
  const isGlobalTasks = location.pathname.startsWith('/global-tasks')
  const isCalendar = location.pathname === '/calendar'
  const isGantt = location.pathname === '/gantt'
  const isSettings = location.pathname === '/settings'

  // Project action menu state
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Delete confirmation state
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)

  // Archive confirmation state
  const [archiveProjectId, setArchiveProjectId] = useState<string | null>(null)

  // Drag-and-drop state
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuProjectId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  const handleProjectClick = (project: LocalProject) => {
    if (renamingId) return
    setActiveProject(project.id)
    navigate(`/project/${project.id}`)
  }

  const startRename = (project: LocalProject) => {
    setMenuProjectId(null)
    setRenamingId(project.id)
    setRenameValue(project.name)
  }

  const confirmRename = async (projectId: string) => {
    const trimmed = renameValue.trim()
    if (trimmed) {
      await updateProject(projectId, { name: trimmed })
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const getFallbackProjectId = (): string | null => {
    const list = useProjectStore.getState().projects.filter(
      (p) => p.id !== (deleteProjectId ?? archiveProjectId)
    )
    return list[0]?.id ?? null
  }

  const navigateAwayIfNeeded = (actingId: string) => {
    if (activeProjectId !== actingId) return
    const next = getFallbackProjectId()
    if (next) {
      navigate(`/project/${next}`)
    } else {
      navigate('/global-tasks')
    }
  }

  const handleDelete = async () => {
    if (!deleteProjectId) return
    const actingId = deleteProjectId
    await removeProject(actingId)
    setDeleteProjectId(null)
    navigateAwayIfNeeded(actingId)
  }

  const handleArchive = async () => {
    if (!archiveProjectId) return
    const actingId = archiveProjectId
    await archiveProject(actingId)
    setArchiveProjectId(null)
    navigateAwayIfNeeded(actingId)
  }

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDraggedId(projectId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, projectId: string) => {
    e.preventDefault()
    if (projectId !== draggedId) {
      setDragOverId(projectId)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }

    const current = useProjectStore.getState().projects
    const fromIndex = current.findIndex((p) => p.id === draggedId)
    const toIndex = current.findIndex((p) => p.id === targetId)
    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }

    const reordered = [...current]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    const orderedIds = reordered.map((p) => p.id)

    await reorderProjects(orderedIds)

    await Promise.all(
      reordered.map((p, idx) =>
        syncProjectToCloud({ ...p, sort_order: idx }).catch(() => {
          // ignore offline errors
        })
      )
    )

    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  /* ==========================================================
     COLLAPSED STATE — 64px narrow rail
     ========================================================== */
  if (sidebarCollapsed) {
    return (
      <TooltipProvider delay={150}>
        <aside className="w-16 flex flex-col items-center py-3 border-r border-border-default bg-bg-surface shrink-0 z-20">
          {/* Logo / Brand — 点击回工作台 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-2 bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow-md transition-all duration-fast"
                aria-label="MindFlow"
              >
                <LayoutDashboard className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>回到工作台</TooltipContent>
          </Tooltip>

          <NavDivider />

          {/* Navigation Icons */}
          <div className="flex flex-col items-center gap-0.5 py-1">
            <NavIcon
              icon={BarChart3}
              label="工作台"
              active={isDashboard}
              onClick={() => navigate('/dashboard')}
            />
            <NavIcon
              icon={LayoutDashboard}
              label="全局任务"
              active={isGlobalTasks}
              onClick={() => navigate('/global-tasks')}
            />
            <NavIcon
              icon={CalendarDays}
              label="日历"
              active={isCalendar}
              onClick={() => navigate('/calendar')}
            />
            <NavIcon
              icon={GanttChart}
              label="甘特图"
              active={isGantt}
              onClick={() => navigate('/gantt')}
            />
          </div>

          <NavDivider />

          {/* Project Avatars */}
          <div
            className="flex-1 overflow-y-auto py-1.5 px-2 flex flex-col items-center gap-1.5 min-h-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {projects.map((p) => {
              const isActive = activeProjectId === p.id
              return (
                <Tooltip key={p.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleProjectClick(p)}
                      className={cn(
                        'group relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-fast ease-smooth outline-none',
                        isActive
                          ? 'bg-bg-elevated shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                          : 'hover:bg-bg-elevated/70',
                        'focus-visible:ring-2 focus-visible:ring-primary-400/50'
                      )}
                      title={p.name}
                    >
                      <div>
                        <ProjectAvatar color={p.color} name={p.name} size="sm" />
                      </div>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary-500" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>{p.name}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>

          <NavDivider />

          {/* Bottom Actions */}
          <div className="flex flex-col items-center gap-0.5 pb-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setNewProjectDialogOpen(true)}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-text-muted hover:text-primary-600 hover:bg-primary-100/50 transition-all duration-fast outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50"
                  aria-label="新建项目"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>新建项目</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate('/settings')}
                  className={cn(
                    'relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-fast outline-none',
                    isSettings
                      ? 'bg-primary-100/70 text-primary-600'
                      : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated focus-visible:ring-2 focus-visible:ring-primary-400/50'
                  )}
                  aria-label="设置"
                >
                  <Settings className="h-5 w-5" />
                  {isSettings && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary-500" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>设置</TooltipContent>
            </Tooltip>
          </div>

          {/* User Avatar */}
          <div className="pt-1 pb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate('/settings')}
                  className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center hover:ring-2 hover:ring-primary-300 transition-all duration-fast outline-none"
                >
                  <UserAvatarMini />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>账户设置</TooltipContent>
            </Tooltip>
          </div>
        </aside>
      </TooltipProvider>
    )
  }

  /* ==========================================================
     EXPANDED STATE — 256px wide panel
     ========================================================== */
  return (
    <TooltipProvider delay={150}>
      <>
        <aside className="w-64 flex flex-col border-r border-border-default bg-bg-surface shrink-0 z-20">
          {/* Brand Header — 简洁图标栏，不重复 MindFlow 文字（顶部 Header 已有） */}
          <div className="flex items-center justify-between px-3.5 py-3">
            <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center text-white shadow-sm">
              <BarChart3 className="h-4 w-4" />
            </div>
            <button
              onClick={toggleSidebar}
              className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-all duration-fast"
              aria-label="收起侧边栏"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>

          <Separator className="mx-3.5 w-auto" />

          {/* Main Navigation */}
          <div className="px-3 py-2.5 flex flex-col gap-0.5">
            <NavItemRow
              icon={BarChart3}
              label="工作台"
              active={isDashboard}
              onClick={() => navigate('/dashboard')}
            />
            <NavItemRow
              icon={LayoutDashboard}
              label="全局任务"
              active={isGlobalTasks}
              onClick={() => navigate('/global-tasks')}
            />
            <NavItemRow
              icon={CalendarDays}
              label="日历"
              active={isCalendar}
              onClick={() => navigate('/calendar')}
            />
            <NavItemRow
              icon={GanttChart}
              label="甘特图"
              active={isGantt}
              onClick={() => navigate('/gantt')}
            />
          </div>

          <Separator className="mx-3.5 w-auto" />

          {/* Local Workspace Section */}
          <div className="px-3 py-2">
            <LocalWorkspacePanel />
          </div>

          <Separator className="mx-3.5 w-auto" />

          {/* Projects Section */}
          <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <SectionLabel>项目</SectionLabel>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg hover:bg-bg-elevated"
                onClick={() => setNewProjectDialogOpen(true)}
                aria-label="新建项目"
              >
                <Plus className="h-3.5 w-3.5 text-text-muted" />
              </Button>
            </div>
            <div className="flex flex-col gap-0.5">
              {projects.map((p) => (
                <div
                  key={p.id}
                  draggable={renamingId !== p.id}
                  onDragStart={(e) => handleDragStart(e, p.id)}
                  onDragOver={(e) => handleDragOver(e, p.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, p.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'group relative w-full flex items-center gap-2 h-9 px-2 rounded-lg text-sm transition-all duration-fast',
                    renamingId !== p.id && 'cursor-grab active:cursor-grabbing',
                    activeProjectId === p.id
                      ? 'bg-bg-elevated text-text-primary shadow-sm'
                      : 'text-text-secondary hover:bg-bg-elevated/60 hover:text-text-primary',
                    draggedId === p.id && 'opacity-40',
                    dragOverId === p.id && draggedId !== p.id && 'ring-2 ring-primary-600/50 bg-primary-subtle'
                  )}
                >
                  {activeProjectId === p.id && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary-500" />
                  )}
                  <button
                    onClick={() => handleProjectClick(p)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                  >
                    <ProjectAvatar color={p.color} name={p.name} size="md" />
                    {renamingId === p.id ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename(p.id)
                          if (e.key === 'Escape') {
                            setRenamingId(null)
                            setRenameValue('')
                          }
                        }}
                        onBlur={() => confirmRename(p.id)}
                        className="h-6 px-1.5 text-sm bg-bg-surface border border-border-focus rounded w-full focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate">{p.name}</span>
                    )}
                  </button>

                  {renamingId !== p.id && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
                      <button
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-bg-surface text-text-muted"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuProjectId(menuProjectId === p.id ? null : p.id)
                        }}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Inline action menu */}
                  {menuProjectId === p.id && (
                    <div
                      ref={menuRef}
                      className="absolute right-1 top-8 z-50 w-36 bg-bg-surface border border-border-default rounded-lg shadow-lg py-1 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
                        onClick={() => startRename(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        重命名
                      </button>
                      <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
                        onClick={() => {
                          setMenuProjectId(null)
                          setArchiveProjectId(p.id)
                        }}
                      >
                        <Archive className="h-3.5 w-3.5" />
                        归档项目
                      </button>
                      <div className="mx-2 my-1 border-t border-border-default" />
                      <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-status-error hover:bg-status-error/10 transition-colors"
                        onClick={() => {
                          setMenuProjectId(null)
                          setDeleteProjectId(p.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        删除项目
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {projects.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-5 px-2 text-center">
                  <div className="w-9 h-9 rounded-xl bg-bg-elevated flex items-center justify-center">
                    <FolderOpen className="h-4 w-4 text-text-muted" />
                  </div>
                  <span className="text-xs text-text-muted">暂无项目</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary-600 hover:bg-primary-100/50"
                    onClick={() => setNewProjectDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    创建项目
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator className="mx-3 w-auto" />

          {/* Settings */}
          <div className="px-3 py-2">
            <NavItemRow
              icon={Settings}
              label="设置"
              active={isSettings}
              onClick={() => navigate('/settings')}
            />
          </div>

          <UserSection navigate={navigate} />
        </aside>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteProjectId} onOpenChange={(v) => { if (!v) setDeleteProjectId(null) }}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-text-primary">删除项目</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-text-secondary">
                此操作将永久删除「{projects.find(p => p.id === deleteProjectId)?.name}」及该项目下的所有思维导图和任务数据，不可恢复。
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setDeleteProjectId(null)} className="h-9">
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                className="h-9 bg-status-error hover:bg-status-error/90 text-white"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                删除
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Archive Confirmation Dialog */}
        <Dialog open={!!archiveProjectId} onOpenChange={(v) => { if (!v) setArchiveProjectId(null) }}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-text-primary">归档项目</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-text-secondary">
                归档后「{projects.find(p => p.id === archiveProjectId)?.name}」将不会显示在侧边栏中，但数据会被保留。你可以在设置中随时恢复。
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setArchiveProjectId(null)} className="h-9">
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleArchive}
                className="h-9 bg-primary-600 hover:bg-primary-700 text-white"
              >
                <Archive className="h-4 w-4 mr-1" />
                归档
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  )
}
