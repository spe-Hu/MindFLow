import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  FileText,
  Rocket,
  GraduationCap,
  CalendarDays,
  LayoutList,
  Check,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useProjectStore } from '@/stores/projectStore'
import { db } from '@/lib/db'
import type { LocalProject } from '@/lib/db'
import { PROJECT_TEMPLATES, applyTemplate, type MindMapTemplate } from '@/lib/templates'
import { generateMindMapByAI } from '@/lib/aiMindMap'

const PROJECT_COLOR_OPTIONS = [
  { key: 'indigo', class: 'bg-project-indigo' },
  { key: 'teal', class: 'bg-project-teal' },
  { key: 'amber', class: 'bg-project-amber' },
  { key: 'rose', class: 'bg-project-rose' },
  { key: 'emerald', class: 'bg-project-emerald' },
  { key: 'violet', class: 'bg-project-violet' },
]

const TEMPLATE_ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  Rocket,
  GraduationCap,
  CalendarDays,
  LayoutList,
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function NewProjectDialog() {
  const { isNewProjectDialogOpen, setNewProjectDialogOpen } = useUIStore()
  const { addProject } = useProjectStore()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState('indigo')
  const [selectedTemplate, setSelectedTemplate] = useState<MindMapTemplate>(PROJECT_TEMPLATES[0]!)
  const [isCreating, setIsCreating] = useState(false)
  const [isAIGenerate, setIsAIGenerate] = useState(false)

  const reset = useCallback(() => {
    setName('')
    setSelectedColor('indigo')
    setSelectedTemplate(PROJECT_TEMPLATES[0]!)
    setIsAIGenerate(false)
    setIsCreating(false)
  }, [])

  const handleClose = useCallback(() => {
    setNewProjectDialogOpen(false)
    reset()
  }, [setNewProjectDialogOpen, reset])

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return
    setIsCreating(true)

    const projectId = generateId()
    const project: LocalProject = {
      id: projectId,
      name: name.trim(),
      color: selectedColor,
      sort_order: Date.now(),
      is_archived: false,
      version: 1,
      last_opened_at: new Date(),
    }

    await addProject(project)

    // Create mindmap with template structure (or AI-generated)
    let treeData: Record<string, unknown>
    if (isAIGenerate) {
      const result = await generateMindMapByAI({ theme: name.trim() })
      treeData = result.tree_data
    } else {
      treeData = applyTemplate(selectedTemplate.id, name.trim())
    }
    const mindmapId = generateId()

    await db.mindmaps.put({
      id: mindmapId,
      project_id: projectId,
      tree_data: treeData,
      view_state: {},
      version: 1,
    })

    // Sync tasks from tree if template has task nodes
    const { syncTasksFromTree } = await import('@/lib/db')
    await syncTasksFromTree(projectId, treeData)

    // 短暂延迟，确保 IndexedDB put 事务已提交到索引，
    // 避免导航后 ProjectMindMapPage 查询时事务尚未可见 (竞态修复)。
    await new Promise((r) => setTimeout(r, 300))

    setIsCreating(false)
    handleClose()
    navigate(`/project/${projectId}`)
  }, [name, selectedColor, selectedTemplate, addProject, handleClose, navigate, isAIGenerate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setNewProjectDialogOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setNewProjectDialogOpen])

  return (
    <Dialog open={isNewProjectDialogOpen} onOpenChange={setNewProjectDialogOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-text-primary">新建项目</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          {/* Project Name */}
          <div className="grid gap-2">
            <Label htmlFor="project-name" className="text-sm text-text-secondary">
              项目名称
            </Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：Q3 产品改版"
              maxLength={50}
              autoFocus
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleCreate()
                }
                if (e.key === 'Escape') {
                  handleClose()
                }
              }}
            />
          </div>

          {/* Template Selection */}
          <div className="grid gap-2">
            <Label className="text-sm text-text-secondary">选择模板</Label>
            <div className="grid grid-cols-2 gap-2">
              {PROJECT_TEMPLATES.map((tmpl) => {
                const Icon = TEMPLATE_ICON_MAP[tmpl.icon] ?? FileText
                const isSelected = !isAIGenerate && selectedTemplate.id === tmpl.id
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => { setSelectedTemplate(tmpl); setIsAIGenerate(false) }}
                    className={cn(
                      'relative flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-all duration-fast',
                      isSelected
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/20'
                        : 'border-border-default bg-bg-surface hover:border-border-hover hover:bg-bg-elevated'
                    )}
                  >
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-white">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        isSelected ? 'text-primary-600' : 'text-text-secondary'
                      )}
                    />
                    <div>
                      <div
                        className={cn(
                          'text-xs font-medium',
                          isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-text-primary'
                        )}
                      >
                        {tmpl.name}
                      </div>
                      <div className="text-[11px] text-text-muted leading-tight mt-0.5">
                        {tmpl.description}
                      </div>
                    </div>
                  </button>
                )
              })}
              {/* AI Generate Card */}
              <button
                type="button"
                onClick={() => { setIsAIGenerate(true); setSelectedTemplate(PROJECT_TEMPLATES[0]!) }}
                className={cn(
                  'relative flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-all duration-fast',
                  isAIGenerate
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/20'
                    : 'border-border-default bg-bg-surface hover:border-border-hover hover:bg-bg-elevated'
                )}
              >
                {isAIGenerate && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-white">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
                <Sparkles
                  className={cn(
                    'h-4 w-4',
                    isAIGenerate ? 'text-primary-600' : 'text-text-secondary'
                  )}
                />
                <div>
                  <div
                    className={cn(
                      'text-xs font-medium',
                      isAIGenerate ? 'text-primary-700 dark:text-primary-400' : 'text-text-primary'
                    )}
                  >
                    AI 生成
                  </div>
                  <div className="text-[11px] text-text-muted leading-tight mt-0.5">
                    输入主题自动生成结构
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Color Selection */}
          <div className="grid gap-2">
            <Label className="text-sm text-text-secondary">项目颜色</Label>
            <div className="flex items-center gap-3">
              {PROJECT_COLOR_OPTIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedColor(c.key)}
                  className={cn(
                    'h-8 w-8 rounded-full transition-all duration-fast',
                    c.class,
                    selectedColor === c.key
                      ? 'ring-2 ring-text-primary scale-110'
                      : 'hover:scale-110'
                  )}
                  aria-label={`选择颜色 ${c.key}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-9">
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="h-9 bg-primary-600 hover:bg-primary-700 text-white"
          >
            {isCreating ? (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            {isAIGenerate ? '生成并创建' : '创建'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
