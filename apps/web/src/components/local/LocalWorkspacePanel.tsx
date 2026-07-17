/**
 * LocalWorkspacePanel — 侧边栏「本地工作空间」面板
 *
 * 可折叠的本地目录树 + Obsidian 文件列表
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, FileText, Plus, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocalWorkspaceStore } from '@/stores/localWorkspaceStore'
import { useProjectStore } from '@/stores/projectStore'
import type { LocalProject } from '@/lib/db'

/* ============================================================ */

interface LocalProjectItemProps {
  project: LocalProject
  active: boolean
  dirty: boolean
  onClick: () => void
}

function LocalProjectItem({ project, active, dirty, onClick }: LocalProjectItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 h-9 px-2 rounded-lg text-sm transition-all duration-fast',
        active
          ? 'bg-bg-elevated text-text-primary shadow-sm'
          : 'text-text-secondary hover:bg-bg-elevated/60 hover:text-text-primary'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary-500" />
      )}
      <FileText className="h-[16px] w-[16px] shrink-0 text-text-muted" />
      <span className="truncate flex-1 text-left">{project.name}</span>
      {dirty && (
        <span className="h-2 w-2 rounded-full bg-orange-400 shrink-0" />
      )}
    </button>
  )
}

/* ============================================================ */

export function LocalWorkspacePanel() {
  const { dirs, obsidianProjects, isScanning, lastError } = useLocalWorkspaceStore()
  const { activeProjectId, setActiveProject } = useProjectStore()
  const navigate = useNavigate()

  // Track expanded directory ids
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    new Set(dirs.map((d) => d.id))
  )
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleDir = (id: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleProjectClick = (project: LocalProject) => {
    setActiveProject(project.id)
    navigate(`/project/${project.id}`)
  }

  const projectsByDir = Object.values(obsidianProjects).reduce(
    (acc, p) => {
      const dirId = p.local_dir_id || 'orphan'
      if (!acc[dirId]) acc[dirId] = []
      acc[dirId].push(p)
      return acc
    },
    {} as Record<string, LocalProject[]>
  )

  const hasDirs = dirs.length > 0

  return (
    <div className="flex flex-col gap-0.5">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex items-center gap-1.5">
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-text-muted" />
          ) : (
            <ChevronDown className="h-3 w-3 text-text-muted" />
          )}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            本地工作空间
          </span>
          {isScanning && <Loader2 className="h-3 w-3 text-primary-500 animate-spin" />}
        </div>
        {hasDirs && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              useLocalWorkspaceStore.getState().registerDirectory().catch(() => {})
            }}
            className="h-6 w-6 rounded hover:bg-bg-elevated flex items-center justify-center text-text-muted"
            aria-label="添加本地目录"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="flex flex-col gap-0.5 px-0.5">
          {!hasDirs && (
            <div className="flex flex-col items-center gap-2 py-4 px-2 text-center">
              <span className="text-xs text-text-muted">
                授权一个本地 Obsidian 目录，即可在 MindFlow 中浏览和编辑思维导图
              </span>
              <button
                onClick={() => useLocalWorkspaceStore.getState().registerDirectory().catch(() => {})}
                className="h-8 px-3 rounded-lg bg-primary-100/70 text-primary-700 text-xs font-medium hover:bg-primary-100 transition-colors"
              >
                添加本地目录
              </button>
            </div>
          )}

          {dirs.map((dir) => {
            const isExpanded = expandedDirs.has(dir.id)
            const projects = projectsByDir[dir.id] || []
            const hasPermissionIssue = lastError && lastError.includes(dir.name)

            return (
              <div key={dir.id} className="flex flex-col">
                {/* Directory row */}
                <button
                  onClick={() => toggleDir(dir.id)}
                  className="flex items-center gap-1.5 h-7 px-1.5 rounded-md text-xs text-text-secondary hover:bg-bg-elevated/60 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-text-muted" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-text-muted" />
                  )}
                  <span className="truncate font-medium">{dir.name}</span>
                  {hasPermissionIssue && (
                    <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0" />
                  )}
                  <span className="text-[10px] text-text-muted ml-auto">{projects.length}</span>
                </button>

                {/* Files list */}
                {isExpanded && (
                  <div className="ml-4 flex flex-col gap-0.5 py-0.5 border-l border-border-default/30">
                    {projects.map((project) => (
                      <LocalProjectItem
                        key={project.id}
                        project={project}
                        active={activeProjectId === project.id}
                        dirty={false} /* dirty handled in OBS-04 */
                        onClick={() => handleProjectClick(project)}
                      />
                    ))}
                    {projects.length === 0 && (
                      <span className="text-[10px] text-text-muted px-2 py-1">
                        暂无 .smm.md 文件
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* hack to avoid circular dep; local import only */
