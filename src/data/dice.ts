import type { SolarisType } from '../services/solaris'
import solarisMorning from '../assets/solaris/Solaris Manhã.png'
import solarisAfternoon from '../assets/solaris/Solaris Tarde.png'
import solarisNight from '../assets/solaris/Solaris Noite.png'

export type DiceVariant = 'aurora' | 'vesper' | 'noctis'

export type DiceTone = {
  base: string
  highlight: string
  shadow: string
  edge: string
  accent: string
  text: string
  glow: string
}

export type DiceItem = {
  id: DiceVariant
  name: string
  tagline: string
  faces: number
  bonus: string[]
  baseCost: number
  currency: SolarisType
  icon: string
  tone: DiceTone
}

export const diceTones: Record<DiceVariant, DiceTone> = {
  aurora: {
    base: '#0c2f2a',
    highlight: '#2bffd1',
    shadow: '#062019',
    edge: '#64ffe1',
    accent: '#42f7ff',
    text: '#e9f0ff',
    glow: 'rgba(43, 255, 209, 0.45)',
  },
  vesper: {
    base: '#241d3d',
    highlight: '#ff4fd8',
    shadow: '#120821',
    edge: '#ff91e6',
    accent: '#ffb84d',
    text: '#ffe6fb',
    glow: 'rgba(255, 79, 216, 0.45)',
  },
  noctis: {
    base: '#1b1c2a',
    highlight: '#8a93b2',
    shadow: '#0b0c12',
    edge: '#b6bedb',
    accent: '#5a7cff',
    text: '#d6deff',
    glow: 'rgba(90, 124, 255, 0.4)',
  },
}

export const diceCatalog: DiceItem[] = [
  {
    id: 'aurora',
    name: 'Dado Aurora',
    tagline: 'Solaris da manha',
    faces: 10,
    bonus: ['Relance', '+2 casas'],
    baseCost: 12,
    currency: 'morning',
    icon: solarisMorning,
    tone: diceTones.aurora,
  },
  {
    id: 'vesper',
    name: 'Dado Vespertino',
    tagline: 'Solaris da tarde',
    faces: 8,
    bonus: ['+1 casa'],
    baseCost: 8,
    currency: 'afternoon',
    icon: solarisAfternoon,
    tone: diceTones.vesper,
  },
  {
    id: 'noctis',
    name: 'Dado Noturno',
    tagline: 'Solaris da noite',
    faces: 6,
    bonus: [],
    baseCost: 5,
    currency: 'night',
    icon: solarisNight,
    tone: diceTones.noctis,
  },
]
