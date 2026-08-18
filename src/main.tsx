import type { AuthUser } from './auth/types'
import { StrictMode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { createRoot } from 'react-dom/client'
import { mapSupabaseUserToAuthUser, type SupabaseSessionUser } from './auth/supabaseAuth'

import './index.css'
import App from './App.tsx'
import LoginPage from './LoginPage.tsx'

const SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000
const SESSION_STARTED_AT_KEY = 'bw-session-started-at'

function readSessionStartedAt(): number | null {
  const raw = localStorage.getItem(SESSION_STARTED_AT_KEY)
  if (!raw) {
    return null
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function isSessionExpired(startedAt: number): boolean {
  return Date.now() - startedAt >= SESSION_MAX_AGE_MS
}

function writeSessionStartedAt(timestamp: number): void {
  localStorage.setItem(SESSION_STARTED_AT_KEY, String(timestamp))
}

function clearSessionStartedAt(): void {
  localStorage.removeItem(SESSION_STARTED_AT_KEY)
}

function Root() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  const forceLogout = useCallback(async () => {
    await supabase.auth.signOut()
    clearSessionStartedAt()
    setUser(null)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function bootstrapSession() {
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session?.user) {
        clearSessionStartedAt()
        if (isMounted) {
          setUser(null)
          setIsCheckingSession(false)
        }
        return
      }

      const startedAt = readSessionStartedAt()
      if (!startedAt || isSessionExpired(startedAt)) {
        await forceLogout()
        if (isMounted) {
          setIsCheckingSession(false)
        }
        return
      }

      if (isMounted) {
        setUser(mapSupabaseUserToAuthUser(data.session.user))
        setIsCheckingSession(false)
      }
    }

    void bootstrapSession()

    const intervalId = window.setInterval(() => {
      const startedAt = readSessionStartedAt()
      if (startedAt && isSessionExpired(startedAt)) {
        void forceLogout()
      }
    }, 300_000)

    const { data: authListener } = supabase.auth.onAuthStateChange((...args: unknown[]) => {
      const session = (args[1] ?? null) as { user?: SupabaseSessionUser } | null
      if (!session?.user) {
        clearSessionStartedAt()
        setUser(null)
        return
      }

      if (!readSessionStartedAt()) {
        writeSessionStartedAt(Date.now())
      }

      setUser(mapSupabaseUserToAuthUser(session.user))
    })

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
      authListener.subscription.unsubscribe()
    }
  }, [forceLogout])

  function handleLoginSuccess(authUser: AuthUser) {
    writeSessionStartedAt(Date.now())
    setUser(authUser)
  }

  if (isCheckingSession) {
    return null
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return <App userDisplayName={user.displayName} onLogout={() => void forceLogout()} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <Root /> */}
    <App userDisplayName={"John Doe"} onLogout={undefined} />
  </StrictMode>,
)
