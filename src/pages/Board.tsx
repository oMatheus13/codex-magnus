import { GameView } from '../game/GameView'

export function Board() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Iter Vitus</h1>
        <p>Visualize o percurso e a posicao do peao.</p>
      </header>
      <GameView />
    </div>
  )
}
