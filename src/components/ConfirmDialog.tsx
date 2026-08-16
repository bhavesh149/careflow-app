import { useCallback, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type ConfirmOptions = {
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type DialogProps = ConfirmOptions & {
  open: boolean
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Go back',
  danger,
  busy,
  onClose,
  onConfirm,
}: DialogProps) {
  if (!open) return null

  return createPortal(
    <div
      className="overlay"
      role="presentation"
      onClick={() => {
        if (!busy) onClose()
      }}
    >
      <div
        className="modal card confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-copy">
          <h2 id="confirm-title">{title}</h2>
          <p className="muted">{body}</p>
        </div>
        <div className="confirm-actions">
          <button type="button" className="btn btn-outlined" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function useConfirmDialog(): {
  ask: (options: ConfirmOptions) => Promise<boolean>
  dialog: ReactNode
} {
  const [opts, setOpts] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(
    null,
  )

  const ask = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOpts({ ...options, resolve })
    })
  }, [])

  const close = (value: boolean) => {
    opts?.resolve(value)
    setOpts(null)
  }

  const dialog = opts ? (
    <ConfirmDialog
      open
      title={opts.title}
      body={opts.body}
      confirmLabel={opts.confirmLabel}
      cancelLabel={opts.cancelLabel}
      danger={opts.danger}
      onClose={() => close(false)}
      onConfirm={() => close(true)}
    />
  ) : null

  return { ask, dialog }
}
