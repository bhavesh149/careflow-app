import { createContext } from 'react'
import type { User } from '../api/types'

export type SessionValue = {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

/** Own module so Fast Refresh of session.tsx does not replace this object. */
export const SessionContext = createContext<SessionValue | null>(null)
