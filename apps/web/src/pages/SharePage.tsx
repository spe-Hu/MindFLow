import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import MindMap from 'simple-mind-map'
import { getSharedLink, type SharedLink } from '@/lib/share'
import { cn } from '@/lib/utils'
import { ZoomIn, ZoomOut, Maximize, Copy, Loader2, AlertCircle, Link2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'

export function SharePage() {
  const { token } = useParams<{ token: string }>()
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<MindMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [share, setShare] = useState<SharedLink | null>(null)
  const [zoom, setZoom] = useState(100)

  // Fetch shared link data
  useEffect(() => {
    if (!token) {
      setError('无效的分享链接')
      setLoading(false)
      return
    }
    getSharedLink(token)
      .then((data) => {
        setShare(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '获取分享内容失败')
        setLoading(false)
      })
  }, [token])

  // Initialize readonly mindmap
  useEffect(() => {
    if (!share?.snapshot?.treeData || !containerRef.current) return

    const snap = share.snapshot
    if (instanceRef.current) {
      instanceRef.current.destroy()
      instanceRef.current = null
    }

    const instance = new MindMap({
      el: containerRef.current,
      data: snap.treeData as Record<string, unknown>,
      layout: (snap.layout || 'logicalStructure') as any,
      theme: 'default',
      readonly: true,
      fit: false,
      mousewheelAction: 'zoom',
      enableFreeDrag: false,
    } as any)

    instanceRef.current = instance

    // Delayed fit to avoid rbox error
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(instance as any).view?.fit?.()
        } catch { /* ignore */ }
        setZoom(Math.round(((instance as any).view?.scale || 1) * 100))
      }, 50)
    })

    // Update zoom state on mousewheel zoom
    instance.on('scale', () => {
      setZoom(Math.round(((instance as any).view?.scale || 1) * 100))
    })

    return () => {
      instance.destroy()
      instanceRef.current = null
    }
  }, [share])

  const handleZoomIn = () => {
    const inst = instanceRef.current as any
    if (!inst) return
    inst.view?.enlarge?.()
    setZoom(Math.round((inst.view?.scale || 1) * 100))
  }

  const handleZoomOut = () => {
    const inst = instanceRef.current as any
    if (!inst) return
    inst.view?.narrow?.()
    setZoom(Math.round((inst.view?.scale || 1) * 100))
  }

  const handleResetZoom = () => {
    const inst = instanceRef.current as any
    if (!inst) return
    try { inst.view?.fit?.() } catch { /* ignore */ }
    setZoom(Math.round((inst.view?.scale || 1) * 100))
  }

  const handleCopyLink = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success('链接已复制到剪贴板')
    } catch {
      toast.error('复制失败，请手动复制链接')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin mb-3" />
        <p className="text-sm text-text-muted">正在加载分享内容...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary px-4">
        <AlertCircle className="h-10 w-10 text-status-error mb-3" />
        <h1 className="text-lg font-semibold text-text-primary mb-1">无法访问</h1>
        <p className="text-sm text-text-muted">{error}</p>
      </div>
    )
  }

  const snapshot = share?.snapshot
  const createdDate = snapshot?.createdAt
    ? new Date(snapshot.createdAt).toLocaleDateString('zh-CN')
    : ''

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-border-default bg-bg-surface/80 backdrop-blur z-50">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-md bg-primary-500 flex items-center justify-center">
            <Link2 className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold text-text-primary leading-tight max-w-[200px] truncate sm:max-w-sm">
              {snapshot?.projectName || '未命名项目'}
            </h1>
            <span className="text-[10px] text-text-muted leading-tight">
              {createdDate ? `分享于 ${createdDate}` : '仅限查看'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleZoomOut}
            className="h-8 w-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            title="缩小"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-text-muted w-12 text-center tabular-nums">
            {zoom}%
          </span>
          <button
            onClick={handleZoomIn}
            className="h-8 w-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            title="放大"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="h-8 w-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            title="适应画布"
          >
            <Maximize className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-border-default mx-1" />
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">复制链接</span>
          </button>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={containerRef}
          className={cn('w-full h-full outline-none', 'bg-bg-primary')}
        />
      </div>

      {/* Brand footer */}
      <div className="absolute bottom-3 right-4 z-40">
        <a
          href="/"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-surface/90 backdrop-blur border border-border-default shadow-sm text-[11px] text-text-muted hover:text-text-primary transition-colors"
        >
          <Link2 className="h-3 w-3" />
          MindFlow
        </a>
      </div>
      <Toaster position="top-center" />
    </div>
  )
}