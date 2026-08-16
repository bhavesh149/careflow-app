/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
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

type SessionValue = {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const apply = useCallback((session: SessionResponse) => {
    setAccessToken(session.accessToken)
    setUser(session.user)
    setExpiresAt(session.expiresAt)
  }, [])

  const clear = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    setExpiresAt(null)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const session = await authApi.refresh()
      apply(session)
      try {
        const me = await authApi.me()
        setUser(me)
      } catch {
        // Token is valid; profile re-read is best-effort.
      }
      return true
    } catch {
      clear()
      return false
    }
  }, [apply, clear])

  useEffect(() => {
    registerRefresh(refresh)
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    const id = window.setTimeout(() => {
      void refresh().finally(() => {
        if (!cancelled) setReady(true)
      })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [refresh])

  useEffect(() => {
    if (!expiresAt) return
    const delay = Math.max(0, Date.parse(expiresAt) - 60_000 - Date.now())
    const id = window.setTimeout(() => {
      void refresh()
    }, delay)
    return () => window.clearTimeout(id)
  }, [expiresAt, refresh])

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login(email, password)
      apply(session)
      return session.user
    },
    [apply],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clear()
      queryClient.clear()
    }
  }, [clear, queryClient])

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
