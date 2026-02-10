import { useId } from 'react'
import { diceTones, type DiceVariant } from '../data/dice'

type DiceIconProps = {
  variant: DiceVariant
  label: string
  className?: string
}

export function DiceIcon({ variant, label, className }: DiceIconProps) {
  const tone = diceTones[variant]
  const uid = useId()
  const faceId = `dice-face-${variant}-${uid}`
  const coreId = `dice-core-${variant}-${uid}`

  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      role="img"
      aria-label={`Dado ${label} faces`}
    >
      <defs>
        <linearGradient id={faceId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tone.highlight} />
          <stop offset="55%" stopColor={tone.base} />
          <stop offset="100%" stopColor={tone.shadow} />
        </linearGradient>
        <linearGradient id={coreId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tone.shadow} />
          <stop offset="100%" stopColor={tone.base} />
        </linearGradient>
      </defs>
      <rect
        x="10"
        y="10"
        width="100"
        height="100"
        rx="22"
        fill={`url(#${faceId})`}
        stroke={tone.edge}
        strokeWidth="2.5"
      />
      <rect
        x="28"
        y="28"
        width="64"
        height="64"
        rx="16"
        fill={`url(#${coreId})`}
        stroke={tone.accent}
        strokeWidth="1.5"
      />
      <path
        d="M24 22 L60 12 L96 26"
        stroke={tone.highlight}
        strokeWidth="3"
        opacity="0.45"
      />
      <g fill={tone.accent} opacity="0.75">
        <circle cx="38" cy="42" r="3" />
        <circle cx="82" cy="42" r="3" />
        <circle cx="38" cy="82" r="3" />
        <circle cx="82" cy="82" r="3" />
      </g>
      <text x="60" y="71" textAnchor="middle" fill={tone.text}>
        {label}
      </text>
    </svg>
  )
}
