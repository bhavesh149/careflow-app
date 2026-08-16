import { randomId } from './id'

const prefix = 'careflow.idem.'

/**
 * One key per user intent. If the request body fingerprint changes, mint a new key so
 * the API does not return 422 IDEMPOTENCY_KEY_REUSED.
 */
export function intentKey(intent: string, fingerprint = ''): string {
  const keySlot = prefix + intent
  const fpSlot = keySlot + '.fp'
  const stored = sessionStorage.getItem(keySlot)
  const storedFp = sessionStorage.getItem(fpSlot)
  if (stored && storedFp === fingerprint) return stored
  const next = randomId()
  sessionStorage.setItem(keySlot, next)
  sessionStorage.setItem(fpSlot, fingerprint)
  return next
}

export function clearIntent(intent: string): void {
  sessionStorage.removeItem(prefix + intent)
  sessionStorage.removeItem(prefix + intent + '.fp')
}
