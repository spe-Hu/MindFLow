import { useState, useEffect, useCallback, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { safeLinkUrl } from '@/lib/sanitize'
import type { LocalTask, AttachmentItem } from '@/lib/db'
import { upsertTask } from '@/lib/db'
import { usePomodoroStore } from '@/stores/pomodoroStore'
import {
  FileText,
  Pencil,
  Timer,
  CheckCircle2,
  CircleDot,
  AlertTriangle,
  CalendarDays,
  AlignLeft,
  Settings,
  Paperclip,
  Trash2,
  ImagePlus,
  X,
} from 'lucide-react'
import {
  uploadAttachment,
  deleteAttachment,
  formatFileSize,
  isImage,
} from '@/lib/attachments'
import { toast } from 'sonner'

// --------------------------------------------------
// Simple inline markdown parser (MVP: no extra deps)
// --------------------------------------------------

function parseInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  let remaining = text

  const patterns = [
    { regex: /\*\*\*(.+?)\*\*\*/, type: 'bolditalic' as const },
    { regex: /\*\*(.+?)\*\*/, type: 'bold' as const },
    { regex: /\*(.+?)\*/, type: 'italic' as const },
    { regex: /`([^`]+)`/, type: 'code' as const },
    { regex: /\[(.+?)\]\((https?:\/\/[^)]+)\)/, type: 'link' as const },
  ]

  while (remaining.length > 0) {
    let earliestMatch: {
      index: number
      length: number
      type: string
      groups: string[]
    } | null = null

    for (const p of patterns) {
      const match = remaining.match(p.regex)
      if (match && match.index !== undefined) {
        if (!earliestMatch || match.index < earliestMatch.index) {
          earliestMatch = {
            index: match.index,
            length: match[0].length,
            type: p.type,
            groups: match.slice(1),
          }
        }
      }
    }

    if (earliestMatch) {
      if (earliestMatch.index > 0) {
        tokens.push(
          <span key={tokens.length}>{remaining.slice(0, earliestMatch.index)}</span>
        )
      }
      switch (earliestMatch.type) {
        case 'bolditalic':
          tokens.push(
            <strong key={tokens.length}>
              <em>{earliestMatch.groups[0]}</em>
            </strong>
          )
          break
        case 'bold':
          tokens.push(<strong key={tokens.length}>{earliestMatch.groups[0]}</strong>)
          break
        case 'italic':
          tokens.push(<em key={tokens.length}>{earliestMatch.groups[0]}</em>)
          break
        case 'code':
          tokens.push(
            <code
              key={tokens.length}
              className={cn(
                'px-1 py-0.5 rounded text-xs font-mono border',
                'bg-bg-elevated border-border-default text-text-primary'
              )}
            >
              {earliestMatch.groups[0]}
            </code>
          )
          break
        case 'link':
          {
            const safeUrl = safeLinkUrl(earliestMatch.groups[1])
            if (safeUrl) {
              tokens.push(
                <a
                  key={tokens.length}
                  href={safeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {earliestMatch.groups[0]}
                </a>
              )
            } else {
              tokens.push(<span key={tokens.length}>{earliestMatch.groups[0]}</span>)
            }
          }
          break
      }
      remaining = remaining.slice(earliestMatch.index + earliestMatch.length)
    } else {
      tokens.push(<span key={tokens.length}>{remaining}</span>)
      break
    }
  }
  return tokens
}

function MarkdownPreview({ text }: { text: string }) {
  const lines = text.split('\n')
  const result: React.ReactNode[] = []
  let inList = false
  let listItems: React.ReactNode[] = []

  const flushList = () => {
    if (inList && listItems.length > 0) {
      result.push(
        <ul key={`list-${result.length}`} className="my-1 space-y-0.5">
          {listItems.map((item, i) => (
            <li key={i} className="ml-4 list-disc text-sm text-text-secondary leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      )
      listItems = []
      inList = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('# ')) {
      flushList()
      result.push(
        <h1 key={i} className="text-lg font-bold mt-4 mb-2 text-text-primary">
          {parseInline(line.slice(2))}
        </h1>
      )
    } else if (line.startsWith('## ')) {
      flushList()
      result.push(
        <h2 key={i} className="text-base font-semibold mt-3 mb-1 text-text-primary">
          {parseInline(line.slice(3))}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      flushList()
      result.push(
        <h3 key={i} className="text-sm font-medium mt-3 mb-1 text-text-primary">
          {parseInline(line.slice(4))}
        </h3>
      )
    } else if (line.startsWith('- ')) {
      inList = true
      listItems.push(parseInline(line.slice(2)))
    } else if (line.trim() === '') {
      flushList()
      result.push(<div key={i} className="h-2" />)
    } else {
      flushList()
      result.push(
        <p key={i} className="text-sm text-text-secondary leading-relaxed mb-1">
          {parseInline(line)}
        </p>
      )
    }
  }
  flushList()
  return <div className="space-y-0.5">{result}</div>
}

// --------------------------------------------------
// Status / Priority helpers
// --------------------------------------------------

const STATUS_LABEL: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  cancelled: '已取消',
}

const STATUS_ICON: Record<string, typeof CircleDot> = {
  todo: CircleDot,
  in_progress: AlertTriangle,
  done: CheckCircle2,
  cancelled: CircleDot,
}

const STATUS_COLOR: Record<string, string> = {
  todo: 'text-text-muted',
  in_progress: 'text-priority-medium',
  done: 'text-status-success',
  cancelled: 'text-text-muted',
}

const PRIORITY_LABEL: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
}

const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-priority-low',
  medium: 'bg-priority-medium',
  high: 'bg-priority-high',
  urgent: 'bg-priority-urgent',
}

// --------------------------------------------------
// Component
// --------------------------------------------------

interface NodeDetailSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeData: Record<string, unknown> | null
  projectId: string
  onUpdateNodeData: (updates: Record<string, unknown>) => void
}

export function NodeDetailSidebar({
  open,
  onOpenChange,
  nodeData,
  projectId,
  onUpdateNodeData,
}: NodeDetailSidebarProps) {
  const [activeTab, setActiveTab] = useState('properties')
  const [noteEditMode, setNoteEditMode] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [taskInfo, setTaskInfo] = useState<LocalTask | null>(null)
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pomodoro = usePomodoroStore()

  const text = String(nodeData?.text || '')
  const uid = String(nodeData?.uid || '')
  const isTask = Boolean(nodeData?._isTask)
  const note = String(nodeData?._note || '')

  // Load associated task from IndexedDB when uid changes
  useEffect(() => {
    if (!uid || !isTask) {
      setTaskInfo(null)
      setAttachments([])
      return
    }
    const taskId = `${projectId}-${uid}`
    db.tasks.get(taskId).then((task) => {
      setTaskInfo(task || null)
      setAttachments(task?.attachments || [])
    })
  }, [uid, isTask, projectId])

  // Sync draft when note from nodeData changes
  useEffect(() => {
    if (open && !noteEditMode) {
      setNoteDraft(note)
    }
  }, [note, open, noteEditMode])

  const handleSaveNote = useCallback(() => {
    onUpdateNodeData({ _note: noteDraft })
    setNoteEditMode(false)
  }, [noteDraft, onUpdateNodeData])

  const handleStartPomodoro = useCallback(() => {
    if (!taskInfo) return
    pomodoro.start(taskInfo.id, taskInfo.title)
    pomodoro.setOpen(true)
  }, [taskInfo, pomodoro])

  const handleToggleTask = useCallback(() => {
    const newIsTask = !isTask
    onUpdateNodeData({
      _isTask: newIsTask,
      _status: newIsTask ? 'todo' : undefined,
      _priority: newIsTask ? 'medium' : undefined,
      fillColor: newIsTask ? '#eff6ff' : undefined,
      borderColor: newIsTask ? '#93c5fd' : undefined,
      color: newIsTask ? '#1e40af' : undefined,
    })
  }, [isTask, onUpdateNodeData])

  const handleStatusChange = useCallback(
    (status: string) => {
      onUpdateNodeData({ _status: status })
      if (status === 'done') {
        onUpdateNodeData({
          _status: 'done',
          _completedAt: new Date().toISOString(),
          fillColor: '#dcfce7',
          borderColor: '#86efac',
          color: '#15803d',
        })
      } else {
        onUpdateNodeData({
          _status: status,
          fillColor: '#eff6ff',
          borderColor: '#93c5fd',
          color: '#1e40af',
        })
      }
    },
    [onUpdateNodeData]
  )

  const handlePriorityChange = useCallback(
    (priority: string) => {
      onUpdateNodeData({ _priority: priority })
    },
    [onUpdateNodeData]
  )

  const handleDueDateChange = useCallback(
    (dateStr: string) => {
      onUpdateNodeData({
        _dueDate: dateStr ? new Date(dateStr).toISOString() : undefined,
      })
    },
    [onUpdateNodeData]
  )

  // ---------- Attachment handlers ----------

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (!isTask) {
        toast.error('请先「转为任务」再添加附件')
        return
      }
      if (!taskInfo) return

      setUploading(true)
      try {
        const item = await uploadAttachment(taskInfo.id, file)
        const newAttachments = [...attachments, item]
        setAttachments(newAttachments)

        // Update IndexedDB
        await db.tasks.update(taskInfo.id, { attachments: newAttachments })
        // Sync to cloud
        const updatedTask = await db.tasks.get(taskInfo.id)
        if (updatedTask) await upsertTask(updatedTask)

        toast.success('附件上传成功')
      } catch (e: any) {
        toast.error(e.message || '附件上传失败')
      } finally {
        setUploading(false)
      }
    },
    [isTask, taskInfo, attachments]
  )

  const handleDeleteAttachment = useCallback(
    async (item: AttachmentItem) => {
      if (!taskInfo) return
      if (!confirm(`确定删除附件 "${item.name}" 吗？`)) return

      try {
        await deleteAttachment(item.path)
        const newAttachments = attachments.filter((a) => a.id !== item.id)
        setAttachments(newAttachments)

        // Update IndexedDB
        await db.tasks.update(taskInfo.id, { attachments: newAttachments })
        // Sync to cloud
        const updatedTask = await db.tasks.get(taskInfo.id)
        if (updatedTask) await upsertTask(updatedTask)

        toast.success('附件已删除')
      } catch (e: any) {
        toast.error(e.message || '删除失败')
      }
    },
    [taskInfo, attachments]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (activeTab !== 'attachments') return
      const files = e.clipboardData.files
      if (!files || files.length === 0) return

      for (const file of Array.from(files)) {
        if (isImage(file.type)) {
          handleUploadFile(file)
        }
      }
    },
    [activeTab, handleUploadFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return
      for (const file of Array.from(files)) {
        handleUploadFile(file)
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [handleUploadFile]
  )

  const StatusIcon = STATUS_ICON[(nodeData?._status as string) || 'todo'] || CircleDot
  const statusColor = STATUS_COLOR[(nodeData?._status as string) || 'todo'] || 'text-text-muted'
  const priorityColor = PRIORITY_COLOR[(nodeData?._priority as string) || 'medium']

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:max-w-[400px] p-0 gap-0"
        onPaste={handlePaste}
      >
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border-default shrink-0">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 shrink-0">
              <AlignLeft className="h-4 w-4 text-text-muted" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-sm font-medium truncate leading-tight">
                {text || '未命名节点'}
              </SheetTitle>
              <p className="text-2xs text-text-muted font-mono mt-0.5 truncate">uid: {uid || '-'}</p>
            </div>
          </div>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col h-[calc(100%-64px)]"
        >
          <TabsList className="mx-4 mt-3 shrink-0 w-fit">
            <TabsTrigger value="properties">
              <Settings className="h-3.5 w-3.5 mr-1" />
              属性
            </TabsTrigger>
            <TabsTrigger value="document">
              <FileText className="h-3.5 w-3.5 mr-1" />
              文档
            </TabsTrigger>
            <TabsTrigger value="attachments">
              <Paperclip className="h-3.5 w-3.5 mr-1" />
              附件
              {attachments.length > 0 && (
                <span className="ml-1 text-2xs bg-primary-subtle text-primary-600 px-1.5 rounded-full">
                  {attachments.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ---------- Properties Tab ---------- */}
          <TabsContent
            value="properties"
            className="flex-1 overflow-auto px-4 py-3 space-y-4 min-h-0"
          >
            {/* Task toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">任务标记</span>
              <button
                onClick={handleToggleTask}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium transition-colors',
                  isTask
                    ? 'bg-primary-subtle text-primary-600'
                    : 'bg-bg-elevated text-text-muted hover:text-text-secondary'
                )}
              >
                {isTask ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已标记为任务
                  </>
                ) : (
                  <>
                    <CircleDot className="h-3.5 w-3.5" />
                    转为任务
                  </>
                )}
              </button>
            </div>

            {isTask && (
              <>
                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">状态</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(['todo', 'in_progress', 'done', 'cancelled'] as const).map((s) => {
                      const SIcon = STATUS_ICON[s]
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          className={cn(
                            'flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium transition-all border',
                            (nodeData?._status as string) === s
                              ? 'border-primary bg-primary-subtle text-primary-600'
                              : 'border-border-default bg-bg-surface text-text-muted hover:text-text-secondary hover:border-border-hover'
                          )}
                        >
                          <SIcon className={cn('h-3.5 w-3.5', STATUS_COLOR[s])} />
                          {STATUS_LABEL[s]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">优先级</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => handlePriorityChange(p)}
                        className={cn(
                          'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all border',
                          (nodeData?._priority as string) === p
                            ? 'border-primary bg-primary-subtle text-primary-600'
                            : 'border-border-default bg-bg-surface text-text-muted hover:text-text-secondary hover:border-border-hover'
                        )}
                      >
                        <span className={cn('h-2.5 w-2.5 rounded-full', PRIORITY_COLOR[p])} />
                        {PRIORITY_LABEL[p]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Due date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">截止日期</label>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-text-muted" />
                    <input
                      type="date"
                      value={
                        nodeData?._dueDate
                          ? String(nodeData._dueDate).slice(0, 10)
                          : ''
                      }
                      onChange={(e) => handleDueDateChange(e.target.value)}
                      className={cn(
                        'h-8 px-2.5 rounded-lg border text-xs',
                        'border-border-default bg-bg-surface text-text-primary',
                        'focus:outline-none focus:ring-1 focus:ring-primary-400'
                      )}
                    />
                    {!!nodeData?._dueDate && (
                      <button
                        onClick={() => handleDueDateChange('')}
                        className="text-text-muted hover:text-status-error text-xs"
                      >
                        清除
                      </button>
                    )}
                  </div>
                </div>

                {/* Pomodoro */}
                {taskInfo && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary">番茄钟</label>
                    <div className="flex items-center justify-between bg-bg-elevated rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-priority-high" />
                        <span className="text-sm text-text-primary">
                          已完成{' '}
                          <span className="font-semibold">{taskInfo.pomodoro_count || 0}</span>{' '}
                          个番茄
                        </span>
                      </div>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={handleStartPomodoro}
                      >
                        <Timer className="h-3 w-3 mr-1" />
                        开始专注
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Node type info */}
            <div className="pt-2 border-t border-border-default space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">节点信息</label>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-2xs">
                  {uid === 'root' ? '根节点' : isTask ? '任务节点' : '普通节点'}
                </Badge>
                {isTask && (
                  <>
                    <Badge variant="secondary" className="text-2xs flex items-center gap-1">
                      <StatusIcon className={cn('h-3 w-3', statusColor)} />
                      {STATUS_LABEL[(nodeData?._status as string) || 'todo']}
                    </Badge>
                    <Badge variant="secondary" className="text-2xs flex items-center gap-1">
                      <span className={cn('h-2 w-2 rounded-full', priorityColor)} />
                      {PRIORITY_LABEL[(nodeData?._priority as string) || 'medium']}优先级
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ---------- Document Tab ---------- */}
          <TabsContent
            value="document"
            className="flex-1 min-h-0 flex flex-col px-4 py-3"
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-xs text-text-muted">
                {noteEditMode ? '编辑模式' : '预览模式'}
              </span>
              <div className="flex items-center gap-1">
                {noteEditMode ? (
                  <>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => {
                        setNoteEditMode(false)
                        setNoteDraft(note)
                      }}
                      title="取消"
                    >
                      <AlignLeft className="h-3 w-3" />
                    </Button>
                    <Button size="xs" variant="default" onClick={handleSaveNote}>
                      保存
                    </Button>
                  </>
                ) : (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setNoteEditMode(true)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    编辑
                  </Button>
                )}
              </div>
            </div>

            {/* Editor / Preview */}
            <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border-default bg-bg-surface">
              {noteEditMode ? (
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="在此输入 Markdown 文档...
支持：# 标题、- 列表、**粗体**、*斜体*、`代码`、[链接](url)"
                  className={cn(
                    'w-full h-full resize-none p-3 text-sm leading-relaxed',
                    'bg-transparent text-text-primary placeholder:text-text-muted',
                    'focus:outline-none font-mono'
                  )}
                />
              ) : (
                <div className="p-3 min-h-full">
                  {note ? (
                    <MarkdownPreview text={note} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-text-muted gap-2 py-8">
                      <FileText className="h-8 w-8 opacity-30" />
                      <p className="text-xs">暂无文档</p>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setNoteEditMode(true)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        新建文档
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick hint */}
            {!noteEditMode && note && (
              <p className="text-2xs text-text-muted mt-2 text-center shrink-0">
                支持 Markdown 语法：# 标题 · **粗体** · *斜体* · `代码` · [链接](url)
              </p>
            )}
          </TabsContent>

          {/* ---------- Attachments Tab ---------- */}
          <TabsContent
            value="attachments"
            className="flex-1 min-h-0 flex flex-col px-4 py-3"
          >
            {/* Upload area */}
            <div
              className={cn(
                'shrink-0 rounded-lg border border-dashed border-border-default bg-bg-surface',
                'p-4 text-center cursor-pointer transition-colors hover:border-border-hover hover:bg-bg-elevated',
                uploading && 'opacity-60 pointer-events-none'
              )}
              onClick={() => {
                if (!isTask) {
                  toast.error('请先「转为任务」再添加附件')
                  return
                }
                fileInputRef.current?.click()
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleFileSelect}
                accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain"
              />
              <ImagePlus className="h-5 w-5 mx-auto text-text-muted mb-1" />
              <p className="text-xs text-text-muted">
                {uploading ? '上传中...' : isTask ? '点击选择文件 或 直接粘贴图片' : '请先转为任务'}
              </p>
              <p className="text-2xs text-text-muted mt-0.5">
                支持 PNG, JPG, GIF, PDF, TXT · 最大 5MB · 粘贴图片使用 Ctrl+V
              </p>
            </div>

            {/* Attachment list */}
            <div className="flex-1 min-h-0 overflow-auto mt-3 space-y-2">
              {attachments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-text-muted gap-2 py-8">
                  <Paperclip className="h-8 w-8 opacity-30" />
                  <p className="text-xs">暂无附件</p>
                </div>
              ) : (
                attachments.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg border border-border-default bg-bg-surface group"
                  >
                    {/* Thumbnail or icon */}
                    {isImage(item.type) ? (
                      <button
                        onClick={() => setPreviewUrl(item.url)}
                        className="shrink-0 w-12 h-12 rounded-md overflow-hidden bg-bg-elevated border border-border-default"
                      >
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <div className="shrink-0 w-12 h-12 rounded-md bg-bg-elevated border border-border-default flex items-center justify-center">
                        <FileText className="h-5 w-5 text-text-muted" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {item.name}
                      </p>
                      <p className="text-2xs text-text-muted">
                        {formatFileSize(item.size)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        download={item.name}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                        title="下载"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteAttachment(item)}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-text-muted hover:text-status-error hover:bg-status-error/10"
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>

      {/* Image preview overlay */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-8"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Sheet>
  )
}
