import { Sprite } from 'pixi.js'

const pawnSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2bffd1"/>
      <stop offset="100%" stop-color="#ff4fd8"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="18" r="8" fill="url(#glow)" stroke="#ffffff" stroke-width="2"/>
  <path d="M16 50 L32 26 L48 50 Z" fill="url(#glow)" stroke="#ffffff" stroke-width="2"/>
  <rect x="20" y="50" width="24" height="6" rx="3" fill="#0b0b13" stroke="#2bffd1" stroke-width="1"/>
</svg>
`

const pawnUrl = `data:image/svg+xml;utf8,${encodeURIComponent(pawnSvg)}`

export function createPawn(): Sprite {
  const pawn = Sprite.from(pawnUrl)
  pawn.anchor.set(0.5)
  pawn.scale.set(0.45)
  return pawn
}
