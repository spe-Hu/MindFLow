import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LogIn, UserPlus, Globe, Fingerprint, Loader2, Lock, Sparkles } from 'lucide-react'

export function AuthPage() {
  const navigate = useNavigate()
  const { login, register, signInWithOAuth, signInAnonymously, enableLocalMode, isLoading, error, clearError } = useAuthStore()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    if (mode === 'login') { await login(email, password) }
    else { await register(email, password) }
    if (!useAuthStore.getState().error) { navigate('/') }
  }

  const handleOAuth = async (provider: 'google' | 'github') => { await signInWithOAuth(provider) }

  const handleAnonymous = async () => {
    await signInAnonymously()
    if (!useAuthStore.getState().error) { navigate('/') }
  }

  const handleLocalMode = () => { enableLocalMode(); navigate('/') }

  return (
    <div className="min-h-screen flex bg-bg-primary relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 左上角微妙渐变 */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-[0.06] bg-primary-600 blur-3xl" />
        {/* 右下角微妙渐变 */}
        <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.04] bg-primary-400 blur-3xl" />
        {/* 中心上方微弱光晕 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-[0.03] bg-primary-500 blur-3xl" />
        {/* 细密网格 */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* 左侧品牌区 — 大平板/桌面显示 */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center relative z-10 px-16 border-r border-border-default/50">
        <div className="max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/20">
              <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-text-primary">MindFlow</h1>
              <p className="text-sm text-text-muted mt-0.5">思维导图 × 任务管理</p>
            </div>
          </div>

          {/* 价值主张 */}
          <div className="space-y-5">
            {[
              { icon: Sparkles, title: '结构化思维', desc: '用思维导图梳理项目，清晰直观' },
              { icon: Lock, title: '数据安全', desc: '本地优先存储，可选多端云端同步' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-bg-surface/60 border border-border-default/60 backdrop-blur-sm">
                <div className="h-9 w-9 rounded-lg bg-primary-subtle flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="h-4.5 w-4.5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-6 md:p-12">
        <div className="w-full max-w-[420px]">
          {/* 移动端 Logo */}
          <div className="flex lg:hidden flex-col items-center mb-10">
            <div className="h-14 w-14 rounded-2xl bg-primary-600 flex items-center justify-center mb-4 shadow-lg shadow-primary-600/20">
              <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">MindFlow</h1>
            <p className="text-sm text-text-muted mt-1">思维导图 × 任务管理</p>
          </div>

          {/* 登录/注册面板 */}
          <div className="bg-bg-surface border border-border-default rounded-2xl shadow-sm overflow-hidden">
            {/* Tab 切换 */}
            <div className="flex">
              <button
                onClick={() => { setMode('login'); clearError() }}
                className={`flex-1 h-12 text-sm font-medium transition-colors border-b-2 ${
                  mode === 'login'
                    ? 'border-primary-600 text-primary-600 bg-bg-surface'
                    : 'border-transparent text-text-muted hover:text-text-secondary bg-bg-elevated'
                }`}
              >
                登录
              </button>
              <button
                onClick={() => { setMode('register'); clearError() }}
                className={`flex-1 h-12 text-sm font-medium transition-colors border-b-2 ${
                  mode === 'register'
                    ? 'border-primary-600 text-primary-600 bg-bg-surface'
                    : 'border-transparent text-text-muted hover:text-text-secondary bg-bg-elevated'
                }`}
              >
                注册
              </button>
            </div>

            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-text-primary">邮箱</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="h-12 bg-bg-primary border-border-default rounded-lg focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500 transition-shadow"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-text-primary">密码</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 位"
                    required
                    minLength={6}
                    className="h-12 bg-bg-primary border-border-default rounded-lg focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500 transition-shadow"
                  />
                </div>

                {error && (
                  <p className="text-xs text-status-error bg-status-error/10 rounded-lg px-4 py-2.5 border border-status-error/10">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium shadow-sm shadow-primary-600/15"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : mode === 'login' ? (
                    <LogIn className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {mode === 'login' ? '登录' : '注册'}
                </Button>
              </form>

              {/* 分隔线 */}
              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-default" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-bg-surface px-4 text-xs text-text-muted">或</span>
                </div>
              </div>

              {/* 其它登录方式 */}
              <div className="space-y-2.5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 text-sm border-border-default hover:bg-bg-elevated rounded-lg"
                  onClick={() => handleOAuth('google')}
                  disabled={isLoading}
                >
                  <Globe className="h-4 w-4 mr-2 text-text-muted" />
                  使用 Google 账号登录
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-10 text-xs text-text-muted hover:text-text-secondary rounded-lg"
                  onClick={handleAnonymous}
                  disabled={isLoading}
                >
                  <Fingerprint className="h-4 w-4 mr-2" />
                  暂不登录，访客体验
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-10 text-xs text-text-muted hover:text-text-secondary rounded-lg"
                  onClick={handleLocalMode}
                  disabled={isLoading}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  离线使用，数据仅存本地
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
