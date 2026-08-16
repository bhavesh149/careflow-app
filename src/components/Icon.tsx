type IconProps = {
  name: string
  filled?: boolean
  className?: string
}

export function Icon({ name, filled, className }: IconProps) {
  return (
    <span
      className={className ? `material-symbols-outlined ${className}` : 'material-symbols-outlined'}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden
    >
      {name}
    </span>
  )
}
