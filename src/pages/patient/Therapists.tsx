import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { therapistsApi } from '../../api/endpoints'
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { sessionsLabel, showcaseFor } from '../../data/therapistShowcase'
import { errorMessage } from '../../lib/errors'

export function TherapistsPage() {
  const [q, setQ] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [specialty, setSpecialty] = useState<string | null>(null)

  const list = useQuery({
    queryKey: ['therapists'],
    queryFn: () => therapistsApi.list(0),
  })

  const enriched = useMemo(() => {
    return (list.data?.therapists ?? []).map((t) => ({ therapist: t, showcase: showcaseFor(t) }))
  }, [list.data])

  const specialties = useMemo(() => {
    const tags = new Set<string>()
    for (const row of enriched) {
      for (const tag of row.showcase.tags) tags.add(tag)
    }
    return [...tags].sort()
  }, [enriched])

  const therapists = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return enriched.filter(({ therapist, showcase }) => {
      if (availableOnly && !showcase.availableToday) return false
      if (specialty && !showcase.tags.includes(specialty)) return false
      if (!needle) return true
      const hay = `${therapist.displayName} ${showcase.title} ${showcase.tags.join(' ')}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [enriched, q, availableOnly, specialty])

  return (
    <div className="stack">
      <header className="page-header page-header-stack">
        <div>
          <h1>Find Your Therapist</h1>
          <p className="muted">
            Browse our network of trusted professionals and find the perfect match for your care
            routine.
          </p>
        </div>
      </header>

      <div className="filter-bar">
        <label className="search-field">
          <Icon name="search" />
          <input
            className="field-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, specialty, or condition..."
            type="search"
          />
        </label>
        <button
          type="button"
          className={availableOnly ? 'filter-chip active' : 'filter-chip'}
          onClick={() => setAvailableOnly((v) => !v)}
        >
          <Icon name="schedule" />
          Availability
        </button>
        <label className="filter-chip filter-chip-select">
          <Icon name="psychology" />
          <select
            value={specialty ?? ''}
            onChange={(e) => setSpecialty(e.target.value.length > 0 ? e.target.value : null)}
            aria-label="Specialty"
          >
            <option value="">Specialty</option>
            {specialties.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.isPending ? <p className="muted">Loading therapists…</p> : null}
      {list.isError ? (
        <p className="field-error" role="alert">
          {errorMessage(list.error)}
        </p>
      ) : null}

      {list.isSuccess && therapists.length === 0 ? (
        <div className="empty card">No therapists match that search.</div>
      ) : null}

      <div className="grid grid-3 therapist-grid">
        {therapists.map(({ therapist: t, showcase }) => (
          <article key={t.id} className="card therapist-card">
            <div className="therapist-card-head">
              <Avatar name={t.displayName} size="lg" src={showcase.photoUrl} />
              <div className="therapist-card-copy">
                <div className="therapist-card-title-row">
                  <h2>{t.displayName}</h2>
                  {showcase.availableToday ? (
                    <span className="chip-today">Available Today</span>
                  ) : null}
                </div>
                <p className="therapist-card-role">{showcase.title}</p>
                <p className="therapist-card-rating">
                  <Icon name="star" filled className="star-icon" />
                  <span>
                    {showcase.rating.toFixed(1)}{' '}
                    <span className="muted">({sessionsLabel(showcase.sessions)})</span>
                  </span>
                </p>
              </div>
            </div>
            <div className="tag-row">
              {showcase.tags.map((tag) => (
                <span key={tag} className="chip-tag">
                  {tag}
                </span>
              ))}
            </div>
            <div className="therapist-card-foot">
              <div className="therapist-next">
                <span className="muted">Next available</span>
                <strong>{showcase.nextAvailable}</strong>
              </div>
              <Link className="btn btn-primary" to={`/book/${t.id}`}>
                <Icon name="calendar_today" />
                View Availability
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
