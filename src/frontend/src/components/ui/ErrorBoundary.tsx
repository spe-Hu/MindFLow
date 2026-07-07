import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught error:', error, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary px-4">
          <div className="w-16 h-16 rounded-2xl bg-status-error/10 flex items-center justify-center mb-5">
            <AlertTriangle className="h-8 w-8 text-status-error" />
          </div>
          <h1 className="text-lg font-semibold text-text-primary mb-2">
            页面遇到了一点问题
          </h1>
          <p className="text-sm text-text-secondary mb-6 max-w-xs text-center">
            很抱歉，MindFlow 在渲染时发生了意外错误。您可以尝试刷新页面，或者返回首页重新开始。
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={this.handleGoHome}
              className="h-9 px-4 text-sm"
            >
              <Home className="h-4 w-4 mr-1.5" />
              返回首页
            </Button>
            <Button
              onClick={this.handleReload}
              className="h-9 px-4 text-sm bg-primary-600 hover:bg-primary-700 text-white"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              刷新页面
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
