import { useLocation } from 'react-router-dom'
import { TopBar } from '../components/TopBar'
import { BottomNav } from '../components/BottomNav'
import { AppRoutes } from './routes'

export function App() {
  const location = useLocation()
  const hideChrome = ['/login', '/criar-conta'].includes(location.pathname)

  return (
    <div className="app-shell vhs-frame">
      {hideChrome ? null : <TopBar />}
      <main className={hideChrome ? 'app-main auth-main' : 'app-main'}>
        <AppRoutes />
      </main>
      {hideChrome ? null : <BottomNav />}
    </div>
  )
}
