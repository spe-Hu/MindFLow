import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import type { User as AppUser } from '@/types/supabase'

interface AuthState {
  user: AppUser | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  isLocalMode: boolean
  error: string | null

  initSession: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>
  signInAnonymously: () => Promise<void>
  enableLocalMode: () => void
  disableLocalMode: () => void
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      isLocalMode: false,
      error: null,

      initSession: async () => {
        set({ isLoading: true })
        try {
          const { data } = await supabase.auth.getSession()
          const session = data.session

          if (session?.user) {
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            set({
              user: userData as AppUser | null,
              session,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
          } else {
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            })
          }
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Session initialization failed',
          })
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error

          const session = data.session
          const user = data.user

          if (session && user) {
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .single()

            set({
              user: userData as AppUser | null,
              session,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
          }
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Login failed',
          })
        }
      },

      register: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signUp({ email, password })
          if (error) throw error

          const session = data.session
          const user = data.user

          if (user) {
            await (supabase.from('users').upsert({
              id: user.id,
              username: email.split('@')[0],
              display_name: email.split('@')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as any) as any)

            if (session) {
              const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single()

              set({
                user: userData as AppUser | null,
                session,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              })
            } else {
              set({ isLoading: false })
            }
          }
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Registration failed',
          })
        }
      },

      signInWithOAuth: async (provider) => {
        set({ isLoading: true, error: null })
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: { redirectTo: window.location.origin },
          })
          if (error) throw error
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'OAuth login failed',
          })
        }
      },

      signInAnonymously: async () => {
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signInAnonymously()
          if (error) throw error

          const user = data.user
          if (user) {
            await (supabase.from('users').upsert({
              id: user.id,
              username: 'guest_' + user.id.slice(0, 8),
              display_name: '\u8bbf\u5ba2\u7528\u6237',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as any) as any)

            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .single()

            set({
              user: userData as AppUser | null,
              session: data.session,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
          }
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Anonymous login failed',
          })
        }
      },

      enableLocalMode: () => {
        set({ isLocalMode: true, isLoading: false, error: null })
      },

      disableLocalMode: () => {
        set({ isLocalMode: false })
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLocalMode: false,
          isLoading: false,
          error: null,
        })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'mindflow-auth-store',
      partialize: (state) => ({ isLocalMode: state.isLocalMode }),
    }
  )
)
