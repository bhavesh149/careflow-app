import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

export type SelectOption<T extends string = string> = {
  value: T
  label: string
}

type SelectModalProps<T extends string> = {
  label?: string
  title?: string
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
}

export function SelectModal<T extends string>({
  label,
  title,
  value,
  options,
  onChange,
  disabled,
}: SelectModalProps<T>) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  function pick(next: T) {
    onChange(next)
    setOpen(false)
  }

  return (
    <div className="field">
      {label ? <span className="field-label">{label}</span> : null}
      <button
        type="button"
        className="select-trigger"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span>{selected?.label ?? 'Select'}</span>
        <Icon name="expand_more" />
      </button>
      {open
        ? createPortal(
            <div
              className="overlay"
              role="presentation"
              onClick={() => setOpen(false)}
            >
              <div
                className="modal card picker-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="picker-head">
                  <h2 id={titleId}>{title ?? label ?? 'Choose an option'}</h2>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Close"
                    onClick={() => setOpen(false)}
                  >
                    <Icon name="close" />
                  </button>
                </div>
                <div className="picker-list" role="listbox" aria-labelledby={titleId}>
                  {options.map((option) => {
                    const active = option.value === value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={active ? 'picker-option selected' : 'picker-option'}
                        onClick={() => pick(option.value)}
                      >
                        <span>{option.label}</span>
                        {active ? <Icon name="check" filled /> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
