/** Remaining hold time against the server clock, not the device clock. */
export function remainingMsFactory(expiresAt: string, serverTime: string): () => number {
  const capturedAt = Date.now()
  const offset = Date.parse(serverTime) - capturedAt
  return () => Date.parse(expiresAt) - (Date.now() + offset)
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
