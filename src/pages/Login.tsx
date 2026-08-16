import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { homeFor } from '../auth/paths'
import { useSession } from '../auth/session'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { DEMO_LOGINS } from '../data/demo'
import { errorMessage } from '../lib/errors'

const DEMO_PASSWORD = 'Careflow!2026'
const REMEMBER_KEY = 'careflow_remember_email'
const PATIENTS = DEMO_LOGINS.filter((d) => d.label.includes('Patient'))
const THERAPISTS = DEMO_LOGINS.filter((d) => d.label.includes('Therapist'))

export function LoginPage() {
  const { user, login } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem(REMEMBER_KEY)))
  const [showDemo, setShowDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)

  useEffect(() => {
    if (!showDemo) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowDemo(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [showDemo])

  if (user) return <Navigate to={homeFor(user)} replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const next = await login(email.trim(), password)
      if (remember) localStorage.setItem(REMEMBER_KEY, email.trim())
      else localStorage.removeItem(REMEMBER_KEY)
      navigate(homeFor(next), { replace: true })
    } catch (err) {
      toast.fromError(err)
      if (err instanceof ApiError && err.code === 'RATE_LIMITED') {
        const wait = err.retryAfterSeconds ?? 15
        setRetryAfter(wait)
        setError(`Too many attempts. Wait ${wait}s and try again.`)
        window.setTimeout(() => setRetryAfter(null), wait * 1000)
      } else if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
        setError('Email or password is incorrect.')
      } else {
        setError(errorMessage(err))
      }
    } finally {
      setPending(false)
    }
  }

  function fillDemo(nextEmail: string) {
    setEmail(nextEmail)
    setPassword(DEMO_PASSWORD)
    setError(null)
    setShowDemo(false)
  }

  function unavailable(label: string) {
    toast.push(`${label} isn’t in this demo. Use a seeded account to sign in.`, 'warn')
  }

  return (
    <div className="login-page">
      <header className="login-top">
        <a className="brand" href="/login" onClick={(e) => e.preventDefault()}>
          <Icon name="spa" filled className="brand-icon" />
          <span className="brand-name">CareFlow</span>
        </a>
        <button type="button" className="login-help" onClick={() => unavailable('Help')}>
          Get Help
        </button>
      </header>

      <main className="login-split">
        <section className="login-hero" aria-hidden="true">
          <img src="/login-hero.jpg" alt="" className="login-hero-img" />
          <div className="login-hero-scrim" />
          <div className="login-quote">
            <Icon name="format_quote" filled className="login-quote-mark" />
            <p className="login-quote-title">“Seamless scheduling for better care.”</p>
            <p className="login-quote-body">
              Experience a simplified approach to managing your health journey with our intuitive
              platform.
            </p>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-panel-inner">
            <header className="login-heading">
              <h1>Welcome back</h1>
              <p>Sign in to manage your appointments and health records.</p>
            </header>

            <form className="login-form" onSubmit={(e) => void onSubmit(e)}>
              <label className="field" htmlFor="login-email">
                <span className="field-label">Email Address</span>
                <span className="login-input">
                  <Icon name="mail" />
                  <input
                    id="login-email"
                    className="field-input"
                    type="email"
                    autoComplete="username"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </span>
              </label>

              <label className="field" htmlFor="login-password">
                <span className="login-password-label">
                  <span className="field-label">Password</span>
                  <button type="button" className="login-text-btn" onClick={() => unavailable('Password reset')}>
                    Forgot password?
                  </button>
                </span>
                <span className="login-input">
                  <Icon name="lock" />
                  <input
                    id="login-password"
                    className="field-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="field-password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} />
                  </button>
                </span>
              </label>

              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>

              {error ? (
                <p className="field-error" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                className="btn btn-primary login-submit"
                type="submit"
                disabled={pending || retryAfter !== null}
              >
                {pending ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="login-divider">
              <span>Demo access</span>
            </div>

            <button
              type="button"
              className="btn btn-outlined login-demo-toggle"
              onClick={() => setShowDemo(true)}
            >
              <Icon name="badge" />
              Show dummy credentials
            </button>
          </div>
        </section>
      </main>

      <footer className="login-footer">
        <p>© 2026 CareFlow Health Systems. All rights reserved.</p>
        <div className="login-footer-links">
          <button type="button" onClick={() => unavailable('Privacy Policy')}>
            Privacy Policy
          </button>
          <button type="button" onClick={() => unavailable('Terms of Service')}>
            Terms of Service
          </button>
          <button type="button" onClick={() => unavailable('Security Standards')}>
            Security Standards
          </button>
        </div>
      </footer>

      {showDemo
        ? createPortal(
            <div
              className="overlay"
              role="presentation"
              onClick={() => setShowDemo(false)}
            >
              <div
                className="modal card demo-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="demo-creds-title"
                onClick={(event) => event.stopPropagation()}
              >
                <header className="demo-modal-head">
                  <div>
                    <h2 id="demo-creds-title">Dummy credentials</h2>
                    <p className="muted">
                      Same password for every account: <code>{DEMO_PASSWORD}</code>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Close"
                    onClick={() => setShowDemo(false)}
                  >
                    <Icon name="close" />
                  </button>
                </header>
                <div className="demo-modal-grid">
                  <div className="demo-group">
                    <span className="demo-group-label">Patients</span>
                    {PATIENTS.map((d) => (
                      <button
                        key={d.email}
                        type="button"
                        className="demo-chip"
                        onClick={() => fillDemo(d.email)}
                      >
                        <strong>{d.label.replace(' · Patient', '')}</strong>
                        <span>{d.email}</span>
                      </button>
                    ))}
                  </div>
                  <div className="demo-group">
                    <span className="demo-group-label">Therapists</span>
                    {THERAPISTS.map((d) => (
                      <button
                        key={d.email}
                        type="button"
                        className="demo-chip"
                        onClick={() => fillDemo(d.email)}
                      >
                        <strong>{d.label.replace(' · Therapist', '')}</strong>
                        <span>{d.email}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
