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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] bg-bg-primary px-4">
      <div className="mb-8">
        <div className="w-40 h-32 flex items-center justify-center">
          <BrainCircuit className="h-20 w-20 text-primary-300 animate-pulse" />
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-text-primary mb-3 text-center">
        创建你的第一个项目
      </h1>
      <p className="text-sm text-text-secondary mb-8 text-center max-w-sm">
        用思维导图拆解思路，用任务追踪执行
      </p>

      <Button
        onClick={() => setNewProjectDialogOpen(true)}
        className="h-10 px-5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium"
      >
        <Plus className="h-4 w-4 mr-2" />
        创建项目
      </Button>
    </div>
  )
}
