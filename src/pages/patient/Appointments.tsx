import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { retryIdempotent } from '../../api/client'
import { appointmentsApi, seriesApi } from '../../api/endpoints'
import type { Appointment } from '../../api/types'
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { useConfirmDialog } from '../../components/ConfirmDialog'
import { useQueryErrorToast, useToast } from '../../components/Toast'
import { errorMessage } from '../../lib/errors'
import { clearIntent, intentKey } from '../../lib/idempotency'
import { formatLongDate, formatTime } from '../../lib/tz'
import { showcaseFor } from '../../data/demo'

type Tab = 'UPCOMING' | 'PAST'

export function AppointmentsPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('UPCOMING')
  const { ask, dialog } = useConfirmDialog()

  const list = useQuery({
    queryKey: ['appointments', 'PATIENT', tab],
    queryFn: () => appointmentsApi.mine('PATIENT', tab),
  })
  useQueryErrorToast(list.error)

  const cancelOne = useMutation({
    mutationFn: (appt: Appointment) => {
      const key = intentKey(`cancel:${appt.id}`, appt.id)
      return retryIdempotent(() => appointmentsApi.cancel(appt.id, key))
    },
    onSuccess: (_data, appt) => {
      clearIntent(`cancel:${appt.id}`)
      toast.push('Appointment cancelled')
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
    onError: (err) => toast.fromError(err),
  })

  const cancelSeries = useMutation({
    mutationFn: (seriesId: string) => {
      const key = intentKey(`series-cancel:${seriesId}`, seriesId)
      return retryIdempotent(() => seriesApi.cancel(seriesId, key))
    },
    onSuccess: (_data, seriesId) => {
      clearIntent(`series-cancel:${seriesId}`)
      toast.push('Series cancelled')
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
    onError: (err) => toast.fromError(err),
  })

  const cancelInstance = useMutation({
    mutationFn: (appt: Appointment) => {
      if (!appt.seriesId) throw new Error('Not a series instance')
      const key = intentKey(`instance-cancel:${appt.id}`, appt.id)
      return retryIdempotent(() => seriesApi.cancelInstance(appt.seriesId!, appt.id, key))
    },
    onSuccess: (_data, appt) => {
      clearIntent(`instance-cancel:${appt.id}`)
      toast.push('This occurrence was cancelled')
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
    onError: (err) => toast.fromError(err),
  })

  const rows = useMemo(() => list.data?.appointments ?? [], [list.data])
  const [featured, rest] = useMemo(() => {
    if (tab !== 'UPCOMING' || rows.length === 0) return [null, rows] as const
    return [rows[0] ?? null, rows.slice(1)] as const
  }, [rows, tab])

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1>My Appointments</h1>
          <p className="muted">Manage your upcoming therapy sessions and review past visits.</p>
        </div>
        <Link className="btn btn-primary" to="/book">
          <Icon name="add" /> Book new session
        </Link>
      </header>

      <div className="tabs" role="tablist">
        {(['UPCOMING', 'PAST'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={tab === value ? 'tab active' : 'tab'}
            onClick={() => setTab(value)}
          >
            {value === 'UPCOMING' ? 'Upcoming' : 'Past'}
          </button>
        ))}
      </div>

      {list.isPending ? <p className="muted">Loading appointments…</p> : null}
      {list.isError ? (
        <p className="field-error" role="alert">
          {errorMessage(list.error)}
        </p>
      ) : null}
      {list.isSuccess && rows.length === 0 ? (
        <div className="empty card">No {tab === 'UPCOMING' ? 'upcoming' : 'past'} appointments.</div>
      ) : null}

      {featured ? (
        <AppointmentCard
          appt={featured}
          featured
          busy={cancelOne.isPending || cancelSeries.isPending || cancelInstance.isPending}
          onCancel={() => {
            void ask({
              title: 'Cancel this appointment?',
              body: `${featured.therapistName} · ${formatLongDate(featured.startTime)} at ${formatTime(featured.startTime)}. The slot will open for others.`,
              confirmLabel: 'Cancel appointment',
              danger: true,
            }).then((ok) => {
              if (ok) cancelOne.mutate(featured)
            })
          }}
          onCancelSeries={
            featured.seriesId
              ? () => {
                  void ask({
                    title: 'Cancel the whole series?',
                    body: 'Future scheduled sessions in this series will be cancelled. Past visits stay in history.',
                    confirmLabel: 'Cancel series',
                    danger: true,
                  }).then((ok) => {
                    if (ok && featured.seriesId) cancelSeries.mutate(featured.seriesId)
                  })
                }
              : undefined
          }
          onCancelInstance={
            featured.seriesId
              ? () => {
                  void ask({
                    title: 'Cancel this occurrence?',
                    body: 'Only this date is cancelled. The rest of the series stays booked.',
                    confirmLabel: 'Cancel this date',
                    danger: true,
                  }).then((ok) => {
                    if (ok) cancelInstance.mutate(featured)
                  })
                }
              : undefined
          }
        />
      ) : null}

      <div className="grid grid-2">
        {rest.map((appt) => (
          <AppointmentCard
            key={appt.id}
            appt={appt}
            busy={cancelOne.isPending || cancelSeries.isPending || cancelInstance.isPending}
            onCancel={() => {
              void ask({
                title: 'Cancel this appointment?',
                body: `${appt.therapistName} · ${formatLongDate(appt.startTime)} at ${formatTime(appt.startTime)}. The slot will open for others.`,
                confirmLabel: 'Cancel appointment',
                danger: true,
              }).then((ok) => {
                if (ok) cancelOne.mutate(appt)
              })
            }}
            onCancelSeries={
              appt.seriesId
                ? () => {
                    void ask({
                      title: 'Cancel the whole series?',
                      body: 'Future scheduled sessions in this series will be cancelled. Past visits stay in history.',
                      confirmLabel: 'Cancel series',
                      danger: true,
                    }).then((ok) => {
                      if (ok && appt.seriesId) cancelSeries.mutate(appt.seriesId)
                    })
                  }
                : undefined
            }
            onCancelInstance={
              appt.seriesId
                ? () => {
                    void ask({
                      title: 'Cancel this occurrence?',
                      body: 'Only this date is cancelled. The rest of the series stays booked.',
                      confirmLabel: 'Cancel this date',
                      danger: true,
                    }).then((ok) => {
                      if (ok) cancelInstance.mutate(appt)
                    })
                  }
                : undefined
            }
          />
        ))}
      </div>
      {dialog}
    </div>
  )
}

function AppointmentCard({
  appt,
  featured,
  busy,
  onCancel,
  onCancelSeries,
  onCancelInstance,
}: {
  appt: Appointment
  featured?: boolean
  busy: boolean
  onCancel: () => void
  onCancelSeries?: () => void
  onCancelInstance?: () => void
}) {
  const cancellable = appt.status === 'SCHEDULED'
  return (
    <article className={featured ? 'card appt-card appt-featured' : 'card appt-card'}>
      <div className="appt-main">
        <Avatar
          name={appt.therapistName}
          src={showcaseFor({
            id: appt.therapistId,
            displayName: appt.therapistName,
            specialization: null,
          }).photoUrl}
        />
        <div>
          <div className="row">
            <h2>{appt.therapistName}</h2>
            <span className={`badge badge-${appt.status.toLowerCase()}`}>{appt.status}</span>
          </div>
          <div className="appt-meta">
            <span>
              <Icon name="calendar_month" /> {formatLongDate(appt.startTime)}
            </span>
            <span>
              <Icon name="schedule" /> {formatTime(appt.startTime)} – {formatTime(appt.endTime)}
            </span>
            {appt.seriesId ? (
              <span>
                <Icon name="autorenew" /> Recurring
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {cancellable ? (
        <div className="row">
          {onCancelInstance ? (
            <button type="button" className="btn btn-outlined btn-sm" disabled={busy} onClick={onCancelInstance}>
              Cancel instance
            </button>
          ) : (
            <button type="button" className="btn btn-outlined btn-sm" disabled={busy} onClick={onCancel}>
              Cancel
            </button>
          )}
          {onCancelSeries ? (
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={onCancelSeries}>
              Cancel series
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
