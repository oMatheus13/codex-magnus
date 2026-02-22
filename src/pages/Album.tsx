import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { albumCategories, albumPages, type AlbumPage } from '../data/album'

type PageEntry = AlbumPage & { pageNumber: number }

type Spread = {
  left: PageEntry | null
  right: PageEntry | null
}

const buildSpreads = (pages: PageEntry[]) => {
  const spreads: Spread[] = []
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({
      left: pages[i] ?? null,
      right: pages[i + 1] ?? null,
    })
  }
  return spreads
}

const renderSlots = (count: number) =>
  Array.from({ length: count }, (_, index) => (
    <div key={`slot-${index}`} className="album-slot">
      <span>{index + 1}</span>
    </div>
  ))

const renderPage = (page: PageEntry | null, side: 'left' | 'right') => {
  if (!page) {
    return <div className={`album-page-card is-${side} is-empty`} />
  }

  if (page.type === 'cover') {
    return (
      <div className={`album-page-card is-${side} album-cover`}>
        <div className="album-cover-title">{page.title}</div>
        <div className="album-cover-sub">{page.subtitle}</div>
        <div className="album-cover-mark">Codex Magnus</div>
        <div className="album-page-number">{page.pageNumber}</div>
      </div>
    )
  }

  if (page.type === 'index') {
    return (
      <div className={`album-page-card is-${side} album-index`}>
        <div className="album-page-header">
          <div>
            <div className="album-page-title">{page.title}</div>
            <div className="album-page-subtitle">{page.subtitle}</div>
          </div>
        </div>
        <ul className="album-index-list">
          {albumCategories.map((category) => (
            <li key={category.id}>
              <span
                className="album-index-dot"
                style={{ background: category.color }}
              />
              <div>
                <div className="album-index-title">{category.title}</div>
                <div className="album-index-sub">{category.latin}</div>
              </div>
            </li>
          ))}
        </ul>
        <div className="album-page-number">{page.pageNumber}</div>
      </div>
    )
  }

  return (
    <div className={`album-page-card is-${side}`}>
      <div className="album-page-header">
        <div className="album-page-title">{page.category.title}</div>
        <div className="album-page-subtitle">{page.category.latin}</div>
      </div>
      <div
        className="album-slot-grid"
        style={{ '--slot-accent': page.category.accent } as CSSProperties}
      >
        {renderSlots(page.category.slots)}
      </div>
      <div className="album-page-number">{page.pageNumber}</div>
    </div>
  )
}

export function Album() {
  const pages = useMemo(
    () =>
      albumPages.map((page, index) => ({
        ...page,
        pageNumber: index + 1,
      })),
    [],
  )
  const spreads = useMemo(() => buildSpreads(pages), [pages])
  const [spreadIndex, setSpreadIndex] = useState(0)
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(
    null,
  )
  const [isDragging, setIsDragging] = useState(false)
  const flipTimer = useRef<number | null>(null)
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    active: false,
    triggered: false,
  })
  const flipDuration = 720
  const dragThreshold = 50
  const dragAxisBias = 12

  const current = spreads[spreadIndex]
  const next = spreads[spreadIndex + 1]
  const prev = spreads[spreadIndex - 1]

  const canPrev = spreadIndex > 0 && !flipDirection
  const canNext = spreadIndex < spreads.length - 1 && !flipDirection

  const startFlip = (direction: 'next' | 'prev') => {
    if (flipDirection) return
    setFlipDirection(direction)
    if (flipTimer.current) {
      window.clearTimeout(flipTimer.current)
    }
    flipTimer.current = window.setTimeout(() => {
      setSpreadIndex((currentIndex) =>
        direction === 'next' ? currentIndex + 1 : currentIndex - 1,
      )
      setFlipDirection(null)
    }, flipDuration)
  }

  useEffect(() => {
    return () => {
      if (flipTimer.current) {
        window.clearTimeout(flipTimer.current)
      }
    }
  }, [])

  const flipFront =
    flipDirection === 'next' ? current?.right : current?.left
  const flipBack =
    flipDirection === 'next' ? next?.left : prev?.right

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (flipDirection) return
    const target = event.target as HTMLElement
    if (target.closest('button, a, input, select, textarea, [data-no-swipe]')) {
      return
    }
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      active: true,
      triggered: false,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current
    if (!state.active || state.triggered) return
    const deltaX = event.clientX - state.startX
    const deltaY = event.clientY - state.startY
    if (Math.abs(deltaX) < dragThreshold) return
    if (Math.abs(deltaX) < Math.abs(deltaY) + dragAxisBias) return
    state.triggered = true
    setIsDragging(false)
    if (deltaX < 0 && canNext) {
      startFlip('next')
    } else if (deltaX > 0 && canPrev) {
      startFlip('prev')
    }
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    dragRef.current.triggered = false
    setIsDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div className="page album-page">
      <section className="album-shell">
        <div className="album-toolbar">
          <div className="album-toolbar-title">Memoriam Victoriae</div>
          <div className="album-toolbar-controls">
            <button
              type="button"
              className="button ghost"
              onClick={() => startFlip('prev')}
              disabled={!canPrev}
            >
              Anterior
            </button>
            <div className="album-toolbar-page">
              Pagina {spreadIndex * 2 + 1}
              {current?.right ? `-${spreadIndex * 2 + 2}` : ''} /{' '}
              {pages.length}
            </div>
            <button
              type="button"
              className="button ghost"
              onClick={() => startFlip('next')}
              disabled={!canNext}
            >
              Proxima
            </button>
          </div>
        </div>

        <div
          className={`album-book${isDragging ? ' is-dragging' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="album-spread">
            {renderPage(current?.left ?? null, 'left')}
            {renderPage(current?.right ?? null, 'right')}
          </div>

          {flipDirection ? (
            <div className={`album-flip is-${flipDirection}`}>
              <div className="album-flip-face album-flip-front">
                {renderPage(
                  flipFront ?? null,
                  flipDirection === 'next' ? 'right' : 'left',
                )}
              </div>
              <div className="album-flip-face album-flip-back">
                {renderPage(
                  flipBack ?? null,
                  flipDirection === 'next' ? 'left' : 'right',
                )}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
