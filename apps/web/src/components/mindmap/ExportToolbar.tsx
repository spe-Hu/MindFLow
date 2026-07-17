import { useRef, useEffect, useState } from 'react'
import { Download, Image, FileText, FileCode, FileInput } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ExportToolbarProps {
  onExport: (type: 'png' | 'svg' | 'md' | 'pdf') => void
}

export function ExportToolbar({ onExport }: ExportToolbarProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [exportOpen])

  return (
    <div className="relative">
      <button
        onClick={() => setExportOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-medium transition-colors',
          exportOpen
            ? 'bg-primary-subtle text-primary-600'
            : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
        )}
        title="导出"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">导出</span>
      </button>
      {exportOpen && (
        <div ref={exportMenuRef} className="absolute left-0 top-8 z-50 w-36 bg-bg-surface border border-border-default rounded-lg shadow-lg py-1 animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={() => { onExport('png'); setExportOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
          >
            <Image className="h-3.5 w-3.5" />
            导出 PNG
          </button>
          <button
            onClick={() => { onExport('svg'); setExportOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
          >
            <FileCode className="h-3.5 w-3.5" />
            导出 SVG
          </button>
          <button
            onClick={() => { onExport('md'); setExportOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            导出 Markdown
          </button>
          <button
            onClick={() => { onExport('pdf'); setExportOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
          >
            <FileInput className="h-3.5 w-3.5" />
            导出 PDF
          </button>
        </div>
      )}
    </div>
  )
}
