import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BrainCircuit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/projectStore'
import { useUIStore } from '@/stores/uiStore'

export function HomePage() {
  const navigate = useNavigate()
  const { projects, isLoading } = useProjectStore()
  const { setNewProjectDialogOpen } = useUIStore()

  useEffect(() => {
    // If user has projects, redirect to the most recently opened one
    if (!isLoading && projects.length > 0) {
      const sorted = [...projects].sort(
        (a, b) => (b.last_opened_at?.getTime() || 0) - (a.last_opened_at?.getTime() || 0)
      )
      navigate(`/project/${sorted[0]!.id}`)
    }
  }, [projects, isLoading, navigate])

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-48px)] bg-bg-primary dot-grid px-4 overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />

      <div className="relative mb-8">
        <div className="w-40 h-32 flex items-center justify-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-primary-subtle ring-1 ring-primary/20">
            <BrainCircuit className="h-12 w-12 text-primary-500" />
          </div>
        </div>
      </div>

      <h1 className="font-display relative text-3xl text-text-primary mb-3 text-center sm:text-4xl">
        创建你的第一个项目
      </h1>
      <p className="relative text-sm text-text-secondary mb-8 text-center max-w-sm">
        用思维导图拆解思路，用任务追踪执行
      </p>

      <Button
        onClick={() => setNewProjectDialogOpen(true)}
        className="relative h-10 px-5 bg-primary-600 text-white text-sm font-medium shadow-glow hover:bg-primary-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        创建项目
      </Button>
    </div>
  )
}
