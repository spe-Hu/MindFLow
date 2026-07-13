import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const store = useAuthStore()

  useEffect(() => {
    // Initialize session on mount
    store.initSession().catch(() => {
      /* ignore */
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Subscribe to Supabase auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await useAuthStore.getState().initSession()
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.setState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
        })
      } else if (event === 'TOKEN_REFRESHED' && session) {
        useAuthStore.setState({ session })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return store
}
