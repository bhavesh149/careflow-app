import { ApiError } from '../api/client'
import type { RecurringConflict } from '../api/types'

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Something went wrong. Please try again.'
}

const warnCodes = new Set([
  'SLOT_ALREADY_HELD',
  'SLOT_NOT_AVAILABLE',
  'HOLD_EXPIRED',
  'MAX_ACTIVE_HOLDS_EXCEEDED',
  'APPOINTMENT_CONFLICT',
  'RECURRING_CONFLICT',
  'APPOINTMENT_ALREADY_CANCELLED',
  'SERIES_ALREADY_CANCELLED',
  'INVALID_STATUS_TRANSITION',
  'OUTSIDE_STATUS_WINDOW',
  'RATE_LIMITED',
])

export function isWarnCode(code: string): boolean {
  return warnCodes.has(code)
}

export function recurringConflicts(err: unknown): RecurringConflict[] {
  if (!(err instanceof ApiError) || err.code !== 'RECURRING_CONFLICT') return []
  const details = err.details
  if (!details || typeof details !== 'object' || !('conflicts' in details)) return []
  const list = (details as { conflicts: unknown }).conflicts
  return Array.isArray(list) ? (list as RecurringConflict[]) : []
}
