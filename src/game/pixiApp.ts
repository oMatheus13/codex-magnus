import { Application, Container } from 'pixi.js'
import { createBoard, BOARD_TILE_SIZE } from './boardRenderer'
import { createPawn } from './pawn'

export type PixiHandle = {
  app: Application
  destroy: () => void
}

export function createPixiApp(host: HTMLDivElement): PixiHandle {
  const app = new Application({
    resizeTo: host,
    backgroundColor: 0x0b0b13,
    antialias: false,
    autoDensity: true,
  })

  host.appendChild(app.view as HTMLCanvasElement)

  const world = new Container()
  app.stage.addChild(world)

  const board = createBoard()
  world.addChild(board)

  const pawn = createPawn()
  pawn.position.set(BOARD_TILE_SIZE * 0.5, BOARD_TILE_SIZE * 0.5)
  world.addChild(pawn)

  app.ticker.add(() => {
    pawn.y = BOARD_TILE_SIZE * 0.5 + Math.sin(performance.now() / 250) * 2
  })

  return {
    app,
    destroy: () => {
      app.destroy(true)
      host.textContent = ''
    },
  }
}
