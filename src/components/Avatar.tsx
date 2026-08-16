import { useState } from 'react'

const PALETTE = ['#1a73e8', '#006688', '#00855d', '#005bbf', '#004d67']

function hashHue(name: string): string {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length] ?? PALETTE[0]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? '')
  return (first + last).toUpperCase()
}

type AvatarProps = {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  src?: string
}

export function Avatar({ name, size = 'md', src }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const showPhoto = Boolean(src) && !failed

  if (showPhoto && src) {
    return (
      <img
        className={`avatar avatar-${size} avatar-photo`}
        src={src}
        alt={name}
        title={name}
        width={size === 'xl' ? 128 : size === 'lg' ? 80 : size === 'sm' ? 32 : 48}
        height={size === 'xl' ? 128 : size === 'lg' ? 80 : size === 'sm' ? 32 : 48}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <span className={`avatar avatar-${size}`} style={{ background: hashHue(name) }} title={name}>
      {initials(name)}
    </span>
  )
}
