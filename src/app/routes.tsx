import { Navigate, Route, Routes } from 'react-router-dom'
import { Today } from '../pages/Today'
import { Board } from '../pages/Board'
import { Workshop } from '../pages/Workshop'
import { History } from '../pages/History'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Today />} />
      <Route path="/board" element={<Board />} />
      <Route path="/workshop" element={<Workshop />} />
      <Route path="/history" element={<History />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
