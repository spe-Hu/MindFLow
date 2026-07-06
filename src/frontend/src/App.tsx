import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { NewProjectDialog } from '@/components/project/NewProjectDialog'
import { PomodoroTimer } from '@/components/pomodoro/PomodoroTimer'
import { HomePage } from '@/pages/HomePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Loader2 } from 'lucide-react'

// Route-level code splitting: lazy-load non-core pages to reduce initial bundle
const ProjectMindMapPage = React.lazy(() => import('@/pages/ProjectMindMapPage'))
const ProjectListPage = React.lazy(() => import('@/pages/ProjectListPage'))
const ProjectBoardPage = React.lazy(() => import('@/pages/ProjectBoardPage'))
const OutlinePage = React.lazy(() => import('@/pages/OutlinePage'))
const GlobalTasksPage = React.lazy(() => import('@/pages/GlobalTasksPage'))
const GlobalBoardPage = React.lazy(() => import('@/pages/GlobalBoardPage'))
const CalendarPage = React.lazy(() => import('@/pages/CalendarPage'))
const GanttPage = React.lazy(() => import('@/pages/GanttPage'))
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'))
const AuthPage = React.lazy(() => import('@/pages/AuthPage'))

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
    </div>
  )
}

function App() {
  useAuth() // Initialize auth session
  useTheme() // Sync theme class to document root
  const { isAuthenticated, isLocalMode, isLoading } = useAuthStore()
  const canAccessApp = isAuthenticated || isLocalMode

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {!canAccessApp ? (
            <>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="*" element={<Navigate to="/auth" replace />} />
            </>
          ) : (
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/project/:id" element={<ProjectMindMapPage />} />
              <Route path="/project/:id/outline" element={<OutlinePage />} />
              <Route path="/project/:id/list" element={<ProjectListPage />} />
              <Route path="/project/:id/board" element={<ProjectBoardPage />} />
              <Route path="/global-tasks" element={<GlobalTasksPage />} />
              <Route path="/global-tasks/board" element={<GlobalBoardPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/gantt" element={<GanttPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </Suspense>
      {canAccessApp && <NewProjectDialog />}
      {canAccessApp && <PomodoroTimer />}
    </BrowserRouter>
  )
}

export default App
