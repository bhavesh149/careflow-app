import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { therapistsApi } from '../../api/endpoints'
import type { ScheduleRule } from '../../api/types'
import { Icon } from '../../components/Icon'
import { useQueryErrorToast, useToast } from '../../components/Toast'
import { errorMessage } from '../../lib/errors'
import { WEEKDAYS, kolkataDate } from '../../lib/tz'

type DraftRule = { dayOfWeek: number; startTime: string; endTime: string }

function toDraft(rules: ScheduleRule[]): DraftRule[] {
  return rules.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime.slice(0, 5),
    endTime: r.endTime.slice(0, 5),
  }))
}

function formatClock(value: string) {
  const [h, m] = value.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return value
  const date = new Date()
  date.setHours(h, m, 0, 0)
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function SchedulePage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const schedule = useQuery({
    queryKey: ['schedule'],
    queryFn: () => therapistsApi.getSchedule(),
  })
  useQueryErrorToast(schedule.error)
  const [draft, setDraft] = useState<DraftRule[] | null>(null)
  const [effectiveFrom, setEffectiveFrom] = useState(kolkataDate())
  const rules = draft ?? (schedule.data ? toDraft(schedule.data.rules) : [])
  const dirty = draft !== null

  const save = useMutation({
    mutationFn: () =>
      therapistsApi.putSchedule({
        rules: rules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime.slice(0, 5),
          endTime: r.endTime.slice(0, 5),
        })),
        effectiveFrom,
      }),
    onSuccess: () => {
      toast.push('Schedule saved. Existing appointments are unchanged.')
      setDraft(null)
      void queryClient.invalidateQueries({ queryKey: ['schedule'] })
    },
    onError: (err) => toast.fromError(err),
  })

  function mutateRules(updater: (prev: DraftRule[]) => DraftRule[]) {
    setDraft((prev) => updater(prev ?? (schedule.data ? toDraft(schedule.data.rules) : [])))
  }

  function addRange(dayOfWeek: number) {
    mutateRules((prev) => [...prev, { dayOfWeek, startTime: '09:00', endTime: '17:00' }])
  }

  function update(index: number, patch: Partial<DraftRule>) {
    mutateRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function remove(index: number) {
    mutateRules((prev) => prev.filter((_, i) => i !== index))
  }

  const openDays = WEEKDAYS.filter((day) => rules.some((rule) => rule.dayOfWeek === day.iso)).length

  return (
    <div className="stack stack-lg">
      <header className="page-header page-header-stack">
        <div>
          <p className="eyebrow">Practice hours</p>
          <h1>Weekly schedule</h1>
          <p className="muted">
            Patients can book 60-minute slots inside these windows. Saving replaces the weekly
            pattern going forward — existing appointments stay as they are.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary schedule-save"
          disabled={save.isPending || schedule.isPending}
          onClick={() => save.mutate()}
        >
          <Icon name="save" />
          {save.isPending ? 'Saving…' : 'Save schedule'}
        </button>
      </header>

      {schedule.isPending ? <p className="muted">Loading schedule…</p> : null}
      {schedule.isError ? <p className="field-error">{errorMessage(schedule.error)}</p> : null}

      <div className="schedule-toolbar card">
        <label className="field schedule-date">
          <span className="field-label">Effective from</span>
          <input
            className="field-input"
            type="date"
            min={kolkataDate()}
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </label>
        <div className="schedule-summary">
          <span className="chip-today">
            {openDays} {openDays === 1 ? 'day' : 'days'} open
          </span>
          {dirty ? <span className="chip-alert">Unsaved changes</span> : <span className="muted">All changes saved</span>}
        </div>
      </div>

      <div className="schedule-week">
        {WEEKDAYS.map((day) => {
          const dayRules = rules
            .map((rule, index) => ({ rule, index }))
            .filter((x) => x.rule.dayOfWeek === day.iso)
          const off = dayRules.length === 0
          return (
            <section key={day.iso} className={off ? 'card schedule-day is-off' : 'card schedule-day'}>
              <header className="schedule-day-head">
                <div>
                  <h2>{day.label}</h2>
                  <p className="muted">{off ? 'Not working' : `${dayRules.length} time ${dayRules.length === 1 ? 'window' : 'windows'}`}</p>
                </div>
                <span className={off ? 'badge badge-cancelled' : 'badge badge-completed'}>
                  {off ? 'Off' : 'Open'}
                </span>
              </header>

              {off ? (
                <p className="schedule-empty">No booking windows on this day.</p>
              ) : (
                <ul className="schedule-ranges">
                  {dayRules.map(({ rule, index }) => (
                    <li key={`${day.iso}-${index}`} className="schedule-range">
                      <div className="schedule-range-times">
                        <label>
                          <span className="field-label">Starts</span>
                          <input
                            className="field-input"
                            type="time"
                            value={rule.startTime}
                            onChange={(e) => update(index, { startTime: e.target.value })}
                          />
                        </label>
                        <span className="schedule-range-to" aria-hidden>
                          to
                        </span>
                        <label>
                          <span className="field-label">Ends</span>
                          <input
                            className="field-input"
                            type="time"
                            value={rule.endTime}
                            onChange={(e) => update(index, { endTime: e.target.value })}
                          />
                        </label>
                      </div>
                      <div className="schedule-range-meta">
                        <span className="muted">
                          {formatClock(rule.startTime)} – {formatClock(rule.endTime)}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => remove(index)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <button type="button" className="btn btn-sm btn-outlined schedule-add" onClick={() => addRange(day.iso)}>
                <Icon name="add" /> {off ? 'Add hours' : 'Add another range'}
              </button>
            </section>
          )
        })}
      </div>
    </div>
  )
}
