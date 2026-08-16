import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { homeFor } from '../auth/paths'
import { useSession } from '../auth/session'
import { profilePhoto } from '../data/demo'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { LogoutButton } from './LogoutButton'
import { PageFade } from './PageFade'
import { useToast } from './Toast'

type NavItem = { to: string; label: string; icon: string; short: string }

function Brand({ to }: { to: string }) {
  return (
    <NavLink to={to} className="brand">
      <Icon name="spa" filled className="brand-icon" />
      <span className="brand-name">CareFlow</span>
    </NavLink>
  )
}

function IconBtn({ name, label, onClick }: { name: string; label: string; onClick: () => void }) {
  return (
    <button type="button" className="icon-btn topbar-icon" aria-label={label} onClick={onClick}>
      <Icon name={name} />
    </button>
  )
}

export function PatientShell() {
  const { user } = useSession()
  const toast = useToast()
  const links: NavItem[] = [
    { to: '/book', label: 'Find Therapist', icon: 'search', short: 'Find' },
    { to: '/appointments', label: 'My Appointments', icon: 'event_note', short: 'Bookings' },
    { to: '/profile', label: 'Profile', icon: 'person', short: 'Profile' },
  ]

  return (
    <div className="shell">
      <header className="topbar">
        <Brand to="/book" />
        <nav className="nav-links">
          {links.slice(0, 2).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/book'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-user">
          <IconBtn
            name="notifications"
            label="Notifications"
            onClick={() => toast.push("You're all caught up")}
          />
          <IconBtn
            name="help"
            label="Help"
            onClick={() => toast.push('Holds last 60 seconds. Confirm before the timer ends.')}
          />
          <NavLink to="/profile" className="topbar-avatar" aria-label="Profile">
            <Avatar name={user?.fullName ?? 'P'} size="sm" src={user ? profilePhoto(user) : undefined} />
          </NavLink>
        </div>
      </header>
      <main className="page">
        <PageFade>
          <Outlet />
        </PageFade>
      </main>
      <nav className="bottom-nav" aria-label="Primary">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/book'}
            className={({ isActive }) => (isActive ? 'bottom-link active' : 'bottom-link')}
          >
            <Icon name={l.icon} filled />
            {l.short}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function TherapistShell() {
  const { user } = useSession()
  const toast = useToast()
  const links: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', short: 'Home' },
    { to: '/hours', label: 'Schedule', icon: 'calendar_month', short: 'Hours' },
    { to: '/profile', label: 'Profile', icon: 'person', short: 'Profile' },
  ]

  return (
    <div className="shell shell-therapist">
      <aside className="sidenav">
        <div className="sidenav-brand">
          <Brand to="/dashboard" />
          <p className="sidenav-kicker">Portal</p>
        </div>
        <nav className="sidenav-links">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => (isActive ? 'sidenav-link active' : 'sidenav-link')}
            >
              <Icon name={l.icon} filled />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidenav-foot">
          <NavLink to="/profile" className="sidenav-profile">
            <Avatar name={user?.fullName ?? 'T'} size="sm" src={user ? profilePhoto(user) : undefined} />
            <span>{user?.fullName}</span>
          </NavLink>
          <LogoutButton className="sidenav-logout" />
        </div>
      </aside>
      <header className="topbar topbar-mobile">
        <Brand to="/dashboard" />
        <div className="topbar-user">
          <IconBtn
            name="notifications"
            label="Notifications"
            onClick={() => toast.push("You're all caught up")}
          />
          <LogoutButton className="icon-btn topbar-icon" iconOnly />
          <NavLink to="/profile" className="topbar-avatar" aria-label="Profile">
            <Avatar name={user?.fullName ?? 'T'} size="sm" src={user ? profilePhoto(user) : undefined} />
          </NavLink>
        </div>
      </header>
      <main className="page page-therapist">
        <PageFade>
          <Outlet />
        </PageFade>
      </main>
      <nav className="bottom-nav" aria-label="Primary">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/book'}
            className={({ isActive }) => (isActive ? 'bottom-link active' : 'bottom-link')}
          >
            <Icon name={l.icon} filled />
            {l.short}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function AuthedShell() {
  const { user } = useSession()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return user.role === 'THERAPIST' ? <TherapistShell /> : <PatientShell />
}

export function RootRedirect() {
  const { user } = useSession()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={homeFor(user)} replace />
}

