import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, retryIdempotent } from '../../api/client'
import { appointmentsApi, holdsApi, seriesApi, therapistsApi } from '../../api/endpoints'
import { showcaseFor } from '../../data/therapistShowcase'
import type { Frequency, Hold } from '../../api/types'
import { Avatar } from '../../components/Avatar'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Icon } from '../../components/Icon'
import { SelectModal } from '../../components/SelectModal'
import { useQueryErrorToast, useToast } from '../../components/Toast'
import { useCountdown } from '../../hooks/useCountdown'
import { formatCountdown, remainingMsFactory } from '../../lib/clock'
import { conflictLabel, errorMessage, recurringConflicts } from '../../lib/errors'
import { clearIntent, intentKey } from '../../lib/idempotency'
import {
  addDays,
  formatDateTime,
  formatLongDate,
  formatMonthYear,
  formatTime,
  groupKey,
  kolkataDate,
  mondayOf,
  monthCells,
  parseYearMonth,
  shiftMonth,
  upcomingDays,
} from '../../lib/tz'

const FREQ_OPTIONS: { value: 'ONCE' | Frequency; label: string }[] = [
  { value: 'ONCE', label: 'One-time session' },
  { value: 'WEEKLY', label: 'Weekly (recurring)' },
  { value: 'BIWEEKLY', label: 'Bi-weekly (recurring)' },
  { value: 'DAILY', label: 'Daily (recurring)' },
  { value: 'MONTHLY', label: 'Monthly (recurring)' },
]

export function BookPage() {
  const { therapistId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const today = kolkataDate()
  const initial = parseYearMonth(today)
  const [year, setYear] = useState(initial.year)
  const [monthIndex0, setMonthIndex0] = useState(initial.monthIndex0)
  const [selectedDate, setSelectedDate] = useState(today)
  const [hold, setHold] = useState<Hold | null>(null)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [bookingType, setBookingType] = useState<'ONCE' | Frequency>('ONCE')
  const [occurrences, setOccurrences] = useState(8)
  const [confirming, setConfirming] = useState(false)
  const [holding, setHolding] = useState(false)
  const [askConfirm, setAskConfirm] = useState(false)
  const remaining = useCountdown(hold)
  const activeHold = hold && remaining > 0 ? hold : null
  const expired = Boolean(hold) && remaining <= 0
  const expiryToast = useRef(false)

  const directory = useQuery({
    queryKey: ['therapists'],
    queryFn: () => therapistsApi.list(0),
  })
  const therapist = directory.data?.therapists.find((t) => t.id === therapistId)
  const showcase = therapist ? showcaseFor(therapist) : null

  const weekFrom = mondayOf(selectedDate)
  const weekTo = addDays(weekFrom, 6)
  const availability = useQuery({
    queryKey: ['availability', therapistId, weekFrom, weekTo],
    queryFn: () => therapistsApi.availability(therapistId, weekFrom, weekTo),
    enabled: therapistId.length > 0,
  })

  useQuery({
    queryKey: ['holds'],
    queryFn: async () => {
      const data = await holdsApi.active()
      const mine = data.holds.find((h) => h.therapistId === therapistId)
      if (mine && remainingMsFactory(mine.expiresAt, mine.serverTime)() > 0) {
        setHold(mine)
      }
      return data
    },
    enabled: therapistId.length > 0,
  })

  useQueryErrorToast(directory.error)
  useQueryErrorToast(availability.error)

  useEffect(() => {
    if (!hold) {
      expiryToast.current = false
      return
    }
    if (remaining > 0) return
    if (expiryToast.current) return
    expiryToast.current = true
    toast.push('Your hold expired. The slot was released — pick it again to book.', 'warn')
    setHold(null)
    setAskConfirm(false)
    void availability.refetch()
  }, [hold, remaining, toast, availability.refetch])

  const slotsForDay = useMemo(
    () => (availability.data?.slots ?? []).filter((s) => groupKey(s.startTime) === selectedDate),
    [availability.data, selectedDate],
  )
  const datesWithSlots = useMemo(() => {
    const set = new Set<string>()
    for (const s of availability.data?.slots ?? []) set.add(groupKey(s.startTime))
    return set
  }, [availability.data])

  async function pickSlot(startTime: string) {
    if (holding) return
    setHolding(true)
    try {
      if (hold) {
        await holdsApi.release(hold.id).catch(() => undefined)
        setHold(null)
      }
      const next = await holdsApi.create(therapistId, startTime)
      setHold(next)
      void queryClient.invalidateQueries({ queryKey: ['holds'] })
      toast.push(`Slot held for ${formatTime(next.startTime)}. Confirm within 60 seconds.`, 'ok')
    } catch (err) {
      toast.fromError(err)
      if (err instanceof ApiError && (err.code === 'SLOT_ALREADY_HELD' || err.code === 'SLOT_NOT_AVAILABLE')) {
        setBusy((prev) => new Set(prev).add(startTime))
        void availability.refetch()
      }
    } finally {
      setHolding(false)
    }
  }

  async function releaseHold() {
    if (!activeHold) return
    try {
      await holdsApi.release(activeHold.id)
      setHold(null)
      toast.push('Slot released. You can pick another time.', 'ok')
      void queryClient.invalidateQueries({ queryKey: ['holds'] })
      void availability.refetch()
    } catch (err) {
      toast.fromError(err)
    }
  }

  async function confirm() {
    if (!activeHold) {
      toast.push('Your hold expired. Select the slot again to book.', 'warn')
      setAskConfirm(false)
      return
    }
    setConfirming(true)
    try {
      if (bookingType === 'ONCE') {
        const key = intentKey(`confirm:${activeHold.id}`, activeHold.id)
        await retryIdempotent(() => appointmentsApi.confirm(activeHold.id, key))
        clearIntent(`confirm:${activeHold.id}`)
        toast.push('Appointment confirmed')
      } else {
        const startTime = activeHold.startTime
        await holdsApi.release(activeHold.id).catch(() => undefined)
        const fingerprint = `${therapistId}:${startTime}:${bookingType}:${occurrences}`
        const key = intentKey(`series:${fingerprint}`, fingerprint)
        const series = await retryIdempotent(() =>
          seriesApi.create(
            { therapistId, startTime, frequency: bookingType, occurrences },
            key,
          ),
        )
        clearIntent(`series:${fingerprint}`)
        const extra = series.truncated
          ? ` Booked ${series.appointments.length} sessions (${series.truncationReason ?? 'horizon cap'}).`
          : ''
        toast.push(`Series booked.${extra}`)
      }
      setAskConfirm(false)
      setHold(null)
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
      navigate('/appointments')
    } catch (err) {
      const conflicts = recurringConflicts(err)
      if (conflicts.length > 0) {
        toast.push(
          `Nothing was booked. Conflicts: ${conflicts
            .map((c) => `${formatDateTime(c.startTime)} (${conflictLabel(c.reason)})`)
            .join('; ')}`,
          'warn',
        )
      } else {
        toast.fromError(err)
      }
      if (err instanceof ApiError && err.code === 'HOLD_EXPIRED') {
        setAskConfirm(false)
        setHold(null)
        void availability.refetch()
      }
    } finally {
      setConfirming(false)
    }
  }

  const cells = monthCells(year, monthIndex0)
  const strip = upcomingDays(14)

  return (
    <div className="book-layout">
      <aside className="card therapist-summary">
        <Link to="/book" className="back-link">
          <Icon name="arrow_back" /> All therapists
        </Link>
        {therapist && showcase ? (
          <div className="therapist-summary-body">
            <Avatar name={therapist.displayName} size="lg" src={showcase.photoUrl} />
            <div className="therapist-summary-copy">
              <h1>{therapist.displayName}</h1>
              <p className="muted">{showcase.title}</p>
              <p className="therapist-card-rating">
                <Icon name="star" filled className="star-icon" />
                <span>
                  {showcase.rating.toFixed(1)}{' '}
                  <span className="muted">({showcase.sessions}+ sessions)</span>
                </span>
              </p>
            </div>
            <div className="tag-row therapist-summary-tags">
              {showcase.tags.map((tag) => (
                <span key={tag} className="chip-tag">
                  {tag}
                </span>
              ))}
            </div>
            <ul className="meta-list">
              <li>
                <Icon name="schedule" /> 60-minute sessions
              </li>
              <li>
                <Icon name="videocam" /> {showcase.mode}
              </li>
              <li>
                <Icon name="event_available" /> Next: {showcase.nextAvailable}
              </li>
            </ul>
          </div>
        ) : directory.isPending ? (
          <p className="muted">Loading…</p>
        ) : (
          <p className="field-error">Therapist not found.</p>
        )}
      </aside>

      <section className="card glass book-panel">
        <h2>Select a Date &amp; Time</h2>
        <div className="book-grid">
          <div>
            <div className="date-strip" aria-label="Select date">
              {strip.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  className={d.date === selectedDate ? 'date-chip selected' : 'date-chip'}
                  onClick={() => setSelectedDate(d.date)}
                >
                  <span>{d.dow}</span>
                  <strong>{d.day}</strong>
                </button>
              ))}
            </div>
            <div className="cal-desktop">
            <div className="cal-nav">
              <button
                type="button"
                className="icon-btn"
                aria-label="Previous month"
                onClick={() => {
                  const next = shiftMonth(year, monthIndex0, -1)
                  setYear(next.year)
                  setMonthIndex0(next.monthIndex0)
                }}
              >
                <Icon name="chevron_left" />
              </button>
              <strong>{formatMonthYear(year, monthIndex0)}</strong>
              <button
                type="button"
                className="icon-btn"
                aria-label="Next month"
                onClick={() => {
                  const next = shiftMonth(year, monthIndex0, 1)
                  setYear(next.year)
                  setMonthIndex0(next.monthIndex0)
                }}
              >
                <Icon name="chevron_right" />
              </button>
            </div>
            <div className="cal-weekdays">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="cal-grid">
              {cells.map((cell) => {
                const selected = cell.date === selectedDate
                const isToday = cell.date === today
                const hasSlots = datesWithSlots.has(cell.date)
                const past = cell.date < today
                return (
                  <button
                    key={cell.date}
                    type="button"
                    disabled={past}
                    className={[
                      'cal-day',
                      cell.inMonth ? '' : 'cal-muted',
                      selected ? 'cal-selected' : '',
                      isToday ? 'cal-today' : '',
                      hasSlots ? 'cal-has-slots' : '',
                    ].join(' ')}
                    onClick={() => setSelectedDate(cell.date)}
                  >
                    {Number(cell.date.slice(-2))}
                  </button>
                )
              })}
            </div>
            </div>
          </div>

          <div className="slot-pane">
            <div className="slot-heading">
              <h3>Available Slots</h3>
              <p className="muted cal-caption">{formatLongDate(`${selectedDate}T12:00:00+05:30`)}</p>
            </div>
            {availability.isPending ? <p className="muted">Loading slots…</p> : null}
            {availability.isError ? (
              <p className="field-error">{errorMessage(availability.error)}</p>
            ) : null}
            {availability.isSuccess && slotsForDay.length === 0 ? (
              <p className="muted">No open slots this day. Try another date.</p>
            ) : null}
            <div className="slot-grid">
              {slotsForDay.map((slot) => {
                const selected = activeHold?.startTime === slot.startTime
                const taken = busy.has(slot.startTime)
                return (
                  <button
                    key={slot.startTime}
                    type="button"
                    className={selected ? 'slot slot-selected' : 'slot'}
                    disabled={taken || holding}
                    onClick={() => void pickSlot(slot.startTime)}
                  >
                    {formatTime(slot.startTime)}
                  </button>
                )
              })}
            </div>

            {expired ? (
              <p className="field-error" role="status">
                Slot released — pick again.
              </p>
            ) : null}
            {activeHold ? (
              <div className="hold-box">
                <div className="hold-head">
                  <div className="hold-copy">
                    <p className="hold-kicker">Slot held</p>
                    <strong>{formatTime(activeHold.startTime)}</strong>
                  </div>
                  <span className="hold-timer" aria-live="polite">
                    <Icon name="schedule" />
                    {formatCountdown(remaining)}
                  </span>
                </div>
                <SelectModal
                  label="Booking type"
                  title="Booking type"
                  value={bookingType}
                  options={FREQ_OPTIONS}
                  onChange={setBookingType}
                />
                {bookingType !== 'ONCE' ? (
                  <label className="field">
                    <span className="field-label">Occurrences (max 26)</span>
                    <input
                      className="field-input"
                      type="number"
                      min={2}
                      max={26}
                      value={occurrences}
                      onChange={(e) => setOccurrences(Number(e.target.value))}
                    />
                  </label>
                ) : null}
                <div className="hold-actions">
                  <button type="button" className="btn btn-outlined" onClick={() => void releaseHold()}>
                    Release
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={confirming || remaining <= 0}
                    onClick={() => setAskConfirm(true)}
                  >
                    <Icon name="check_circle" filled />
                    {confirming ? 'Confirming…' : 'Confirm'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
      <ConfirmDialog
        open={askConfirm}
        title="Confirm this appointment?"
        body={
          activeHold
            ? `${therapist?.displayName ?? 'Therapist'} · ${formatLongDate(activeHold.startTime)} at ${formatTime(activeHold.startTime)}. The slot is held for ${formatCountdown(remaining)}.`
            : 'Hold this slot, then confirm.'
        }
        confirmLabel={bookingType === 'ONCE' ? 'Book session' : `Book ${occurrences} sessions`}
        busy={confirming}
        onClose={() => {
          if (!confirming) setAskConfirm(false)
        }}
        onConfirm={() => void confirm()}
      />
    </div>
  )
}
