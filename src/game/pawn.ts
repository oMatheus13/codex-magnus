import { Graphics } from 'pixi.js'

export function createPawn(): Graphics {
  const pawn = new Graphics()
  pawn.lineStyle(2, 0xffffff, 0.9)
  pawn.beginFill(0xff4fd8)
  pawn.drawCircle(0, 0, 10)
  pawn.endFill()
  return pawn
}
