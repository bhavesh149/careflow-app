import { useState } from 'react'
import { useSession } from '../auth/session'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { LogoutButton } from '../components/LogoutButton'
import { patientShowcase, profilePhoto, showcaseFor } from '../data/demo'

type Section = 'personal' | 'health' | 'insurance' | 'settings'

export function ProfilePage() {
  const { user } = useSession()
  const [section, setSection] = useState<Section>('personal')
  if (!user) return null

  const photo = profilePhoto(user)
  const isTherapist = user.role === 'THERAPIST'
  const patient = isTherapist ? null : patientShowcase(user.fullName)
  const therapist = isTherapist
    ? showcaseFor({ id: user.therapistId ?? user.id, displayName: user.fullName, specialization: null })
    : null

  return (
    <div className="profile-layout page-fade-inner">
      <header className="page-header page-header-stack">
        <div>
          <h1>{isTherapist ? 'Clinician profile' : 'Patient Profile'}</h1>
          <p className="muted">Manage your personal information, health records, and settings.</p>
        </div>
      </header>

      <div className="profile-grid">
        <aside className="stack">
          <article className="card profile-card">
            <Avatar name={user.fullName} size="xl" src={photo} />
            <h2>{user.fullName}</h2>
            <p className="chip-today">
              {isTherapist ? therapist?.title : `ID: ${patient?.memberId}`}
            </p>
            <LogoutButton className="btn btn-outlined profile-logout" />
          </article>
          <nav className="card profile-nav">
            {(
              [
                ['personal', 'person', 'Personal Information'],
                ['health', 'monitor_heart', isTherapist ? 'Practice focus' : 'Health Profile'],
                ['insurance', 'security', isTherapist ? 'Clinic details' : 'Insurance & Billing'],
                ['settings', 'settings', 'Settings'],
              ] as const
            ).map(([id, icon, label]) => (
              <button
                key={id}
                type="button"
                className={section === id ? 'profile-nav-link active' : 'profile-nav-link'}
                onClick={() => setSection(id)}
              >
                <Icon name={icon} filled={section === id} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="stack">
          {section === 'personal' ? (
            <section className="card profile-section">
              <h3>
                <Icon name="badge" /> Personal Information
              </h3>
              <dl className="profile-dl">
                <div>
                  <dt>Email Address</dt>
                  <dd>{user.email}</dd>
                </div>
                <div>
                  <dt>Phone Number</dt>
                  <dd>
                    {patient?.phone ?? '+91 98765 00000'}{' '}
                    <span className="badge badge-completed">Verified</span>
                  </dd>
                </div>
                <div>
                  <dt>{isTherapist ? 'Role' : 'Date of Birth'}</dt>
                  <dd>{isTherapist ? 'Therapist' : patient?.dob}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          {section === 'health' ? (
            <section className="card profile-section">
              <h3>
                <Icon name="monitor_heart" /> {isTherapist ? 'Practice focus' : 'Health Profile'}
              </h3>
              {isTherapist && therapist ? (
                <div className="tag-row">
                  {therapist.tags.map((tag) => (
                    <span key={tag} className="chip-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="profile-health">
                  <article className="glass">
                    <h4>
                      <Icon name="warning" /> Known Allergies
                    </h4>
                    <div className="tag-row">
                      {(patient?.allergies.length ? patient.allergies : ['None recorded']).map((item) => (
                        <span key={item} className="chip-alert">
                          {item}
                        </span>
                      ))}
                    </div>
                  </article>
                  <article className="glass">
                    <h4>
                      <Icon name="psychology" /> Current Focus
                    </h4>
                    <div className="tag-row">
                      {patient?.focus.map((item) => (
                        <span key={item} className="chip-tag">
                          {item}
                        </span>
                      ))}
                    </div>
                  </article>
                </div>
              )}
            </section>
          ) : null}

          {section === 'insurance' ? (
            <section className="card profile-section">
              <h3>
                <Icon name="security" /> {isTherapist ? 'Clinic details' : 'Insurance & Billing'}
              </h3>
              {isTherapist && therapist ? (
                <ul className="meta-list">
                  <li>
                    <Icon name="schedule" /> 60-minute sessions
                  </li>
                  <li>
                    <Icon name="public" /> {therapist.mode}
                  </li>
                  <li>
                    <Icon name="star" filled /> {therapist.rating.toFixed(1)} ({therapist.sessions}+ sessions)
                  </li>
                </ul>
              ) : (
                <div className="insurance-card">
                  <p className="muted">Primary Insurance</p>
                  <h2>{patient?.insurancePlan}</h2>
                  <p>Member ID: {patient?.insuranceMemberId}</p>
                  <p className="muted">Active through {patient?.insuranceUntil}</p>
                </div>
              )}
            </section>
          ) : null}

          {section === 'settings' ? (
            <section className="card profile-section">
              <h3>
                <Icon name="settings" /> Settings
              </h3>
              <p className="muted">Access token stays in memory. Refresh uses the httpOnly cookie.</p>
              <LogoutButton className="btn btn-danger" />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
