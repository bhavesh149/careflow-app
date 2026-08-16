export const APP_TZ = 'Asia/Kolkata'

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: APP_TZ,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const timeFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: APP_TZ,
  hour: 'numeric',
  minute: '2-digit',
})

const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: APP_TZ,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso))
}

/** Calendar date YYYY-MM-DD in Asia/Kolkata. */
export function kolkataDate(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const utc = Date.UTC(y, m - 1, d + days)
  return new Date(utc).toISOString().slice(0, 10)
}

const shortDowFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: APP_TZ,
  weekday: 'short',
})

export function upcomingDays(count: number, from = kolkataDate()): { date: string; dow: string; day: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(from, i)
    return {
      date,
      dow: shortDowFmt.format(new Date(`${date}T12:00:00+05:30`)),
      day: Number(date.slice(-2)),
    }
  })
}

export function groupKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

export function isInStatusWindow(startIso: string, endIso: string, graceHours = 24): boolean {
  const now = Date.now()
  return now >= Date.parse(startIso) && now <= Date.parse(endIso) + graceHours * 3_600_000
}

const longDateFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: APP_TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const monthYearFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: APP_TZ,
  month: 'long',
  year: 'numeric',
})

export function formatLongDate(iso: string): string {
  return longDateFmt.format(new Date(iso))
}

export function formatMonthYear(year: number, monthIndex0: number): string {
  return monthYearFmt.format(new Date(Date.UTC(year, monthIndex0, 15)))
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function isoWeekday(isoDate: string): number {
  const utcDay = new Date(`${isoDate}T12:00:00+05:30`).getUTCDay()
  return utcDay === 0 ? 7 : utcDay
}

export function mondayOf(isoDate: string): string {
  return addDays(isoDate, 1 - isoWeekday(isoDate))
}

export function parseYearMonth(isoDate: string): { year: number; monthIndex0: number } {
  const [y, m] = isoDate.split('-').map(Number)
  return { year: y, monthIndex0: m - 1 }
}

export function toIsoDate(year: number, monthIndex0: number, day: number): string {
  return `${year}-${pad2(monthIndex0 + 1)}-${pad2(day)}`
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate()
}

export type CalendarCell = {
  date: string
  inMonth: boolean
}

export function monthCells(year: number, monthIndex0: number): CalendarCell[] {
  const first = toIsoDate(year, monthIndex0, 1)
  const leading = isoWeekday(first) - 1
  const count = daysInMonth(year, monthIndex0)
  const cells: CalendarCell[] = []
  for (let i = 0; i < leading; i++) {
    cells.push({ date: addDays(first, i - leading), inMonth: false })
  }
  for (let d = 1; d <= count; d++) {
    cells.push({ date: toIsoDate(year, monthIndex0, d), inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]
    if (!last) break
    cells.push({ date: addDays(last.date, 1), inMonth: false })
  }
  return cells
}

export function shiftMonth(year: number, monthIndex0: number, delta: number): {
  year: number
  monthIndex0: number
} {
  const d = new Date(Date.UTC(year, monthIndex0 + delta, 1))
  return { year: d.getUTCFullYear(), monthIndex0: d.getUTCMonth() }
}

export const WEEKDAYS = [
  { iso: 1, label: 'Monday' },
  { iso: 2, label: 'Tuesday' },
  { iso: 3, label: 'Wednesday' },
  { iso: 4, label: 'Thursday' },
  { iso: 5, label: 'Friday' },
  { iso: 6, label: 'Saturday' },
  { iso: 7, label: 'Sunday' },
] as const
