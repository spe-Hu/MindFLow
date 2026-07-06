import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { ViewHeader } from '@/components/layout/ViewHeader'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/projectStore'
import { useTaskStore } from '@/stores/taskStore'
import { db, syncTasksFromTree } from '@/lib/db'
import { syncMindmapToCloud } from '@/lib/sync'
import { treeToOutline, outlineToTree } from '@/lib/outline'
import { toast } from 'sonner'
import { FileText, RefreshCw, Save, AlertCircle } from 'lucide-react'
import type { LocalMindmap } from '@/lib/db'

export function OutlinePage() {
  const { id } = useParams<{ id: string }>()
  const { setActiveProject } = useProjectStore()
  const { loadProjectTasks } = useTaskStore()

  const [mindmap, setMindmap] = useState<LocalMindmap | null>(null)
  const [outlineText, setOutlineText] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load mindmap data (single source of truth — includes draft recovery)
  const loadMindmap = useCallback(async () => {
    if (!id) return
    const m = await db.mindmaps.where('project_id').equals(id).first()
    setMindmap(m ?? null)

    let text: string
    if (m?.tree_data) {
      text = treeToOutline(m.tree_data as Record<string, unknown>)
    } else {
      text = '中心主题\n'
    }

    // Check for local draft — only restore if user has unsaved edits AND the draft differs from DB
    const draftKey = `mindflow-outline-draft-${id}`
    const draft = localStorage.getItem(draftKey)
    if (draft && draft.trim() !== '' && draft !== text) {
      // Draft exists and differs from current DB state — show draft with toast hint
      setOutlineText(draft)
      setOriginalText(text) // compare against DB text, not draft
      toast.info('已恢复未保存的草稿', {
        description: '当前显示的是你上次编辑但未同步的内容',
        action: {
          label: '丢弃草稿',
          onClick: () => {
            setOutlineText(text)
            setOriginalText(text)
            localStorage.removeItem(draftKey)
          },
        },
      })
    } else {
      setOutlineText(text)
      setOriginalText(text)
      if (draft && draft === text) {
        // Draft identical to DB — safe to remove
        localStorage.removeItem(draftKey)
      }
    }
  }, [id])

  useEffect(() => {
    if (id) {
      setActiveProject(id)
      loadProjectTasks(id)
      loadMindmap()
    }
  }, [id, setActiveProject, loadProjectTasks, loadMindmap])

  // Track changes
  useEffect(() => {
    setHasChanges(outlineText !== originalText)
  }, [outlineText, originalText])

  // Warn on unsaved changes when leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!id || !hasChanges) return
    const key = `mindflow-outline-draft-${id}`
    localStorage.setItem(key, outlineText)
  }, [id, outlineText, hasChanges])

  const handleSyncToMindmap = async () => {
    if (!id) return
    if (!outlineText.trim()) {
      toast.error('大纲内容为空')
      return
    }

    setIsSaving(true)
    try {
      const newTree = outlineToTree(outlineText, mindmap?.tree_data as Record<string, unknown>)

      const existing = await db.mindmaps.where('project_id').equals(id).first()
      if (existing) {
        const updatedMindmap: LocalMindmap = {
          ...existing,
          tree_data: newTree,
          version: existing.version + 1,
        }
        await db.mindmaps.update(existing.id, {
          tree_data: newTree,
          version: existing.version + 1,
        })
        await syncMindmapToCloud(updatedMindmap).catch(() => { /* ignore offline */ })
      } else {
        const newMindmap: LocalMindmap = {
          id: `${Date.now()}`,
          project_id: id,
          tree_data: newTree,
          view_state: {},
          version: 1,
        }
        await db.mindmaps.put(newMindmap)
        await syncMindmapToCloud(newMindmap).catch(() => { /* ignore offline */ })
      }

      // Update task data from new tree
      await syncTasksFromTree(id, newTree)

      // Refresh tasks
      await loadProjectTasks(id)

      setOriginalText(outlineText)
      setHasChanges(false)

      // Clear draft
      const key = `mindflow-outline-draft-${id}`
      localStorage.removeItem(key)

      toast.success('已同步到思维导图', {
        description: '大纲内容已转换为导图结构',
      })
    } catch (err) {
      console.error('Sync to mindmap failed:', err)
      toast.error('同步失败', {
        description: err instanceof Error ? err.message : '请检查大纲格式',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRefreshFromMindmap = async () => {
    if (!id) return
    if (hasChanges) {
      const ok = window.confirm('当前编辑未保存，刷新将丢失更改。确定继续？')
      if (!ok) return
    }
    await loadMindmap()
    const key = `mindflow-outline-draft-${id}`
    localStorage.removeItem(key)
    toast.success('已从思维导图刷新')
  }

  const handleInsertDate = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const today = new Date().toISOString().split('T')[0]
    const newText = outlineText.slice(0, start) + `@${today}` + outlineText.slice(end)
    setOutlineText(newText)

    // Restore cursor position after re-render
    setTimeout(() => {
      textarea.selectionStart = start + today.length + 1
      textarea.selectionEnd = start + today.length + 1
      textarea.focus()
    }, 0)
  }

  if (!id) return null

  return (
    <div className="flex flex-col h-full">
      <ViewHeader projectId={id} />

      {/* Toolbar */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-border-default bg-bg-surface shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-text-muted" />
          <span className="text-xs text-text-muted">大纲模式</span>
          {hasChanges && (
            <span className="flex items-center gap-1 text-[10px] text-status-warning bg-status-warning/10 px-1.5 py-0.5 rounded">
              <AlertCircle className="h-3 w-3" />
              有未保存的更改
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-text-secondary"
            onClick={handleInsertDate}
          >
            @日期
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-text-secondary"
            onClick={handleRefreshFromMindmap}
            disabled={isSaving}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            从导图刷新
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs bg-primary-600 hover:bg-primary-700 text-white"
            onClick={handleSyncToMindmap}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            同步到导图
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col bg-bg-primary">
          <textarea
            ref={textareaRef}
            value={outlineText}
            onChange={(e) => setOutlineText(e.target.value)}
            className="flex-1 w-full p-6 resize-none outline-none bg-transparent text-sm text-text-primary leading-relaxed font-mono whitespace-pre"
            placeholder={`中心主题
  一级节点
    二级节点
  [ ] 待办任务 !高 @${new Date().toISOString().split('T')[0]}
  [x] 已完成任务 !中`}
            spellCheck={false}
          />
        </div>

        {/* Tips sidebar */}
        <div className="w-56 border-l border-border-default bg-bg-surface p-4 overflow-y-auto shrink-0 hidden md:block">
          <h3 className="text-xs font-medium text-text-primary mb-3">语法提示</h3>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] text-text-secondary font-mono">缩进</p>
              <p className="text-[10px] text-text-muted">2 个空格 = 1 级层级</p>
            </div>
            <div>
              <p className="text-[11px] text-text-secondary font-mono">[ ] 文本</p>
              <p className="text-[10px] text-text-muted">标记为待办任务</p>
            </div>
            <div>
              <p className="text-[11px] text-text-secondary font-mono">[x] 文本</p>
              <p className="text-[10px] text-text-muted">标记为已完成任务</p>
            </div>
            <div>
              <p className="text-[11px] text-text-secondary font-mono">!高 / !中 / !低 / !紧急</p>
              <p className="text-[10px] text-text-muted">任务优先级</p>
            </div>
            <div>
              <p className="text-[11px] text-text-secondary font-mono">@YYYY-MM-DD</p>
              <p className="text-[10px] text-text-muted">截止日期</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border-default">
            <h3 className="text-xs font-medium text-text-primary mb-2">示例</h3>
            <pre className="text-[10px] text-text-muted font-mono leading-relaxed whitespace-pre-wrap">
{`Q3 产品改版
  需求分析
    用户调研
    竞品分析
  [ ] 视觉设计 !高 @2026-07-15
  [ ] P0 缺陷修复 !紧急 @2026-07-06
  [x] 技术评审 !中`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
