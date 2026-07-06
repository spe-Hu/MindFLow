import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'mindmap' | 'list' | 'board' | 'outline'
export type GlobalViewMode = 'list' | 'board'
export type ThemeMode = 'light' | 'dark' | 'system'

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  sidebarWidth: number
  setSidebarWidth: (v: number) => void

  // Dialogs
  isNewProjectDialogOpen: boolean
  setNewProjectDialogOpen: (v: boolean) => void

  // Theme
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void

  // Compact mode
  compactMode: boolean
  toggleCompactMode: () => void

  // Project views
  projectViews: Record<string, ViewMode>
  setProjectView: (projectId: string, view: ViewMode) => void

  // Global view
  globalViewMode: GlobalViewMode
  setGlobalViewMode: (v: GlobalViewMode) => void

  // Search
  isSearchOpen: boolean
  setSearchOpen: (v: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      sidebarWidth: 240,
      setSidebarWidth: (v) => set({ sidebarWidth: v }),

      isNewProjectDialogOpen: false,
      setNewProjectDialogOpen: (v) => set({ isNewProjectDialogOpen: v }),

      theme: 'system',
      setTheme: (t) => set({ theme: t }),

      compactMode: false,
      toggleCompactMode: () => set((s) => ({ compactMode: !s.compactMode })),

      projectViews: {},
      setProjectView: (projectId, view) =>
        set({ projectViews: { ...get().projectViews, [projectId]: view } }),

      globalViewMode: 'list',
      setGlobalViewMode: (v) => set({ globalViewMode: v }),

      isSearchOpen: false,
      setSearchOpen: (v) => set({ isSearchOpen: v }),
    }),
    {
      name: 'mindflow-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
        theme: state.theme,
        compactMode: state.compactMode,
        projectViews: state.projectViews,
        globalViewMode: state.globalViewMode,
      }),
    }
  )
)
