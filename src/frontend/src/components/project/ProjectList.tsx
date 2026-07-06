import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/stores/projectStore'

export function ProjectList() {
  const { projects, activeProjectId } = useProjectStore()

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-text-muted">
        暂无项目
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {projects.map((project) => (
        <div
          key={project.id}
          className={cn(
            'flex items-center gap-2 h-8 px-2 rounded-md text-sm cursor-pointer transition-colors duration-fast',
            activeProjectId === project.id
              ? 'bg-bg-elevated text-text-primary'
              : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', `bg-project-${project.color}`)} />
          <span className="flex-1 truncate">{project.name}</span>
          <ChevronRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100" />
        </div>
      ))}
    </div>
  )
}
