import { Container, Graphics } from 'pixi.js'

export const BOARD_TILE_SIZE = 32
export const BOARD_TILE_GAP = 6
export const BOARD_TILE_COUNT = 200

export function createBoard(): Container {
  const container = new Container()

  for (let i = 0; i < BOARD_TILE_COUNT; i += 1) {
    const tile = new Graphics()
    const isAlt = i % 2 === 0
    tile.lineStyle(2, 0x2bffd1, 0.8)
    tile.beginFill(isAlt ? 0x101320 : 0x0d0f1a)
    tile.drawRect(0, 0, BOARD_TILE_SIZE, BOARD_TILE_SIZE)
    tile.endFill()

    tile.x = i * (BOARD_TILE_SIZE + BOARD_TILE_GAP)
    tile.y = 0
    container.addChild(tile)
  }

  return container
}
