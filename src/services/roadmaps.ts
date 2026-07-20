export type RoadmapItem = {
  id: string
  title: string
  description: string
  siteUrl: string
  githubUrl: string
  completed: boolean
  createdAt: string
}

export type RoadmapData = {
  id: string
  name: string
  items: RoadmapItem[]
}

const STORAGE_KEY = 'codex-roadmaps-store'
const ROADMAPS_EVENT = 'codex-roadmaps-change'

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `rm-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const getRoadmaps = (): RoadmapData[] => {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as RoadmapData[]
  } catch {
    return []
  }
}

const writeRoadmaps = (data: RoadmapData[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event(ROADMAPS_EVENT))
}

export const createRoadmap = (name: string) => {
  const roadmaps = getRoadmaps()
  const newRoadmap: RoadmapData = { id: createId(), name, items: [] }
  writeRoadmaps([...roadmaps, newRoadmap])
  return newRoadmap
}

export const addRoadmapItem = (roadmapId: string, item: Omit<RoadmapItem, 'id' | 'completed' | 'createdAt'>) => {
  const roadmaps = getRoadmaps()
  const updated = roadmaps.map(rm => {
    if (rm.id === roadmapId) {
      return {
        ...rm,
        items: [...rm.items, { ...item, id: createId(), completed: false, createdAt: new Date().toISOString() }]
      }
    }
    return rm
  })
  writeRoadmaps(updated)
}

export const toggleRoadmapItem = (roadmapId: string, itemId: string) => {
  const roadmaps = getRoadmaps()
  const updated = roadmaps.map(rm => {
    if (rm.id === roadmapId) {
      return {
        ...rm,
        items: rm.items.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item)
      }
    }
    return rm
  })
  writeRoadmaps(updated)
}

export const deleteRoadmap = (roadmapId: string) => {
  const roadmaps = getRoadmaps()
  const updated = roadmaps.filter(rm => rm.id !== roadmapId)
  writeRoadmaps(updated)
}

export const deleteRoadmapItem = (roadmapId: string, itemId: string) => {
  const roadmaps = getRoadmaps()
  const updated = roadmaps.map(rm => {
    if (rm.id === roadmapId) {
      return { ...rm, items: rm.items.filter(item => item.id !== itemId) }
    }
    return rm
  })
  writeRoadmaps(updated)
}

export const subscribeRoadmaps = (handler: () => void) => {
  if (typeof window === 'undefined') return () => {}
  const onEvent = () => handler()
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) handler()
  }
  window.addEventListener(ROADMAPS_EVENT, onEvent)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(ROADMAPS_EVENT, onEvent)
    window.removeEventListener('storage', onStorage)
  }
}
