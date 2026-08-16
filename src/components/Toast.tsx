/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { isApiError, isWarnCode } from '../lib/errors'

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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, kind: Kind = 'ok') => {
    const id = crypto.randomUUID()
    setItems((prev) => [...prev, { id, kind, message }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const fromError = useCallback(
    (err: unknown) => {
      if (isApiError(err)) {
        push(err.message, isWarnCode(err.code) ? 'warn' : 'error')
        return
      }
      push(err instanceof Error ? err.message : 'Request failed', 'error')
    },
    [push],
  )

  const value = useMemo(() => ({ push, fromError }), [push, fromError])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
