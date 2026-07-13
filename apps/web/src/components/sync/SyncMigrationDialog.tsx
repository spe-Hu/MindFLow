import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { db } from '@/lib/db'
import { migrateLocalDataToCloud, fetchAllFromCloud } from '@/lib/sync'
import { toast } from 'sonner'
import { Loader2, CloudUpload, CloudDownload, HardDrive } from 'lucide-react'

export function SyncMigrationDialog() {
  const { isAuthenticated, user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [localCount, setLocalCount] = useState({ projects: 0, tasks: 0 })
  const [mode, setMode] = useState<'idle' | 'uploading' | 'downloading'>('idle')
  const prevAuthRef = useRef(false)

  // Detect login transition
  useEffect(() => {
    const justLoggedIn = !prevAuthRef.current && isAuthenticated
    prevAuthRef.current = isAuthenticated

    if (!justLoggedIn || !user) return

    // Check if we've already prompted this user
    const promptedKey = `mindflow-sync-prompted-${user.id}`
    if (localStorage.getItem(promptedKey)) return

    // Check local data
    async function checkLocal() {
      const projects = await db.projects.toArray()
      const tasks = await db.tasks.toArray()
      const count = { projects: projects.length, tasks: tasks.length }

      if (count.projects > 0) {
        setLocalCount(count)
        setOpen(true)
      }
    }

    checkLocal()
  }, [isAuthenticated, user])

  const handleUpload = async () => {
    setMode('uploading')
    try {
      const projects = await db.projects.toArray()
      const mindmaps = await db.mindmaps.toArray()
      const tasks = await db.tasks.toArray()

      await migrateLocalDataToCloud(projects, mindmaps, tasks)
      toast.success('数据已同步到云端', {
        description: `${localCount.projects} 个项目、${localCount.tasks} 个任务已上传`,
      })
      markPrompted()
      setOpen(false)
    } catch (err) {
      toast.error('同步失败', {
        description: err instanceof Error ? err.message : '请检查网络连接',
      })
    } finally {
      setMode('idle')
    }
  }

  const handleDownload = async () => {
    setMode('downloading')
    try {
      if (!confirm('从云端恢复将覆盖所有本地数据，确定继续吗？')) {
        setMode('idle')
        return
      }

      const { projects, mindmaps, tasks } = await fetchAllFromCloud()

      await db.transaction('rw', [db.projects, db.mindmaps, db.tasks], async () => {
        if (projects.length) await db.projects.bulkPut(projects)
        if (mindmaps.length) await db.mindmaps.bulkPut(mindmaps)
        if (tasks.length) await db.tasks.bulkPut(tasks)
      })

      toast.success('已从云端恢复数据', {
        description: `${projects.length} 个项目、${tasks.length} 个任务已恢复`,
      })

      // Refresh project list
      await useProjectStore.getState().loadProjects()

      markPrompted()
      setOpen(false)
    } catch (err) {
      toast.error('恢复失败', {
        description: err instanceof Error ? err.message : '请检查网络连接',
      })
    } finally {
      setMode('idle')
    }
  }

  const handleSkip = () => {
    markPrompted()
    setOpen(false)
  }

  const markPrompted = () => {
    if (user) {
      localStorage.setItem(`mindflow-sync-prompted-${user.id}`, Date.now().toString())
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>发现本地数据</DialogTitle>
          <DialogDescription>
            你当前有 {localCount.projects} 个项目、{localCount.tasks} 个任务保存在本地。登录后可以选择如何处理这些数据。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <Button
            onClick={handleUpload}
            disabled={mode !== 'idle'}
            className="h-auto py-3 justify-start gap-3 bg-primary-600 hover:bg-primary-700 text-white"
          >
            {mode === 'uploading' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CloudUpload className="h-5 w-5" />
            )}
            <div className="text-left">
              <div className="text-sm font-medium">迁移到云端</div>
              <div className="text-xs opacity-80">本地数据将上传到云端账户，多设备可访问</div>
            </div>
          </Button>

          <Button
            onClick={handleDownload}
            disabled={mode !== 'idle'}
            variant="outline"
            className="h-auto py-3 justify-start gap-3"
          >
            {mode === 'downloading' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CloudDownload className="h-5 w-5 text-primary-600" />
            )}
            <div className="text-left">
              <div className="text-sm font-medium">从云端恢复</div>
              <div className="text-xs text-text-muted">用云端数据覆盖本地（适合换设备登录）</div>
            </div>
          </Button>

          <Button
            onClick={handleSkip}
            disabled={mode !== 'idle'}
            variant="ghost"
            className="h-auto py-3 justify-start gap-3"
          >
            <HardDrive className="h-5 w-5 text-text-muted" />
            <div className="text-left">
              <div className="text-sm font-medium">继续使用本地</div>
              <div className="text-xs text-text-muted">数据暂不同步，可在设置中随时操作</div>
            </div>
          </Button>
        </div>

        <DialogFooter>
          <p className="text-xs text-text-muted w-full text-center">
            你可以在「设置 → 云端同步」中随时更改此选择
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
