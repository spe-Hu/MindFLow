import { useState, useEffect, useRef } from 'react'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { db, getStorageStats, runHealthCheck, fixHealthIssues, type StorageStats, type HealthIssue } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { migrateLocalDataToCloud, fetchAllFromCloud } from '@/lib/sync'
import {
  User, Palette, Cloud, Database, Keyboard, Sparkles,
  Download, Upload, Trash2, LogOut, Loader2, RotateCcw,
  RefreshCw, Wifi, WifiOff, FolderKanban, CheckCircle2,
  AlertTriangle, AlertCircle, Stethoscope, Wrench,
  FileJson, CalendarClock, Eye, EyeOff,
} from 'lucide-react'
import { loadAIConfig, saveAIConfig, type AIConfig } from '@/lib/aiMindMap'
import { toast } from 'sonner'

const NAV_SECTIONS = [
  { value: 'account', label: '账户', icon: User },
  { value: 'cloud', label: '云端同步', icon: Cloud },
  { value: 'appearance', label: '外观', icon: Palette },
  { value: 'ai', label: 'AI 助手', icon: Sparkles },
  { value: 'storage', label: '存储', icon: Database },
  { value: 'shortcuts', label: '快捷键', icon: Keyboard },
] as const

export function SettingsPage() {
  const { theme, setTheme, compactMode, toggleCompactMode, sidebarWidth, setSidebarWidth } = useUIStore()
  const { user, logout } = useAuthStore()
  const { archivedProjects, loadArchivedProjects, unarchiveProject, removeProject } = useProjectStore()
  const [activeSection, setActiveSection] = useState<string>('account')
  const [storageUsed, setStorageUsed] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [username, setUsername] = useState(user?.username || '')
  const [deleteArchivedId, setDeleteArchivedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isOnlineStatus, setIsOnlineStatus] = useState(navigator.onLine)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('mindflow-last-sync-time')
  })
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [healthIssues, setHealthIssues] = useState<HealthIssue[] | null>(null)
  const [isHealthChecking, setIsHealthChecking] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [lastExportTime, setLastExportTime] = useState<string | null>(() => {
    return localStorage.getItem('mindflow-last-export-time')
  })
  // AI 配置
  const [aiConfig, setAIConfig] = useState<AIConfig>({
    enabled: false,
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    preferApi: false,
  })
  const [showApiKey, setShowApiKey] = useState(false)
  const [isAILoading, setIsAILoading] = useState(false)

  // 滚动到对应 section
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const handleNavClick = (value: string) => {
    setActiveSection(value)
    const el = sectionRefs.current[value]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // 监听滚动，自动更新 activeSection
  useEffect(() => {
    const container = document.querySelector('[data-settings-scroll]')
    if (!container) return
    const onScroll = () => {
      const top = container.scrollTop + 80
      let current = 'account'
      for (const s of NAV_SECTIONS) {
        const el = sectionRefs.current[s.value]
        if (el && el.offsetTop <= top) {
          current = s.value
        }
      }
      setActiveSection(current)
    }
    container.addEventListener('scroll', onScroll)
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  const themeOptions = [
    { key: 'light', label: '浅色' },
    { key: 'dark', label: '深色' },
    { key: 'system', label: '跟随系统' },
  ] as const

  // Load storage usage & archived projects & stats
  useEffect(() => {
    async function calcStorage() {
      try {
        const s = await getStorageStats()
        setStats(s)
        setStorageUsed(s.estimatedSizeKB)
      } catch {
        setStorageUsed(0)
      }
    }
    calcStorage()
    loadArchivedProjects()
    const handleStatus = () => setIsOnlineStatus(navigator.onLine)
    window.addEventListener('online', handleStatus)
    window.addEventListener('offline', handleStatus)
    return () => {
      window.removeEventListener('online', handleStatus)
      window.removeEventListener('offline', handleStatus)
    }
  }, [loadArchivedProjects])

  useEffect(() => {
    setDisplayName(user?.display_name || '')
    setUsername(user?.username || '')
  }, [user])

  useEffect(() => {
    loadAIConfig().then(setAIConfig).catch(() => {})
  }, [])

  const handleSaveProfile = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      const payload = { display_name: displayName, username, updated_at: new Date().toISOString() }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('users').update as any)(payload).eq('id', user.id)
      useAuthStore.setState({ user: { ...user, display_name: displayName, username } })
    } catch (err) {
      console.error('Save profile failed:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportData = async () => {
    const projects = await db.projects.toArray()
    const mindmaps = await db.mindmaps.toArray()
    const tasks = await db.tasks.toArray()
    const settings = await db.settings.toArray()
    const exportData = { version: '1.1', exportedAt: new Date().toISOString(), projects, mindmaps, tasks, settings }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mindflow-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    const now = new Date().toISOString()
    localStorage.setItem('mindflow-last-export-time', now)
    setLastExportTime(now)
    toast.success('数据已导出', { description: '建议定期导出备份，防止数据丢失' })
  }

  const handleClearCache = async () => {
    if (!confirm('确定要清除所有本地缓存吗？数据不会从云端删除。')) return
    await db.delete()
    window.location.reload()
  }

  const handleRunHealthCheck = async () => {
    setIsHealthChecking(true)
    try {
      const issues = await runHealthCheck()
      setHealthIssues(issues)
      if (issues.length === 0) toast.success('数据健康检查通过', { description: '未发现异常' })
    } catch {
      toast.error('健康检查失败')
    } finally {
      setIsHealthChecking(false)
    }
  }

  const handleFixIssues = async () => {
    if (!healthIssues?.length) return
    const fixable = healthIssues.filter((i) => i.autoFixable)
    if (!fixable.length) { toast.info('没有可自动修复的问题'); return }
    if (!confirm(`将自动修复 ${fixable.length} 个问题（删除孤立任务），确定继续？`)) return
    setIsFixing(true)
    try {
      const fixed = await fixHealthIssues(fixable)
      const s = await getStorageStats()
      setStats(s); setStorageUsed(s.estimatedSizeKB)
      const issues = await runHealthCheck()
      setHealthIssues(issues)
      toast.success(`已修复 ${fixed} 个问题`)
    } catch {
      toast.error('修复失败')
    } finally {
      setIsFixing(false)
    }
  }

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.version || !Array.isArray(data.projects)) {
        toast.error('无效的 MindFlow 数据文件，缺少必要的字段')
        return
      }
      if (!data.version.startsWith('1.')) {
        toast.error(`不兼容的数据版本: ${data.version}`)
        return
      }
      const existing = await db.projects.toArray()
      const confirmMsg = existing.length > 0
        ? `当前有 ${existing.length} 个项目，导入将合并数据（同名项目会被覆盖）。确定继续？`
        : `即将导入 ${data.projects.length} 个项目，确定继续？`
      if (!window.confirm(confirmMsg)) return

      function reviveDates(obj: Record<string, unknown>, dateKeys: string[]): Record<string, unknown> {
        const copy = { ...obj }
        for (const key of dateKeys) {
          const val = copy[key]
          if (typeof val === 'string') {
            const d = new Date(val)
            if (!isNaN(d.getTime())) copy[key] = d
          }
        }
        return copy
      }
      await db.transaction('rw', [db.projects, db.mindmaps, db.tasks, db.settings], async () => {
        if (data.projects?.length) await db.projects.bulkPut(data.projects.map((p: Record<string, unknown>) => reviveDates(p, ['last_opened_at', 'created_at', 'updated_at'])))
        if (data.mindmaps?.length) await db.mindmaps.bulkPut(data.mindmaps.map((m: Record<string, unknown>) => reviveDates(m, ['created_at', 'updated_at'])))
        if (data.tasks?.length) await db.tasks.bulkPut(data.tasks.map((t: Record<string, unknown>) => reviveDates(t, ['due_date', 'completed_at', 'created_at', 'updated_at'])))
        if (data.settings?.length) await db.settings.bulkPut(data.settings)
      })
      await loadArchivedProjects()
      await useProjectStore.getState().loadProjects()
      toast.success('导入成功', { description: `已导入 ${data.projects.length} 个项目` })
    } catch (err) {
      console.error('Import failed:', err)
      toast.error('导入失败', { description: err instanceof Error ? err.message : '请检查文件格式是否正确' })
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ---- Cloud Sync Panel ----
  const CloudSyncPanel = () => {
    const usr = useAuthStore.getState().user
    const isLoggedIn = !!usr
    const avatarUrl = usr?.avatar_url
    const displayName = usr?.display_name || usr?.username || '未登录'

    const handleSyncUpload = async () => {
      if (!isLoggedIn) { toast.error('请先登录'); return }
      setIsSyncing(true)
      try {
        const projects = await db.projects.toArray()
        const mindmaps = await db.mindmaps.toArray()
        const tasks = await db.tasks.toArray()
        await migrateLocalDataToCloud(projects, mindmaps, tasks)
        const now = new Date().toISOString()
        localStorage.setItem('mindflow-last-sync-time', now)
        setLastSyncTime(now)
        toast.success('同步完成', { description: `${projects.length} 个项目、${tasks.length} 个任务已上传到云端` })
      } catch (err) {
        toast.error('同步失败', { description: err instanceof Error ? err.message : '请检查网络连接' })
      } finally { setIsSyncing(false) }
    }

    const handleSyncDownload = async () => {
      if (!isLoggedIn) { toast.error('请先登录'); return }
      if (!confirm('从云端恢复将覆盖所有本地数据，确定继续吗？')) return
      setIsSyncing(true)
      try {
        const { projects, mindmaps, tasks } = await fetchAllFromCloud()
        await db.transaction('rw', [db.projects, db.mindmaps, db.tasks], async () => {
          if (projects.length) await db.projects.bulkPut(projects)
          if (mindmaps.length) await db.mindmaps.bulkPut(mindmaps)
          if (tasks.length) await db.tasks.bulkPut(tasks)
        })
        await useProjectStore.getState().loadProjects()
        const now = new Date().toISOString()
        localStorage.setItem('mindflow-last-sync-time', now)
        setLastSyncTime(now)
        toast.success('恢复完成', { description: `${projects.length} 个项目、${tasks.length} 个任务已从云端恢复` })
      } catch (err) {
        toast.error('恢复失败', { description: err instanceof Error ? err.message : '请检查网络连接' })
      } finally { setIsSyncing(false) }
    }

    const formatLastSync = (iso: string | null) => {
      if (!iso) return '尚未同步'
      const d = new Date(iso)
      const diff = Date.now() - d.getTime()
      if (diff < 60000) return '刚刚'
      if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
      return d.toLocaleDateString('zh-CN')
    }

    return (
      <div className="space-y-6">
        {/* 同步状态卡片 */}
        <div className="flex items-center gap-4 p-5 rounded-xl border border-border-default bg-bg-elevated">
          <div className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
            isOnlineStatus ? 'bg-status-success/10 text-status-success' : 'bg-status-error/10 text-status-error'
          )}>
            {isOnlineStatus ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary">{isOnlineStatus ? '网络在线' : '网络离线'}</p>
            <p className="text-xs text-text-muted mt-0.5">上次同步: {formatLastSync(lastSyncTime)}</p>
          </div>
        </div>

        {/* 用户信息 */}
        {isLoggedIn ? (
          <div className="flex items-center gap-4 p-5 rounded-xl border border-border-default bg-bg-surface">
            <div className="h-12 w-12 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center overflow-hidden text-primary-700 text-base font-semibold">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{displayName}</p>
              <p className="text-xs text-text-muted">已登录，数据会自动同步到云端</p>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-xl border border-border-default bg-bg-surface">
            <p className="text-sm font-medium text-text-primary">未登录</p>
            <p className="text-xs text-text-muted mt-0.5">登录后可将数据同步到云端，多设备访问</p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleSyncUpload}
            disabled={isSyncing || !isLoggedIn || !isOnlineStatus}
            size="sm"
            className="h-9 text-xs bg-primary-600 hover:bg-primary-700 text-white"
          >
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Cloud className="h-3.5 w-3.5 mr-1.5" />}
            立即同步（上传）
          </Button>
          <Button
            onClick={handleSyncDownload}
            disabled={isSyncing || !isLoggedIn || !isOnlineStatus}
            variant="outline"
            size="sm"
            className="h-9 text-xs"
          >
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            从云端恢复
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* ---- 左侧导航栏 ---- */}
      <aside className="w-64 shrink-0 border-r border-border-default bg-bg-surface flex flex-col">
        <div className="px-6 pt-8 pb-6">
          <h2 className="text-xl font-bold tracking-tight text-text-primary">设置</h2>
          <p className="text-xs text-text-muted mt-1">管理您的偏好与数据</p>
        </div>
        <nav className="flex-1 px-3 pb-6 space-y-1 overflow-y-auto">
          {NAV_SECTIONS.map((s) => {
            const Icon = s.icon
            const isActive = activeSection === s.value
            return (
              <button
                key={s.value}
                onClick={() => handleNavClick(s.value)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-subtle text-primary-700 shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                )}
              >
                <Icon className={cn('h-4.5 w-4.5 shrink-0', isActive ? 'text-primary-600' : 'text-text-muted')} />
                <span>{s.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="px-6 py-4 border-t border-border-default">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">MindFlow</p>
              <p className="text-[10px] text-text-muted">v1.1</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ---- 右侧内容区 ---- */}
      <main data-settings-scroll className="flex-1 overflow-y-auto bg-bg-primary scroll-smooth">
        <div className="max-w-[900px] mx-auto px-10 py-10 space-y-14">

          {/* ===== 账户 ===== */}
          <section ref={(el) => { sectionRefs.current['account'] = el }}>
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-text-primary">账户信息</h3>
              <p className="text-sm text-text-muted mt-1">管理您的个人资料与登录状态</p>
            </div>
            <div className="bg-bg-surface border border-border-default rounded-xl p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-text-primary">显示名称</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="输入显示名称"
                    className="h-11 bg-bg-primary border-border-default focus-visible:ring-primary-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-text-primary">用户名</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="输入用户名"
                    className="h-11 bg-bg-primary border-border-default focus-visible:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button
                  size="sm"
                  className="bg-primary-600 hover:bg-primary-700 text-white h-10 px-5"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                  保存更改
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-4 text-text-secondary hover:text-text-primary"
                  onClick={() => logout()}
                >
                  <LogOut className="h-4 w-4 mr-1.5" />
                  退出登录
                </Button>
              </div>
              {user && (
                <div className="p-3 bg-bg-elevated rounded-lg">
                  <p className="text-[11px] text-text-muted uppercase tracking-wider">用户 ID</p>
                  <p className="text-xs text-text-secondary font-mono mt-1">{user.id}</p>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-status-error">删除账户</p>
                  <p className="text-xs text-text-muted mt-1">此操作不可撤销，所有数据将被永久删除</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-status-error/30 text-status-error hover:bg-status-error/10 hover:text-status-error"
                  onClick={() => alert('账户删除功能暂未开放')}
                >
                  删除账户
                </Button>
              </div>
            </div>
          </section>

          {/* ===== 云端同步 ===== */}
          <section ref={(el) => { sectionRefs.current['cloud'] = el }}>
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-text-primary">云端同步</h3>
              <p className="text-sm text-text-muted mt-1">将本地数据备份到云端，多设备同步</p>
            </div>
            <div className="bg-bg-surface border border-border-default rounded-xl p-8">
              <CloudSyncPanel />
            </div>
          </section>

          {/* ===== 外观 ===== */}
          <section ref={(el) => { sectionRefs.current['appearance'] = el }}>
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-text-primary">外观</h3>
              <p className="text-sm text-text-muted mt-1">自定义界面主题和布局偏好</p>
            </div>
            <div className="bg-bg-surface border border-border-default rounded-xl p-8 space-y-8">
              {/* 主题选择 */}
              <div>
                <Label className="text-sm font-medium text-text-primary mb-3 block">主题</Label>
                <div className="flex items-center gap-3">
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setTheme(opt.key)}
                      className={cn(
                        'flex-1 max-w-[200px] h-14 rounded-xl border-2 text-sm font-medium transition-all duration-fast flex items-center justify-center gap-2',
                        theme === opt.key
                          ? 'border-primary-600 text-primary-700 bg-primary-subtle'
                          : 'border-border-default text-text-secondary hover:border-primary-300 bg-bg-elevated hover:bg-bg-primary'
                      )}
                    >
                      {opt.key === 'light' && <span className="h-4 w-4 rounded-full bg-orange-300 inline-block" />}
                      {opt.key === 'dark' && <span className="h-4 w-4 rounded-full bg-slate-700 inline-block" />}
                      {opt.key === 'system' && <span className="h-4 w-4 rounded-full bg-gradient-to-br from-orange-300 to-slate-700 inline-block" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
              {/* 侧边栏宽度 */}
              <div className="flex items-center justify-between gap-6">
                <div className="shrink-0">
                  <Label className="text-sm font-medium text-text-primary block">侧边栏宽度</Label>
                  <p className="text-xs text-text-muted mt-1">调整左侧项目管理面板的宽度</p>
                </div>
                <div className="w-56">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-muted">{sidebarWidth}px</span>
                  </div>
                  <Slider
                    value={sidebarWidth}
                    onValueChange={(v) => setSidebarWidth(Array.isArray(v) ? v[0]! : v)}
                    min={180}
                    max={320}
                    step={10}
                  />
                </div>
              </div>
              <Separator />
              {/* 紧凑模式 */}
              <div className="flex items-center justify-between gap-6">
                <div>
                  <Label className="text-sm font-medium text-text-primary block">紧凑模式</Label>
                  <p className="text-xs text-text-muted mt-1">列表行高从 48px 降至 36px，节省屏幕空间</p>
                </div>
                <Switch checked={compactMode} onCheckedChange={toggleCompactMode} />
              </div>
            </div>
          </section>

          {/* ===== AI 助手 ===== */}
          <section ref={(el) => { sectionRefs.current['ai'] = el }}>
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-text-primary">AI 助手</h3>
              <p className="text-sm text-text-muted mt-1">配置外部 LLM API，让 AI 生成更灵活的思维导图结构</p>
            </div>
            <div className="bg-bg-surface border border-border-default rounded-xl p-8 space-y-6">
              {/* 启用开关 */}
              <div className="flex items-center justify-between gap-6">
                <div>
                  <Label className="text-sm font-medium text-text-primary block">启用外部 AI</Label>
                  <p className="text-xs text-text-muted mt-1">开启后，新建项目时可选 AI 生成模式（需配置 API Key）</p>
                </div>
                <Switch
                  checked={aiConfig.enabled}
                  onCheckedChange={(v) => setAIConfig((c) => ({ ...c, enabled: v }))}
                />
              </div>

              {aiConfig.enabled && (
                <>
                  <Separator />
                  {/* API Key */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-text-primary">API Key</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showApiKey ? 'text' : 'password'}
                          value={aiConfig.apiKey}
                          onChange={(e) => setAIConfig((c) => ({ ...c, apiKey: e.target.value }))}
                          placeholder="sk-..."
                          className="h-11 bg-bg-primary border-border-default focus-visible:ring-primary-500 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-text-muted">支持 OpenAI 及兼容接口（如 Azure、DeepSeek 等）</p>
                  </div>

                  {/* Base URL */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-text-primary">Base URL</Label>
                    <Input
                      value={aiConfig.baseUrl}
                      onChange={(e) => setAIConfig((c) => ({ ...c, baseUrl: e.target.value }))}
                      placeholder="https://api.openai.com/v1"
                      className="h-11 bg-bg-primary border-border-default focus-visible:ring-primary-500"
                    />
                  </div>

                  {/* 模型 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-text-primary">模型</Label>
                    <Input
                      value={aiConfig.model}
                      onChange={(e) => setAIConfig((c) => ({ ...c, model: e.target.value }))}
                      placeholder="gpt-4o-mini"
                      className="h-11 bg-bg-primary border-border-default focus-visible:ring-primary-500"
                    />
                  </div>

                  {/* 优先使用 API */}
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <Label className="text-sm font-medium text-text-primary block">优先使用 AI 生成</Label>
                      <p className="text-xs text-text-muted mt-1">默认优先调用外部 API，失败时自动回退本地规则</p>
                    </div>
                    <Switch
                      checked={aiConfig.preferApi}
                      onCheckedChange={(v) => setAIConfig((c) => ({ ...c, preferApi: v }))}
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  className="bg-primary-600 hover:bg-primary-700 text-white h-10 px-5"
                  onClick={async () => {
                    setIsAILoading(true)
                    try {
                      await saveAIConfig(aiConfig)
                      toast.success('AI 配置已保存')
                    } catch {
                      toast.error('保存失败')
                    } finally {
                      setIsAILoading(false)
                    }
                  }}
                  disabled={isAILoading}
                >
                  {isAILoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                  保存配置
                </Button>
                {!aiConfig.enabled && (
                  <p className="text-xs text-text-muted">未启用外部 AI 时，AI 生成将使用本地规则引擎</p>
                )}
              </div>
            </div>
          </section>

          {/* ===== 存储 ===== */}
          <section ref={(el) => { sectionRefs.current['storage'] = el }}>
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-text-primary">存储管理</h3>
              <p className="text-sm text-text-muted mt-1">查看数据用量、备份与健康状态</p>
            </div>

            {/* 数据概览卡片 */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: '项目', value: stats.activeProjectCount, icon: FolderKanban, sub: `归档 ${stats.archivedProjectCount}`, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                  { label: '节点', value: stats.nodeCount, icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                  { label: '任务', value: stats.taskCount, icon: FileJson, sub: `完成 ${stats.completedTaskCount}`, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                  { label: '大小', value: `${stats.estimatedSizeKB} KB`, icon: CheckCircle2, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
                ].map((item) => (
                  <div key={item.label} className="bg-bg-surface border border-border-default rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', item.bg)}>
                        <item.icon className={cn('h-3.5 w-3.5', item.color)} />
                      </div>
                      <span className="text-xs text-text-muted">{item.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-text-primary tracking-tight">{item.value}</p>
                    {item.sub && <p className="text-[11px] text-text-muted mt-1">{item.sub}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* 用量 + 备份 */}
            <div className="bg-bg-surface border border-border-default rounded-xl p-8 space-y-6 mb-6">
              <h4 className="text-sm font-semibold text-text-primary">数据备份</h4>
              {/* 用量进度条 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">IndexedDB 用量</span>
                  <span className="text-sm font-medium text-text-primary">{storageUsed} KB / 50 MB</span>
                </div>
                <div className="h-2.5 w-full bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      storageUsed > 48640 ? 'bg-status-error' : storageUsed > 40960 ? 'bg-amber-500' : 'bg-primary-600'
                    )}
                    style={{ width: `${Math.min((storageUsed / 51200) * 100, 100)}%` }}
                  />
                </div>
                {storageUsed > 48640 && (
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <AlertCircle className="h-3.5 w-3.5 text-status-error" />
                    <p className="text-xs text-status-error">存储空间即将用完，请立即导出备份或清理旧项目</p>
                  </div>
                )}
                {storageUsed > 40960 && storageUsed <= 48640 && (
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <p className="text-xs text-amber-600">存储空间使用超过 80%，建议导出备份</p>
                  </div>
                )}
              </div>

              {/* 备份提醒 */}
              {(() => {
                if (!lastExportTime) {
                  return (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <CalendarClock className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-sm text-amber-700">尚未导出过数据备份，建议定期导出以防止数据丢失</p>
                    </div>
                  )
                }
                const daysSince = Math.floor((Date.now() - new Date(lastExportTime).getTime()) / 86400000)
                if (daysSince > 30) {
                  return (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <CalendarClock className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-sm text-amber-700">距离上次导出已 {daysSince} 天，建议重新导出备份</p>
                    </div>
                  )
                }
                return <p className="text-sm text-text-muted">上次导出: {new Date(lastExportTime).toLocaleDateString('zh-CN')}</p>
              })()}

              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" size="sm" className="h-9" onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-1.5" />
                  导出数据
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                  {isImporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                  导入数据
                </Button>
                <Button variant="ghost" size="sm" className="h-9 text-text-muted hover:text-status-error" onClick={handleClearCache}>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  清除缓存
                </Button>
                <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportData} />
              </div>
            </div>

            {/* 健康检查 */}
            <div className="bg-bg-surface border border-border-default rounded-xl p-8 mb-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">数据健康检查</h4>
                  <p className="text-xs text-text-muted mt-0.5">扫描数据一致性，自动修复异常</p>
                </div>
                <div className="flex items-center gap-2">
                  {healthIssues && healthIssues.length > 0 && healthIssues.some((i) => i.autoFixable) && (
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleFixIssues} disabled={isFixing}>
                      {isFixing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5 mr-1.5" />}
                      自动修复
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleRunHealthCheck} disabled={isHealthChecking}>
                    {isHealthChecking ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Stethoscope className="h-3.5 w-3.5 mr-1.5" />}
                    运行检查
                  </Button>
                </div>
              </div>

              {healthIssues === null && !isHealthChecking && (
                <p className="text-sm text-text-muted">点击「运行检查」扫描数据一致性</p>
              )}
              {isHealthChecking && <p className="text-sm text-text-muted">正在检查数据完整性...</p>}
              {healthIssues !== null && healthIssues.length === 0 && (
                <div className="flex items-center gap-2.5 p-4 rounded-lg bg-status-success/10 border border-status-success/20">
                  <CheckCircle2 className="h-5 w-5 text-status-success" />
                  <p className="text-sm text-status-success font-medium">数据健康，未发现异常</p>
                </div>
              )}
              {healthIssues !== null && healthIssues.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  {healthIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className={cn(
                        'flex items-start gap-3 p-3.5 rounded-lg border',
                        issue.severity === 'error'
                          ? 'bg-status-error/5 border-status-error/20'
                          : 'bg-amber-500/5 border-amber-500/20'
                      )}
                    >
                      {issue.severity === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-status-error shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p className={cn('text-sm', issue.severity === 'error' ? 'text-status-error' : 'text-amber-700')}>
                          {issue.message}
                        </p>
                        {issue.autoFixable && <p className="text-[10px] text-text-muted mt-1">可自动修复</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 归档项目 */}
            <div className="bg-bg-surface border border-border-default rounded-xl p-8">
              <h4 className="text-sm font-semibold text-text-primary mb-4">已归档项目</h4>
              {archivedProjects.length === 0 ? (
                <p className="text-sm text-text-muted">暂无已归档项目</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {archivedProjects.map((p) => (
                    <div key={p.id} className="flex items-center justify-between h-11 px-4 rounded-lg border border-border-default bg-bg-primary">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', `bg-project-${p.color}`)} />
                        <span className="text-sm text-text-primary truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-text-secondary hover:text-primary-600" onClick={() => unarchiveProject(p.id)}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          恢复
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-status-error hover:bg-status-error/10" onClick={() => setDeleteArchivedId(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {deleteArchivedId && (
                <div className="mt-4 p-4 rounded-lg border border-status-error/30 bg-status-error/5">
                  <p className="text-sm text-text-secondary mb-3">
                    确定要彻底删除「{archivedProjects.find(p => p.id === deleteArchivedId)?.name}」吗？此操作不可恢复。
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDeleteArchivedId(null)}>取消</Button>
                    <Button size="sm" className="h-8 text-xs bg-status-error hover:bg-status-error/90 text-white" onClick={async () => {
                      if (deleteArchivedId) { await removeProject(deleteArchivedId); setDeleteArchivedId(null) }
                    }}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> 彻底删除
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ===== 快捷键 ===== */}
          <section ref={(el) => { sectionRefs.current['shortcuts'] = el }}>
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-text-primary">快捷键</h3>
              <p className="text-sm text-text-muted mt-1">提升效率的键盘操作</p>
            </div>
            <div className="bg-bg-surface border border-border-default rounded-xl p-8">
              <div className="space-y-0 divide-y divide-border-default">
                {[
                  { action: '全局搜索', shortcut: 'Cmd / Ctrl + K' },
                  { action: '新建项目', shortcut: 'Cmd / Ctrl + Shift + N' },
                  { action: '创建同级节点', shortcut: 'Enter' },
                  { action: '创建子节点', shortcut: 'Tab' },
                  { action: '删除节点', shortcut: 'Delete / Backspace' },
                  { action: '展开/折叠节点', shortcut: 'Space' },
                  { action: '转为任务 / 取消', shortcut: 'T' },
                ].map((item) => (
                  <div key={item.action} className="flex items-center justify-between py-3.5 px-2">
                    <span className="text-sm text-text-primary">{item.action}</span>
                    <kbd className="font-mono text-xs bg-bg-elevated border border-border-default px-2.5 py-1 rounded-md text-text-secondary shadow-sm">
                      {item.shortcut}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 底部间距 */}
          <div className="h-20" />
        </div>
      </main>
    </div>
  )
}
