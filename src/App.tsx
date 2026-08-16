import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RequireRole, SessionProvider } from './auth/session'
import { AuthedShell, RootRedirect } from './components/Shell'
import { ToastProvider } from './components/Toast'
import { isApiError } from './lib/errors'
import { LoginPage } from './pages/Login'
import { AppointmentsPage } from './pages/patient/Appointments'
import { BookPage } from './pages/patient/Book'
import { TherapistsPage } from './pages/patient/Therapists'
import { ProfilePage } from './pages/Profile'
import { DashboardPage } from './pages/therapist/Dashboard'
import { SchedulePage } from './pages/therapist/Schedule'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, err) => {
        if (isApiError(err) && err.status < 500 && err.status !== 429) return false
        return count < 2
      },
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AuthedShell />}>
                <Route
                  path="/book"
                  element={
                    <RequireRole role="PATIENT">
                      <TherapistsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="/book/:therapistId"
                  element={
                    <RequireRole role="PATIENT">
                      <BookPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="/appointments"
                  element={
                    <RequireRole role="PATIENT">
                      <AppointmentsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <RequireRole role="THERAPIST">
                      <DashboardPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="/hours"
                  element={
                    <RequireRole role="THERAPIST">
                      <SchedulePage />
                    </RequireRole>
                  }
                />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </ToastProvider>
        </SessionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
