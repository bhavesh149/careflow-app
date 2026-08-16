/* eslint-disable react-refresh/only-export-components */
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/endpoints'
import { registerRefresh, setAccessToken } from '../api/client'
import type { Role, SessionResponse, User } from '../api/types'
import { homeFor } from './paths'
import { SessionContext, type SessionValue } from './session-context'
import {
  STORAGE_KEY,
  accessTokenStillValid,
  clearPersistedSession,
  readPersistedSession,
  toPersisted,
  withRefreshLock,
  writePersistedSession,
} from './persist'

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const apply = useCallback((session: SessionResponse) => {
    setAccessToken(session.accessToken)
    setUser(session.user)
    setExpiresAt(session.expiresAt)
    writePersistedSession(toPersisted(session, readPersistedSession()))
  }, [])

  const clear = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    setExpiresAt(null)
    clearPersistedSession()
  }, [])

  const restoreFromStorage = useCallback(() => {
    const stored = readPersistedSession()
    if (!stored || !accessTokenStillValid(stored.expiresAt)) return stored
    setAccessToken(stored.accessToken)
    setUser(stored.user)
    setExpiresAt(stored.expiresAt)
    return stored
  }, [])

  const refresh = useCallback(async () => {
    return withRefreshLock(async () => {
      try {
        const stored = readPersistedSession()
        const session = await authApi.refresh(stored?.refreshToken)
        apply(session)
        try {
          const me = await authApi.me()
          setUser(me)
        } catch {
          // Token is valid; profile re-read is best-effort.
        }
        return true
      } catch {
        return false
      }
    })
  }, [apply])

  useEffect(() => {
    registerRefresh(refresh)
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    const id = window.setTimeout(() => {
      restoreFromStorage()
      void refresh()
        .then(async (ok) => {
          if (cancelled) return
          if (ok) return
          const stored = readPersistedSession()
          if (stored && accessTokenStillValid(stored.expiresAt)) {
            try {
              const me = await authApi.me()
              if (!cancelled) setUser(me)
              return
            } catch {
              // Stored access token is stale.
            }
          }
          if (!cancelled) clear()
        })
        .finally(() => {
          if (!cancelled) setReady(true)
        })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [refresh, restoreFromStorage, clear])

  useEffect(() => {
    if (!expiresAt) return
    const delay = Math.max(0, Date.parse(expiresAt) - 60_000 - Date.now())
    const id = window.setTimeout(() => {
      void refresh().then((ok) => {
        if (!ok && !accessTokenStillValid(expiresAt)) clear()
      })
    }, delay)
    return () => window.clearTimeout(id)
  }, [expiresAt, refresh, clear])

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login(email, password)
      apply(session)
      return session.user
    },
    [apply],
  )

  const logout = useCallback(async () => {
    const stored = readPersistedSession()
    try {
      await authApi.logout(stored?.refreshToken)
    } finally {
      clear()
      queryClient.clear()
    }
  }, [clear, queryClient])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      if (!event.newValue) {
        setAccessToken(null)
        setUser(null)
        setExpiresAt(null)
        queryClient.clear()
        return
      }
      const stored = readPersistedSession()
      if (!stored) return
      setAccessToken(stored.accessToken)
      setUser(stored.user)
      setExpiresAt(stored.expiresAt)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [queryClient])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  if (!ready) {
    return <div className="boot">Restoring session…</div>
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useSession()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (user.role !== role) {
    return <Navigate to={homeFor(user)} replace />
  }
  return children
}
