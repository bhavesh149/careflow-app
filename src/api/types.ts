export type Role = 'PATIENT' | 'THERAPIST'

export type User = {
  id: string
  email: string
  role: Role
  fullName: string
  therapistId?: string
}

export type SessionResponse = {
  accessToken: string
  expiresAt: string
  expiresInSeconds: number
  refreshToken?: string
  user: User
}

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    requestId?: string
    details?: unknown
  }
}

export type Pagination = {
  limit: number
  offset: number
  total: number
  hasMore: boolean
}

export type Therapist = {
  id: string
  displayName: string
  specialization: string | null
}

export type TherapistList = {
  therapists: Therapist[]
  pagination: Pagination
}

export type HoldList = {
  holds: Hold[]
}

export type AppointmentList = {
  appointments: Appointment[]
}

export type Slot = {
  startTime: string
  endTime: string
}

export type Availability = {
  therapistId: string
  timezone: string
  slotGranularityMinutes: number
  from: string
  to: string
  serverTime: string
  slots: Slot[]
}

export type Hold = {
  id: string
  therapistId: string
  startTime: string
  endTime: string
  expiresAt: string
  serverTime: string
  expiresInSeconds: number
}

export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'

export type Appointment = {
  id: string
  therapistId: string
  therapistName: string
  patientId: string
  patientName: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  seriesId: string | null
  occurrenceIndex: number | null
  createdAt: string
}

export type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'

export type RecurringConflict = {
  startTime: string
  endTime: string
  reason: 'ALREADY_BOOKED' | 'OUTSIDE_SCHEDULE' | 'HELD_BY_OTHER'
}

export type Series = {
  id: string
  therapistId: string
  patientId: string
  frequency: Frequency
  occurrences: number
  status: 'ACTIVE' | 'CANCELLED'
  createdAt: string
  appointments: Appointment[]
  truncated?: boolean
  truncationReason?: string
  clampedOccurrences?: string[]
}

export type ScheduleRule = {
  dayOfWeek: number
  startTime: string
  endTime: string
  effectiveFrom?: string
  effectiveUntil?: string | null
}

export type Schedule = {
  rules: ScheduleRule[]
  timezone: string
  slotGranularityMinutes: number
}
