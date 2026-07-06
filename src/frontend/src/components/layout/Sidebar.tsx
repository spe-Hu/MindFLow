import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Settings, Plus, FolderOpen,
  MoreHorizontal, Pencil, Trash2, Archive, CalendarDays, Clock,
  BarChart3, GanttChart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/stores/projectStore'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import type { LocalProject } from '@/lib/db'

const PROJECT_COLORS: Record<string, string> = {
  indigo: 'bg-project-indigo',
  teal: 'bg-project-teal',
  amber: 'bg-project-amber',
  rose: 'bg-project-rose',
  emerald: 'bg-project-emerald',
  violet: 'bg-project-violet',
}

function getProjectColorClass(color: string): string {
  return PROJECT_COLORS[color] || 'bg-text-muted'
}

function UserSection() {
  const { user, isLocalMode } = useAuthStore()
  const displayName = user?.display_name || user?.username || '本地用户'
  const statusLabel = user ? '已登录' : isLocalMode ? '本地模式' : '未登录'

  return (
    <div className="px-3 py-2 border-t border-border-default">
      <div className="flex items-center gap-2.5 px-2 py-1.5">
        <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
          <span className="text-xs font-medium text-primary-700">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary truncate">{displayName}</p>
          <p className="text-[10px] text-text-muted truncate">{statusLabel}</p>
        </div>
      </div>
    </div>
  )
}

function UserAvatarMini() {
  const { user } = useAuthStore()
  const displayName = user?.display_name || user?.username || 'U'
  return (
    <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center">
      <span className="text-[10px] font-medium text-primary-700">
        {displayName.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { projects, activeProjectId, setActiveProject, updateProject, removeProject, archiveProject, recentProjects } = useProjectStore()
  const { sidebarCollapsed, setNewProjectDialogOpen } = useUIStore()

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

  /**
   * 删除/归档当前正在查看的项目时,需要主动 navigate 走,
   * 否则 React 路由还停留在 `/project/<deletedId>`,ViewHeader 会找不到
   * 对应项目导致头部空白(仅删 store 中的 activeProjectId 不够)。
   * 优先级: 下一个可用项目 → /global-tasks(没有任何项目时)。
   */
  const getFallbackProjectId = (): string | null => {
    // 直接读 store,过滤掉正在被处理的那个 id
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

  if (sidebarCollapsed) {
    return (
      <aside className="w-14 flex flex-col items-center py-3 border-r border-border-default bg-bg-surface shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 mb-2',
            isDashboard && 'bg-primary-subtle text-primary-600'
          )}
          onClick={() => navigate('/dashboard')}
          aria-label="工作台"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 mb-2',
            isGlobalTasks && 'bg-primary-subtle text-primary-600'
          )}
          onClick={() => navigate('/global-tasks')}
          aria-label="全局任务"
        >
          <LayoutDashboard className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 mb-2',
            isCalendar && 'bg-primary-subtle text-primary-600'
          )}
          onClick={() => navigate('/calendar')}
          aria-label="日历"
        >
          <CalendarDays className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 mb-2',
            isGantt && 'bg-primary-subtle text-primary-600'
          )}
          onClick={() => navigate('/gantt')}
          aria-label="甘特图"
        >
          <GanttChart className="h-4 w-4" />
        </Button>
        <Separator className="my-2 w-6" />
        <div className="flex flex-col gap-1.5 items-center flex-1 overflow-y-auto py-1">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProjectClick(p)}
              className={cn(
                'h-6 w-6 rounded-full transition-all duration-fast',
                getProjectColorClass(p.color),
                activeProjectId === p.id ? 'ring-2 ring-text-primary scale-110' : 'opacity-70 hover:opacity-100'
              )}
              title={p.name}
            />
          ))}
        </div>
        <Separator className="my-2 w-6" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 mb-1"
          onClick={() => setNewProjectDialogOpen(true)}
          aria-label="新建项目"
        >
          <Plus className="h-4 w-4 text-text-secondary" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', isSettings && 'bg-primary-subtle text-primary-600')}
          onClick={() => navigate('/settings')}
          aria-label="设置"
        >
          <Settings className="h-4 w-4" />
        </Button>

        <UserAvatarMini />
      </aside>
    )
  }

  return (
    <>
      <aside className="w-60 flex flex-col border-r border-border-default bg-bg-surface shrink-0">
        {/* Dashboard / Global Entry */}
        <div className="px-3 py-2 flex flex-col gap-1">
          <button
            onClick={() => navigate('/dashboard')}
            className={cn(
              'w-full flex items-center gap-2.5 h-9 px-3 rounded-md text-sm font-medium transition-colors duration-fast',
              isDashboard
                ? 'bg-primary-subtle text-primary-600'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
            )}
          >
            <BarChart3 className="h-4 w-4" />
            工作台
          </button>
          <button
            onClick={() => navigate('/global-tasks')}
            className={cn(
              'w-full flex items-center gap-2.5 h-9 px-3 rounded-md text-sm font-medium transition-colors duration-fast',
              isGlobalTasks
                ? 'bg-primary-subtle text-primary-600'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            全局任务
          </button>
          <button
            onClick={() => navigate('/calendar')}
            className={cn(
              'w-full flex items-center gap-2.5 h-9 px-3 rounded-md text-sm font-medium transition-colors duration-fast',
              isCalendar
                ? 'bg-primary-subtle text-primary-600'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
            )}
          >
            <CalendarDays className="h-4 w-4" />
            日历
          </button>
          <button
            onClick={() => navigate('/gantt')}
            className={cn(
              'w-full flex items-center gap-2.5 h-9 px-3 rounded-md text-sm font-medium transition-colors duration-fast',
              isGantt
                ? 'bg-primary-subtle text-primary-600'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
            )}
          >
            <GanttChart className="h-4 w-4" />
            甘特图
          </button>
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div className="px-3 py-2 flex flex-col gap-1">
            <div className="flex items-center mb-1 px-1">
              <Clock className="h-3 w-3 text-text-muted mr-1.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">最近编辑</span>
            </div>
            {recentProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProjectClick(p)}
                className={cn(
                  'w-full flex items-center gap-2.5 h-8 px-2 rounded-md text-sm transition-colors duration-fast',
                  activeProjectId === p.id
                    ? 'bg-bg-elevated text-text-primary'
                    : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                )}
              >
                <span className={cn('h-2 w-2 rounded-full shrink-0', getProjectColorClass(p.color))} />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
        {recentProjects.length > 0 && <Separator className="mx-3 w-auto" />}

        {/* Projects Section */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">项目</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
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
                className={cn(
                  'group relative w-full flex items-center gap-2.5 h-8 px-2 rounded-md text-sm transition-colors duration-fast',
                  activeProjectId === p.id
                    ? 'bg-bg-elevated text-text-primary'
                    : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                )}
              >
                <button
                  onClick={() => handleProjectClick(p)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                >
                  <span
                    className={cn('h-2 w-2 rounded-full shrink-0', getProjectColorClass(p.color))}
                  />
                  {renamingId === p.id ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmRename(p.id)
                        if (e.key === 'Escape') { setRenamingId(null); setRenameValue('') }
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
              <div className="flex flex-col items-center gap-1.5 py-4 px-2 text-center">
                <FolderOpen className="h-5 w-5 text-text-muted" />
                <span className="text-xs text-text-muted">暂无项目</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary-600"
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

        {/* System Section */}
        <div className="px-3 py-2">
          <button
            onClick={() => navigate('/settings')}
            className={cn(
              'w-full flex items-center gap-2.5 h-9 px-3 rounded-md text-sm font-medium transition-colors duration-fast',
              isSettings
                ? 'bg-primary-subtle text-primary-600'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
            )}
          >
            <Settings className="h-4 w-4" />
            设置
          </button>
        </div>

        <UserSection />
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
  )
}
