import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { retryIdempotent } from '../../api/client'
import { appointmentsApi } from '../../api/endpoints'
import type { Appointment } from '../../api/types'
import { useSession } from '../../auth/session'
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { useConfirmDialog } from '../../components/ConfirmDialog'
import { useQueryErrorToast, useToast } from '../../components/Toast'
import { errorMessage } from '../../lib/errors'
import { clearIntent, intentKey } from '../../lib/idempotency'
import { patientShowcase, profilePhoto } from '../../data/demo'
import {
  formatLongDate,
  formatTime,
  groupKey,
  isInStatusWindow,
  kolkataDate,
} from '../../lib/tz'

export function DashboardPage() {
  const { user } = useSession()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { ask, dialog } = useConfirmDialog()
  const [day, setDay] = useState(kolkataDate())
  const [q, setQ] = useState('')

  const upcoming = useQuery({
    queryKey: ['appointments', 'THERAPIST', 'UPCOMING'],
    queryFn: () => appointmentsApi.mine('THERAPIST', 'UPCOMING'),
  })
  const past = useQuery({
    queryKey: ['appointments', 'THERAPIST', 'PAST'],
    queryFn: () => appointmentsApi.mine('THERAPIST', 'PAST'),
  })
  useQueryErrorToast(upcoming.error)
  useQueryErrorToast(past.error)

  const all = useMemo(
    () => [...(upcoming.data?.appointments ?? []), ...(past.data?.appointments ?? [])],
    [upcoming.data, past.data],
  )

  const todayIso = kolkataDate()
  const todayRows = all.filter((a) => groupKey(a.startTime) === todayIso)
  const dayRows = all
    .filter((a) => groupKey(a.startTime) === day)
    .filter((a) => a.patientName.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const completedToday = todayRows.filter((a) => a.status === 'COMPLETED').length
  const next = (upcoming.data?.appointments ?? []).find((a) => a.status === 'SCHEDULED')

  const mark = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'COMPLETED' | 'NO_SHOW' }) => {
      const key = intentKey(`status:${id}:${status}`, `${id}:${status}`)
      return retryIdempotent(() => appointmentsApi.status(id, status, key))
    },
    onSuccess: (_data, vars) => {
      clearIntent(`status:${vars.id}:${vars.status}`)
      toast.push(`Marked ${vars.status.toLowerCase().replace('_', ' ')}`)
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
    onError: (err) => toast.fromError(err),
  })

  const cancel = useMutation({
    mutationFn: (id: string) => {
      const key = intentKey(`cancel:${id}`, id)
      return retryIdempotent(() => appointmentsApi.cancel(id, key))
    },
    onSuccess: (_data, id) => {
      clearIntent(`cancel:${id}`)
      toast.push('Appointment cancelled')
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
    onError: (err) => toast.fromError(err),
  })

  const firstName = user?.fullName.replace(/^Dr\.\s+/i, '').split(' ')[0] ?? 'there'
  const loading = upcoming.isPending || past.isPending
  const loadError = upcoming.error ?? past.error

  return (
    <div className="stack stack-lg">
      <header className="page-header">
        <div>
          <h1>Welcome back, Dr. {firstName}</h1>
          <p className="muted">Here is your schedule for {formatLongDate(`${day}T12:00:00+05:30`)}.</p>
        </div>
        <div className="topbar-user page-header-user">
          <div className="text-right">
            <strong>{user?.fullName}</strong>
            <p className="muted">Therapist</p>
          </div>
          <Avatar name={user?.fullName ?? 'T'} src={user ? profilePhoto(user) : undefined} />
        </div>
      </header>

      <div className="grid grid-3">
        <article className="card stat-card">
          <div className="stat-icon">
            <Icon name="calendar_today" filled />
          </div>
          <div className="stat-body">
            <h2 className="stat-label">Today&apos;s appointments</h2>
            <p className="stat-value">{todayRows.length}</p>
          </div>
        </article>
        <article className="card stat-card">
          <div className="stat-icon stat-icon-ok">
            <Icon name="check_circle" filled />
          </div>
          <div className="stat-body">
            <h2 className="stat-label">Completed today</h2>
            <p className="stat-value">{completedToday}</p>
          </div>
        </article>
        <article className="card stat-card">
          <div className="stat-icon">
            <Icon name="schedule" filled />
          </div>
          <div className="stat-body">
            <h2 className="stat-label">Next session</h2>
            <p className="stat-value">{next ? formatTime(next.startTime) : '—'}</p>
            {next ? <p className="stat-sub">{next.patientName}</p> : null}
          </div>
        </article>
      </div>

      <section className="card agenda-card">
        <div className="agenda-toolbar">
          <h2>Agenda</h2>
          <div className="row">
            <label className="search-field search-field-compact">
              <Icon name="search" />
              <input
                className="field-input"
                placeholder="Search patients…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <input
              className="field-input date-input"
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
            <Link className="btn btn-outlined btn-sm" to="/hours">
              Edit hours <Icon name="arrow_forward" />
            </Link>
          </div>
        </div>

        {loading ? <p className="muted agenda-status">Loading agenda…</p> : null}
        {loadError ? <p className="field-error">{errorMessage(loadError)}</p> : null}
        {!loading && dayRows.length === 0 ? (
          <div className="empty">No sessions on this day.</div>
        ) : null}

        {dayRows.length > 0 ? (
          <ol className="agenda-list">
            {dayRows.map((appt) => (
              <AgendaItem
                key={appt.id}
                appt={appt}
                busy={mark.isPending || cancel.isPending}
                onStatus={(status) => mark.mutate({ id: appt.id, status })}
                onCancel={() => {
                  void ask({
                    title: 'Cancel this session?',
                    body: `${appt.patientName} · ${formatTime(appt.startTime)} – ${formatTime(appt.endTime)}. The slot will open again.`,
                    confirmLabel: 'Cancel session',
                    danger: true,
                  }).then((ok) => {
                    if (ok) cancel.mutate(appt.id)
                  })
                }}
              />
            ))}
          </ol>
        ) : null}
      </section>
      {dialog}
    </div>
  )
}

function statusLabel(status: Appointment['status']): string {
  if (status === 'NO_SHOW') return 'No-show'
  return status.charAt(0) + status.slice(1).toLowerCase()
}

function AgendaItem({
  appt,
  busy,
  onStatus,
  onCancel,
}: {
  appt: Appointment
  busy: boolean
  onStatus: (status: 'COMPLETED' | 'NO_SHOW') => void
  onCancel: () => void
}) {
  const inWindow = isInStatusWindow(appt.startTime, appt.endTime)
  const canOutcome = appt.status === 'SCHEDULED' && inWindow
  const canCancel = appt.status === 'SCHEDULED'
  return (
    <li className={appt.status === 'SCHEDULED' ? 'agenda-item is-scheduled' : 'agenda-item'}>
      <div className="agenda-time">
        <strong>{formatTime(appt.startTime)}</strong>
        <span>{formatTime(appt.endTime)}</span>
      </div>
      <div className="agenda-patient">
        <Avatar name={appt.patientName} size="sm" src={patientShowcase(appt.patientName).photoUrl} />
        <div>
          <strong>{appt.patientName}</strong>
          <p className="muted">60 min session</p>
        </div>
      </div>
      <span className={`badge badge-${appt.status.toLowerCase()}`}>{statusLabel(appt.status)}</span>
      {canOutcome || canCancel ? (
        <div className="agenda-actions">
          {canOutcome ? (
            <>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={busy}
                onClick={() => onStatus('COMPLETED')}
              >
                Completed
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outlined"
                disabled={busy}
                onClick={() => onStatus('NO_SHOW')}
              >
                No-show
              </button>
            </>
          ) : null}
          {canCancel ? (
            <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={onCancel}>
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
