/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { errorMessage, isApiError, isWarnCode } from '../lib/errors'
import { Icon } from './Icon'

type Kind = 'ok' | 'warn' | 'error'

type ToastItem = {
  id: string
  kind: Kind
  message: string
}

type ToastContextValue = {
  push: (message: string, kind?: Kind) => void
  fromError: (err: unknown) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<Kind, string> = {
  ok: 'check_circle',
  warn: 'warning',
  error: 'error',
}

function durationFor(kind: Kind): number {
  if (kind === 'error') return 7500
  if (kind === 'warn') return 6500
  return 4000
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message: string, kind: Kind = 'ok') => {
      const text = message.trim()
      if (!text) return
      const id = crypto.randomUUID()
      setItems((prev) => [...prev.slice(-2), { id, kind, message: text }])
      const timer = window.setTimeout(() => dismiss(id), durationFor(kind))
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  const fromError = useCallback(
    (err: unknown) => {
      const kind: Kind = isApiError(err) && isWarnCode(err.code) ? 'warn' : 'error'
      push(errorMessage(err), kind)
    },
    [push],
  )

  const value = useMemo(() => ({ push, fromError }), [push, fromError])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-stack" role="region" aria-label="Notifications">
          {items.map((t) => (
            <div
              key={t.id}
              className={`toast toast-${t.kind}`}
              role={t.kind === 'ok' ? 'status' : 'alert'}
            >
              <Icon name={ICONS[t.kind]} filled className="toast-icon" />
              <p className="toast-message">{t.message}</p>
              <button
                type="button"
                className="toast-dismiss"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
              >
                <Icon name="close" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

/** Toast once when a query fails (inline error copy can stay as a fallback). */
export function useQueryErrorToast(error: unknown): void {
  const toast = useToast()
  const last = useRef<unknown>(undefined)
  useEffect(() => {
    if (!error) {
      last.current = undefined
      return
    }
    if (error === last.current) return
    last.current = error
    toast.fromError(error)
  }, [error, toast])
}
