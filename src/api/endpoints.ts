import { api } from './client'
import type {
  Appointment,
  AppointmentList,
  AppointmentStatus,
  Availability,
  Frequency,
  Hold,
  HoldList,
  Schedule,
  Series,
  SessionResponse,
  TherapistList,
  User,
} from './types'

export const authApi = {
  login: (email: string, password: string) =>
    api<SessionResponse>('/v1/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
      skipRefresh: true,
    }),
  refresh: (refreshToken?: string) =>
    api<SessionResponse>('/v1/auth/refresh', {
      method: 'POST',
      body: refreshToken ? { refreshToken } : {},
      auth: false,
      skipRefresh: true,
    }),
  logout: (refreshToken?: string) =>
    api<void>('/v1/auth/logout', {
      method: 'POST',
      body: refreshToken ? { refreshToken } : {},
      skipRefresh: true,
    }),
  me: () => api<User>('/v1/me', { skipRefresh: true }),
}

export const therapistsApi = {
  list: (offset = 0) =>
    api<TherapistList>(`/v1/therapists?limit=50&offset=${offset}`),
  availability: (therapistId: string, from: string, to: string) =>
    api<Availability>(
      `/v1/therapists/${therapistId}/availability?from=${from}&to=${to}`,
    ),
  getSchedule: () => api<Schedule>('/v1/therapists/me/schedule'),
  putSchedule: (body: {
    rules: { dayOfWeek: number; startTime: string; endTime: string }[]
    effectiveFrom?: string
  }) => api<Schedule>('/v1/therapists/me/schedule', { method: 'PUT', body }),
}

export const holdsApi = {
  create: (therapistId: string, startTime: string) =>
    api<Hold>('/v1/holds', { method: 'POST', body: { therapistId, startTime } }),
  active: () => api<HoldList>('/v1/holds/active'),
  release: (holdId: string) => api<void>(`/v1/holds/${holdId}`, { method: 'DELETE' }),
}

export const appointmentsApi = {
  confirm: (holdId: string, idempotencyKey: string) =>
    api<Appointment>('/v1/appointments/confirm', {
      method: 'POST',
      body: { holdId },
      idempotencyKey,
    }),
  mine: (role: 'PATIENT' | 'THERAPIST', status?: string) => {
    const path =
      role === 'PATIENT' ? '/v1/patients/me/appointments' : '/v1/therapists/me/appointments'
    const query = status ? `?status=${status}&limit=50` : '?limit=50'
    return api<AppointmentList>(`${path}${query}`)
  },
  cancel: (id: string, idempotencyKey: string) =>
    api<Appointment>(`/v1/appointments/${id}/cancel`, {
      method: 'POST',
      idempotencyKey,
    }),
  status: (id: string, status: Extract<AppointmentStatus, 'COMPLETED' | 'NO_SHOW'>, key: string) =>
    api<Appointment>(`/v1/appointments/${id}/status`, {
      method: 'POST',
      body: { status },
      idempotencyKey: key,
    }),
}

export const seriesApi = {
  create: (
    body: {
      therapistId: string
      startTime: string
      frequency: Frequency
      occurrences: number
    },
    idempotencyKey: string,
  ) =>
    api<Series>('/v1/recurring-series', {
      method: 'POST',
      body,
      idempotencyKey,
    }),
  get: (id: string) => api<Series>(`/v1/recurring-series/${id}`),
  cancel: (id: string, idempotencyKey: string) =>
    api<Series>(`/v1/recurring-series/${id}/cancel`, {
      method: 'POST',
      idempotencyKey,
    }),
  cancelInstance: (seriesId: string, instanceId: string, idempotencyKey: string) =>
    api<Appointment>(
      `/v1/recurring-series/${seriesId}/instances/${instanceId}/cancel`,
      { method: 'POST', idempotencyKey },
    ),
}
