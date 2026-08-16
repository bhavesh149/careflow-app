import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { retryIdempotent } from '../../api/client'
import { appointmentsApi } from '../../api/endpoints'
import type { Appointment } from '../../api/types'
import { useSession } from '../../auth/session'
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
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
        <div className="topbar-user">
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
          <>
            <div className="table-wrap agenda-desktop">
            <table className="agenda">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dayRows.map((appt) => (
                  <AgendaRow
                    key={appt.id}
                    appt={appt}
                    busy={mark.isPending || cancel.isPending}
                    onStatus={(status) => mark.mutate({ id: appt.id, status })}
                    onCancel={() => cancel.mutate(appt.id)}
                  />
                ))}
              </tbody>
            </table>
            </div>
            <ol className="timeline agenda-mobile">
              {dayRows.map((appt) => (
                <li key={appt.id} className={appt.status === 'SCHEDULED' ? 'timeline-item current' : 'timeline-item'}>
                  <div className="timeline-time">{formatTime(appt.startTime)}</div>
                  <article className="timeline-card">
                    <div className="row">
                      <Avatar name={appt.patientName} size="sm" src={patientShowcase(appt.patientName).photoUrl} />
                      <div>
                        <strong>{appt.patientName}</strong>
                        <p className="muted">60 min session</p>
                      </div>
                      <span className={`badge badge-${appt.status.toLowerCase()}`}>{appt.status}</span>
                    </div>
                    {appt.status === 'SCHEDULED' ? (
                      <div className="row timeline-actions">
                        {isInStatusWindow(appt.startTime, appt.endTime) ? (
                          <>
                            <button type="button" className="btn btn-sm btn-primary" disabled={mark.isPending} onClick={() => mark.mutate({ id: appt.id, status: 'COMPLETED' })}>
                              Completed
                            </button>
                            <button type="button" className="btn btn-sm btn-outlined" disabled={mark.isPending} onClick={() => mark.mutate({ id: appt.id, status: 'NO_SHOW' })}>
                              No-show
                            </button>
                          </>
                        ) : null}
                        <button type="button" className="btn btn-sm btn-danger" disabled={cancel.isPending} onClick={() => cancel.mutate(appt.id)}>
                          Cancel
                        </button>
                      </div>
                    ) : null}
                  </article>
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </section>
    </div>
  )
}

function AgendaRow({
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
    <tr>
      <td>
        {formatTime(appt.startTime)} – {formatTime(appt.endTime)}
      </td>
      <td>
        <div className="row">
          <Avatar name={appt.patientName} size="sm" src={patientShowcase(appt.patientName).photoUrl} />
          {appt.patientName}
        </div>
      </td>
      <td>
        <span className={`badge badge-${appt.status.toLowerCase()}`}>{appt.status}</span>
      </td>
      <td>
        <div className="row">
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
      </td>
    </tr>
  )
}
