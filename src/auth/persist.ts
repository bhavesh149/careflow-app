import type { SessionResponse, User } from '../api/types'

export const STORAGE_KEY = 'careflow.session'

export type PersistedSession = {
  accessToken: string
  expiresAt: string
  refreshToken: string
  user: User
}

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readPersistedSession(): PersistedSession | null {
  try {
    const raw = storage()?.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedSession>
    if (
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.expiresAt !== 'string' ||
      typeof parsed.refreshToken !== 'string' ||
      !parsed.user ||
      typeof parsed.user.id !== 'string'
    ) {
      return null
    }
    return parsed as PersistedSession
  } catch {
    return null
  }
}

export function writePersistedSession(session: PersistedSession): void {
  storage()?.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearPersistedSession(): void {
  storage()?.removeItem(STORAGE_KEY)
}

export function accessTokenStillValid(expiresAt: string, skewMs = 5_000): boolean {
  return Date.parse(expiresAt) - skewMs > Date.now()
}

export function toPersisted(session: SessionResponse, previous?: PersistedSession | null): PersistedSession {
  return {
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
    refreshToken: session.refreshToken ?? previous?.refreshToken ?? '',
    user: session.user,
  }
}

/** One tab at a time: two tabs rotating the same refresh token would revoke the family. */
export async function withRefreshLock<T>(run: () => Promise<T>): Promise<T> {
  const locks = navigator.locks
  if (locks?.request) {
    return locks.request('careflow.refresh', run)
  }
  return run()
}
