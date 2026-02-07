import { TopBar } from '../components/TopBar'
import { BottomNav } from '../components/BottomNav'
import { AppRoutes } from './routes'

export function App() {
  return (
    <div className="app-shell vhs-frame">
      <TopBar />
      <main className="app-main">
        <AppRoutes />
      </main>
      <BottomNav />
    </div>
  )
}
