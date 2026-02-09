import rawOficina from './Oficina Virtutum.txt?raw'

export type HabitItem = {
  id: string
  label: string
  points: number
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
  return {
    id,
    label,
    points: 1,
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
