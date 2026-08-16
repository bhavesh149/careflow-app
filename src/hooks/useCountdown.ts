import { useMemo, useSyncExternalStore } from 'react'
import type { Hold } from '../api/types'
import { remainingMsFactory } from '../lib/clock'

export function useCountdown(hold: Hold | null): number {
  const remainingFn = useMemo(
    () => (hold ? remainingMsFactory(hold.expiresAt, hold.serverTime) : () => 0),
    [hold],
  )
  return useSyncExternalStore(
    (onStoreChange) => {
      const id = window.setInterval(onStoreChange, 250)
      return () => window.clearInterval(id)
    },
    remainingFn,
    remainingFn,
  )
}
