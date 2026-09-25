/**
 * App.jsx
 * --------
 * Root component. Provides:
 *  - The notification system (passed as prop to pages)
 *  - The Notification toast renderer (always visible, top-right)
 *  - Routing (currently just the Dashboard — NotFound for unknown paths)
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useNotification } from './hooks/useNotification'
import Notification from './components/common/Notification'
import Dashboard    from './pages/Dashboard'

function NotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 12,
    }}>
      <h1 style={{ fontSize: '3rem', color: 'var(--brand-primary)' }}>404</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Page not found.</p>
      <a href="/" style={{ color: 'var(--brand-primary)', fontSize: '0.85rem' }}>
        ← Go back to the viewer
      </a>
    </div>
  )
}

export default function App() {
  const { toasts, show, dismiss } = useNotification()

  return (
    <BrowserRouter>
      {/* Global toast notifications */}
      <Notification toasts={toasts} dismiss={dismiss} />

      <Routes>
        <Route path="/"  element={<Dashboard notify={show} />} />
        <Route path="*"  element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
