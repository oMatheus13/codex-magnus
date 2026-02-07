import { useEffect, useRef } from 'react'
import { createPixiApp } from './pixiApp'

export function GameView() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const handle = createPixiApp(host)
    return () => {
      handle.destroy()
    }
  }, [])

  return <div className="game-view" ref={hostRef} />
}
