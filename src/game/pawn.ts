import { Sprite } from 'pixi.js'

const pawnSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2bffd1"/>
      <stop offset="100%" stop-color="#ff4fd8"/>
    </linearGradient>
  </defs>
  <circle cx="128" cy="72" r="32" fill="url(#glow)" stroke="#ffffff" stroke-width="6"/>
  <path d="M64 200 L128 92 L192 200 Z" fill="url(#glow)" stroke="#ffffff" stroke-width="6"/>
  <rect x="76" y="200" width="104" height="24" rx="12" fill="#0b0b13" stroke="#2bffd1" stroke-width="4"/>
</svg>
`

const pawnUrl = `data:image/svg+xml;utf8,${encodeURIComponent(pawnSvg)}`

export function createPawn(): Sprite {
  const pawn = Sprite.from(pawnUrl)
  pawn.anchor.set(0.5)
  pawn.scale.set(0.12)
  return pawn
}
