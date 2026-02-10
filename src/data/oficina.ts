import rawOficina from './Oficina Virtutum.txt?raw'

export type HabitFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly'

export type HabitItem = {
  id: string
  label: string
  points: number
  difficulty: number
  importance: number
  frequency: HabitFrequency
  sectionId: string
  subSectionId?: string
}

export type HabitSubSection = {
  id: string
  title: string
  latin: string
  latinKey: string
  habits: HabitItem[]
}

export type HabitSection = {
  id: string
  title: string
  latin: string
  latinKey: string
  habits: HabitItem[]
  subSections: HabitSubSection[]
}

const normalizeSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

type HabitMeta = {
  difficulty: number
  importance: number
  frequency: HabitFrequency
  points: number
}

const habitMeta: Record<string, HabitMeta> = {
  'desenvolvimento-pessoal.leitura-diaria': {
    difficulty: 2,
    importance: 4,
    frequency: 'daily',
    points: 3,
  },
  'desenvolvimento-pessoal.definicao-de-metas': {
    difficulty: 4,
    importance: 5,
    frequency: 'quarterly',
    points: 7,
  },
  'desenvolvimento-pessoal.visualizacao-de-metas': {
    difficulty: 1,
    importance: 3,
    frequency: 'daily',
    points: 2,
  },
  'desenvolvimento-pessoal.hobby-criativo': {
    difficulty: 3,
    importance: 3,
    frequency: 'weekly',
    points: 3,
  },
  'desenvolvimento-pessoal.pratica-de-disciplina': {
    difficulty: 3,
    importance: 4,
    frequency: 'daily',
    points: 4,
  },
  'desenvolvimento-pessoal.reflexao-semanal': {
    difficulty: 3,
    importance: 4,
    frequency: 'weekly',
    points: 4,
  },
  'saude-fisica.exercicios-fisicos': {
    difficulty: 4,
    importance: 5,
    frequency: 'daily',
    points: 5,
  },
  'saude-fisica.hidratacao': {
    difficulty: 1,
    importance: 4,
    frequency: 'daily',
    points: 3,
  },
  'saude-fisica.sono-de-qualidade': {
    difficulty: 3,
    importance: 5,
    frequency: 'daily',
    points: 4,
  },
  'saude-fisica.reducao-de-acucares': {
    difficulty: 3,
    importance: 4,
    frequency: 'daily',
    points: 4,
  },
  'saude-fisica.postura-correta': {
    difficulty: 2,
    importance: 3,
    frequency: 'daily',
    points: 3,
  },
  'saude-fisica.monitoramento': {
    difficulty: 2,
    importance: 3,
    frequency: 'weekly',
    points: 3,
  },
  'saude-fisica.reducao-de-tempo-de-tela': {
    difficulty: 3,
    importance: 3,
    frequency: 'daily',
    points: 3,
  },
  'saude-mental.meditacao': {
    difficulty: 3,
    importance: 5,
    frequency: 'daily',
    points: 4,
  },
  'saude-mental.diario-de-gratidao': {
    difficulty: 2,
    importance: 4,
    frequency: 'daily',
    points: 3,
  },
  'saude-mental.desconexao-digital': {
    difficulty: 3,
    importance: 4,
    frequency: 'daily',
    points: 4,
  },
  'saude-mental.autoafirmacao-positiva': {
    difficulty: 1,
    importance: 3,
    frequency: 'daily',
    points: 2,
  },
  'saude-mental.organizacao-e-planejamento': {
    difficulty: 3,
    importance: 4,
    frequency: 'weekly',
    points: 4,
  },
  'saude-mental.tempo-de-silencio': {
    difficulty: 2,
    importance: 3,
    frequency: 'daily',
    points: 3,
  },
  'produtividade.pomodoro': {
    difficulty: 3,
    importance: 4,
    frequency: 'daily',
    points: 4,
  },
  'produtividade.limpeza-e-organizacao': {
    difficulty: 2,
    importance: 3,
    frequency: 'weekly',
    points: 3,
  },
  'produtividade.revisao-semanal': {
    difficulty: 3,
    importance: 4,
    frequency: 'weekly',
    points: 4,
  },
  'produtividade.desconexao-de-distracoes': {
    difficulty: 2,
    importance: 4,
    frequency: 'daily',
    points: 3,
  },
  'relacionamentos.relacionamentos-romantico.comunicacao-clara-e-honesta': {
    difficulty: 3,
    importance: 4,
    frequency: 'weekly',
    points: 4,
  },
  'relacionamentos.relacionamentos-romantico.gestos-de-carinho': {
    difficulty: 2,
    importance: 4,
    frequency: 'daily',
    points: 3,
  },
  'relacionamentos.relacionamentos-romantico.tempo-de-qualidade': {
    difficulty: 3,
    importance: 4,
    frequency: 'weekly',
    points: 4,
  },
  'relacionamentos.relacionamentos-romantico.pratica-de-empatia': {
    difficulty: 2,
    importance: 4,
    frequency: 'daily',
    points: 3,
  },
  'relacionamentos.relacionamentos-romantico.surpresas-esporadicas': {
    difficulty: 4,
    importance: 4,
    frequency: 'monthly',
    points: 6,
  },
  'relacionamentos.amizades-e-familiares.conexao-regular': {
    difficulty: 2,
    importance: 4,
    frequency: 'weekly',
    points: 3,
  },
  'relacionamentos.amizades-e-familiares.atencao-total': {
    difficulty: 3,
    importance: 4,
    frequency: 'weekly',
    points: 4,
  },
  'relacionamentos.amizades-e-familiares.celebrar-conquistas': {
    difficulty: 2,
    importance: 3,
    frequency: 'monthly',
    points: 5,
  },
  'relacionamentos.amizades-e-familiares.apoio-emocional': {
    difficulty: 3,
    importance: 4,
    frequency: 'weekly',
    points: 4,
  },
  'relacionamentos.amizades-e-familiares.resolver-conflitos-rapidamente': {
    difficulty: 4,
    importance: 5,
    frequency: 'weekly',
    points: 5,
  },
  'relacionamentos.relacionamentos-em-geral.ouvir-mais-falar-menos': {
    difficulty: 2,
    importance: 4,
    frequency: 'daily',
    points: 3,
  },
  'relacionamentos.relacionamentos-em-geral.praticar-a-gratidao': {
    difficulty: 1,
    importance: 3,
    frequency: 'daily',
    points: 2,
  },
  'relacionamentos.relacionamentos-em-geral.estabelecer-limites-saudaveis': {
    difficulty: 4,
    importance: 5,
    frequency: 'weekly',
    points: 5,
  },
  'relacionamentos.relacionamentos-em-geral.ser-confiavel': {
    difficulty: 2,
    importance: 4,
    frequency: 'daily',
    points: 3,
  },
  'relacionamentos.relacionamentos-em-geral.atos-de-servico': {
    difficulty: 3,
    importance: 4,
    frequency: 'weekly',
    points: 4,
  },
  'financeiro.investimentos-regulares': {
    difficulty: 4,
    importance: 5,
    frequency: 'monthly',
    points: 6,
  },
  'financeiro.fundos-de-emergencia': {
    difficulty: 4,
    importance: 5,
    frequency: 'monthly',
    points: 6,
  },
  'financeiro.reducao-de-gastos-desnecessarios': {
    difficulty: 3,
    importance: 4,
    frequency: 'daily',
    points: 4,
  },
  'financeiro.compras-planejadas': {
    difficulty: 2,
    importance: 3,
    frequency: 'weekly',
    points: 3,
  },
  'financeiro.doacoes': {
    difficulty: 2,
    importance: 4,
    frequency: 'monthly',
    points: 5,
  },
  'financeiro.controle-de-impulsos': {
    difficulty: 3,
    importance: 4,
    frequency: 'daily',
    points: 4,
  },
  'espiritualidade.oracao': {
    difficulty: 2,
    importance: 5,
    frequency: 'daily',
    points: 4,
  },
  'espiritualidade.licao-escola-sabatina': {
    difficulty: 3,
    importance: 4,
    frequency: 'weekly',
    points: 4,
  },
  'espiritualidade.leitura-da-biblia': {
    difficulty: 3,
    importance: 5,
    frequency: 'daily',
    points: 4,
  },
  'espiritualidade.gratidao': {
    difficulty: 1,
    importance: 3,
    frequency: 'daily',
    points: 2,
  },
  'espiritualidade.jejum': {
    difficulty: 4,
    importance: 4,
    frequency: 'monthly',
    points: 6,
  },
  'a-voz-do-novo-eu.aquecimento-vocal-diario': {
    difficulty: 2,
    importance: 4,
    frequency: 'daily',
    points: 3,
  },
  'a-voz-do-novo-eu.treino-de-improviso': {
    difficulty: 3,
    importance: 3,
    frequency: 'weekly',
    points: 3,
  },
  'a-voz-do-novo-eu.leitura-em-voz-alta': {
    difficulty: 2,
    importance: 3,
    frequency: 'daily',
    points: 3,
  },
  'a-voz-do-novo-eu.exercicios-de-diccao': {
    difficulty: 3,
    importance: 4,
    frequency: 'daily',
    points: 4,
  },
  'a-voz-do-novo-eu.lavar-o-rosto': {
    difficulty: 1,
    importance: 2,
    frequency: 'daily',
    points: 1,
  },
  'a-voz-do-novo-eu.respeirar-zonas-proibidas-do-celular': {
    difficulty: 2,
    importance: 3,
    frequency: 'daily',
    points: 2,
  },
}

const defaultMeta: HabitMeta = {
  difficulty: 1,
  importance: 1,
  frequency: 'daily',
  points: 1,
}

const parseHeader = (line: string) => {
  const parts = line.split('|')
  if (parts.length < 2) return null
  return {
    title: parts[0]?.trim() ?? '',
    latin: parts[1]?.trim() ?? '',
  }
}

const createHabit = (
  label: string,
  section: HabitSection,
  subSection?: HabitSubSection,
): HabitItem => {
  const baseId = normalizeSlug(label)
  const id = [section.id, subSection?.id, baseId].filter(Boolean).join('.')
  const meta = habitMeta[id] ?? defaultMeta
  return {
    id,
    label,
    points: meta.points,
    difficulty: meta.difficulty,
    importance: meta.importance,
    frequency: meta.frequency,
    sectionId: section.id,
    subSectionId: subSection?.id,
  }
}

export const oficinaSections: HabitSection[] = (() => {
  const sections: HabitSection[] = []
  const lines = rawOficina.split(/\r?\n/)

  let currentSection: HabitSection | null = null
  let currentSubSection: HabitSubSection | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      currentSubSection = null
      continue
    }

    const indent = line.match(/^\s*/)?.[0].length ?? 0
    const header = parseHeader(trimmed)

    if (indent === 0 && header) {
      currentSection = {
        id: normalizeSlug(header.title),
        title: header.title,
        latin: header.latin,
        latinKey: normalizeSlug(header.latin),
        habits: [],
        subSections: [],
      }
      sections.push(currentSection)
      currentSubSection = null
      continue
    }

    if (indent > 0 && header && currentSection) {
      currentSubSection = {
        id: normalizeSlug(header.title),
        title: header.title,
        latin: header.latin,
        latinKey: normalizeSlug(header.latin),
        habits: [],
      }
      currentSection.subSections.push(currentSubSection)
      continue
    }

    if (!currentSection) continue

    const habit = createHabit(trimmed, currentSection, currentSubSection ?? undefined)
    if (currentSubSection) {
      currentSubSection.habits.push(habit)
    } else {
      currentSection.habits.push(habit)
    }
  }

  return sections
})()

export const oficinaHabits = oficinaSections.flatMap((section) => {
  const topLevel = section.habits
  const nested = section.subSections.flatMap((sub) => sub.habits)
  return [...topLevel, ...nested]
})
