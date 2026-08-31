import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import './index.css'
import App from './App'
import { db } from './lib/db'
import { useAuthStore } from './stores/authStore'
import { useSyncStore, __resetSyncState } from './stores/syncStore'
import { syncTaskToCloud } from './lib/sync'
import { supabase } from './lib/supabase'

if (typeof window !== 'undefined') {
  ;(window as any).__mindflowDb = db
  ;(window as any).__authStore = useAuthStore
  ;(window as any).__syncStore = useSyncStore
  ;(window as any).__resetSyncState = __resetSyncState
  ;(window as any).__syncTaskToCloud = syncTaskToCloud
  ;(window as any).__supabase = supabase
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
