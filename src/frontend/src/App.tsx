import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { NewProjectDialog } from '@/components/project/NewProjectDialog'
import { PomodoroTimer } from '@/components/pomodoro/PomodoroTimer'
import { HomePage } from '@/pages/HomePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProjectMindMapPage } from '@/pages/ProjectMindMapPage'
import { ProjectListPage } from '@/pages/ProjectListPage'
import { ProjectBoardPage } from '@/pages/ProjectBoardPage'
import { OutlinePage } from '@/pages/OutlinePage'
import { GlobalTasksPage } from '@/pages/GlobalTasksPage'
import { GlobalBoardPage } from '@/pages/GlobalBoardPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { GanttPage } from '@/pages/GanttPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AuthPage } from '@/pages/AuthPage'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Loader2 } from 'lucide-react'

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
      {canAccessApp && <NewProjectDialog />}
      {canAccessApp && <PomodoroTimer />}
    </BrowserRouter>
  )
}

export default App
