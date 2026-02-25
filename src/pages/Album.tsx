import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { albumCategories, albumPages, type AlbumPage } from '../data/album'

type FlipPage =
  | (AlbumPage & { pageNumber: number })
  | {
      id: string
      type: 'back'
      pageNumber: number
    }

type TurnInstance = {
  turn: (
    action: string | Record<string, unknown>,
    ...args: Array<string | number>
  ) => void
  bind: (event: string, handler: (...args: unknown[]) => void) => void
  data: (key: string) => unknown
}

type JQueryStatic = ((element: HTMLElement) => TurnInstance) & {
  fn?: { turn?: unknown }
}

declare global {
  interface Window {
    jQuery?: JQueryStatic
    $?: JQueryStatic
  }
}

const loadScript = (id: string, src: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(script)
  })

const buildPages = (): FlipPage[] => {
  const base = albumPages.map((page, index) => ({
    ...page,
    pageNumber: index + 1,
  }))
  const withBack: FlipPage[] = [
    ...base,
    {
      id: 'back-cover',
      type: 'back',
      pageNumber: base.length + 1,
    },
  ]
  return withBack
}

const renderSlots = (count: number) =>
  Array.from({ length: count }, (_, index) => (
    <div key={`slot-${index}`} className="album-slot">
      <span>{index + 1}</span>
    </div>
  ))

const renderPageContent = (page: FlipPage) => {
  if (page.type === 'cover') {
    return (
      <div className="album-page-content album-cover">
        <div className="album-cover-title">{page.title}</div>
        <div className="album-cover-sub">{page.subtitle}</div>
        <div className="album-cover-mark">Codex Magnus</div>
      </div>
    )
  }

  if (page.type === 'back') {
    return (
      <div className="album-page-content album-back">
        <div className="album-cover-mark">Finis</div>
      </div>
    )
  }

  if (page.type === 'index') {
    return (
      <div className="album-page-content album-index">
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
      </div>
    )
  }

  if (page.type === 'category') {
    return (
      <div className="album-page-content">
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
      </div>
    )
  }

  return null
}

export function Album() {
  const pages = useMemo(() => buildPages(), [])
  const [currentPage, setCurrentPage] = useState(1)
  const [ready, setReady] = useState(false)
  const flipbookRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let isActive = true

    loadScript('codex-jquery', '/includes/flipbook/jquery.js')
      .then(() => loadScript('codex-turn', '/includes/flipbook/turn.js'))
      .then(() => {
        if (!isActive) return
        setReady(true)
      })
      .catch(() => {
        if (!isActive) return
        setReady(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (!ready || !flipbookRef.current || !viewportRef.current) return
    const $ = window.jQuery || window.$
    if (!$ || !$.fn || !$.fn.turn) return

    const $book = $(flipbookRef.current)
    if ($book.data('turn')) {
      $book.turn('destroy')
    }

    const computeSize = () => {
      const width = Math.min(viewportRef.current?.clientWidth ?? 960, 960)
      const safeWidth = Math.max(width, 320)
      const height = Math.max(360, safeWidth * 0.75)
      const display = safeWidth < 720 ? 'single' : 'double'
      return { width: safeWidth, height, display }
    }

    const applySize = () => {
      const { width, height, display } = computeSize()
      $book.turn('display', display)
      $book.turn('size', width, height)
    }

    const { width, height, display } = computeSize()
    $book.turn({
      width,
      height,
      display,
      autoCenter: true,
      duration: 1200,
      gradients: true,
      elevation: 50,
      when: {
        turned: (_event: unknown, page: number) => {
          setCurrentPage(page)
        },
      },
    })

    const resizeObserver = new ResizeObserver(() => applySize())
    resizeObserver.observe(viewportRef.current)

    return () => {
      resizeObserver.disconnect()
      if ($book.data('turn')) {
        $book.turn('destroy')
      }
    }
  }, [ready])

  const handlePrev = () => {
    const $ = window.jQuery || window.$
    if (!$ || !flipbookRef.current) return
    const $book = $(flipbookRef.current)
    if ($book.data('turn')) {
      $book.turn('previous')
    }
  }

  const handleNext = () => {
    const $ = window.jQuery || window.$
    if (!$ || !flipbookRef.current) return
    const $book = $(flipbookRef.current)
    if ($book.data('turn')) {
      $book.turn('next')
    }
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
              onClick={handlePrev}
              disabled={!ready}
            >
              Anterior
            </button>
            <div className="album-toolbar-page">
              Pagina {currentPage} / {pages.length}
            </div>
            <button
              type="button"
              className="button ghost"
              onClick={handleNext}
              disabled={!ready}
            >
              Proxima
            </button>
          </div>
        </div>

        <div className="album-viewport" ref={viewportRef}>
          <div className="album-flipbook" ref={flipbookRef}>
            {pages.map((page, index) => {
              const isHard = index === 0 || index === pages.length - 1
              return (
                <div
                  key={page.id}
                  className={`album-sheet ${isHard ? 'hard' : 'page'}`}
                >
                  {renderPageContent(page)}
                  <div className="album-page-number">{page.pageNumber}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
