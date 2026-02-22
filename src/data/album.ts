export type AlbumCategory = {
  id: string
  title: string
  latin: string
  color: string
  accent: string
  slots: number
}

export type AlbumPage =
  | {
      id: string
      type: 'cover'
      title: string
      subtitle: string
    }
  | {
      id: string
      type: 'index'
      title: string
      subtitle: string
    }
  | {
      id: string
      type: 'category'
      category: AlbumCategory
    }

export const albumCategories: AlbumCategory[] = [
  {
    id: 'sapientia',
    title: 'Sapientia',
    latin: 'Desenvolvimento Pessoal',
    color: '#3f7cff',
    accent: '#ffd27a',
    slots: 12,
  },
  {
    id: 'corpus',
    title: 'Corpus',
    latin: 'Saude Fisica',
    color: '#ff5f6d',
    accent: '#6dff8a',
    slots: 12,
  },
  {
    id: 'mens',
    title: 'Mens',
    latin: 'Saude Mental',
    color: '#9b5dff',
    accent: '#76d4ff',
    slots: 12,
  },
  {
    id: 'productivitas',
    title: 'Productivitas',
    latin: 'Produtividade',
    color: '#ff9f43',
    accent: '#ffd479',
    slots: 12,
  },
  {
    id: 'nexus',
    title: 'Nexus Humanae',
    latin: 'Relacionamentos',
    color: '#ff5db1',
    accent: '#ffb4d9',
    slots: 12,
  },
  {
    id: 'opes',
    title: 'Opes',
    latin: 'Financeiro',
    color: '#1ec98f',
    accent: '#0f5e3f',
    slots: 12,
  },
  {
    id: 'spiritus',
    title: 'Spiritus',
    latin: 'Espiritualidade',
    color: '#e9f0ff',
    accent: '#7aa6ff',
    slots: 12,
  },
]

export const albumPages: AlbumPage[] = [
  {
    id: 'cover',
    type: 'cover',
    title: 'Memoriam',
    subtitle: 'Victoriae',
  },
  {
    id: 'index',
    type: 'index',
    title: 'Categorias',
    subtitle: 'Mapa das conquistas',
  },
  ...albumCategories.map((category) => ({
    id: `category-${category.id}`,
    type: 'category' as const,
    category,
  })),
]
