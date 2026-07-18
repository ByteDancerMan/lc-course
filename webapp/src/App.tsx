import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Home from '@/pages/Home'
import SessionDetail from '@/pages/SessionDetail'
import SystemPage from '@/pages/SystemPage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sessions/:sessionId" element={<SessionDetail />} />
        <Route path="/system" element={<SystemPage />} />
      </Routes>
    </Router>
  )
}
