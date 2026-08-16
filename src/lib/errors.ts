import { ApiError } from '../api/client'
import type { RecurringConflict } from '../api/types'

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}

const MESSAGES: Record<string, string> = {
  SLOT_ALREADY_HELD:
    'This time is held by another patient. Pick a different slot — it will reopen when their 60-second hold ends.',
  SLOT_NOT_AVAILABLE: 'This slot is no longer available. Pick another time.',
  HOLD_EXPIRED: 'Your hold expired. Select the slot again to book.',
  HOLD_NOT_FOUND: 'That hold is gone. Select the slot again.',
  HOLD_NOT_OWNED: 'This hold belongs to another patient.',
  MAX_ACTIVE_HOLDS_EXCEEDED: 'You already have 3 slots on hold. Confirm or release one first.',
  APPOINTMENT_CONFLICT: 'You already have an appointment at this time. Choose another slot.',
  RECURRING_CONFLICT:
    'Nothing was booked — one or more sessions conflict with existing appointments.',
  APPOINTMENT_ALREADY_CANCELLED: 'This appointment is already cancelled.',
  SERIES_ALREADY_CANCELLED: 'This series is already cancelled.',
  INVALID_STATUS_TRANSITION: 'That status change is not allowed for this appointment.',
  OUTSIDE_STATUS_WINDOW: 'This appointment is outside the window where status can be updated.',
  SCHEDULE_CONFLICT: 'That schedule overlaps an existing appointment. Adjust the hours and try again.',
  RATE_LIMITED: 'Too many attempts. Wait a moment and try again.',
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  AUTHENTICATION_REQUIRED: 'Your session expired. Sign in again.',
  FORBIDDEN: 'You do not have permission to do that.',
  RESOURCE_NOT_FOUND: 'That record was not found. Refresh and try again.',
  VALIDATION_ERROR: 'Some details are invalid. Check the form and try again.',
  IDEMPOTENCY_KEY_REUSED: 'This request was already processed with a different payload.',
  IDEMPOTENCY_IN_PROGRESS: 'That request is still processing. Try again in a moment.',
  IDEMPOTENCY_KEY_REQUIRED: 'This action needs to be retried. Refresh the page and try again.',
  SERVICE_UNAVAILABLE: 'Careflow is temporarily unavailable. Try again shortly.',
  PAYLOAD_TOO_LARGE: 'That request is too large to send.',
  INTERNAL_ERROR: 'Something went wrong on our side. Please try again.',
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'RATE_LIMITED' && err.retryAfterSeconds) {
      return `Too many attempts. Wait ${err.retryAfterSeconds}s and try again.`
    }
    return MESSAGES[err.code] ?? err.message
  }
  if (err instanceof Error && err.message) {
    if (err.message === 'Failed to fetch' || err.message === 'NetworkError when attempting to fetch resource.') {
      return 'Unable to reach Careflow. Check your connection and try again.'
    }
    return err.message
  }
  return 'Something went wrong. Please try again.'
}

const warnCodes = new Set([
  'SLOT_ALREADY_HELD',
  'SLOT_NOT_AVAILABLE',
  'HOLD_EXPIRED',
  'HOLD_NOT_FOUND',
  'MAX_ACTIVE_HOLDS_EXCEEDED',
  'APPOINTMENT_CONFLICT',
  'RECURRING_CONFLICT',
  'APPOINTMENT_ALREADY_CANCELLED',
  'SERIES_ALREADY_CANCELLED',
  'INVALID_STATUS_TRANSITION',
  'OUTSIDE_STATUS_WINDOW',
  'SCHEDULE_CONFLICT',
  'RATE_LIMITED',
  'INVALID_CREDENTIALS',
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
