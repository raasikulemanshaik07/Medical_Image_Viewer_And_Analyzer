/**
 * components/common/Notification.jsx
 * ------------------------------------
 * Toast notification display rendered at the top-right of the screen.
 * Receives `toasts` array and `dismiss` callback from App context.
 */
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ICONS = {
  success: <CheckCircle size={16} color="var(--color-success)" />,
  error:   <XCircle    size={16} color="var(--color-error)"   />,
  warning: <AlertTriangle size={16} color="var(--color-warning)" />,
  info:    <Info       size={16} color="var(--color-info)"    />,
}

export default function Notification({ toasts, dismiss }) {
  if (!toasts.length) return null
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type} fade-in`}>
          {ICONS[t.type] || ICONS.info}
          <span className="toast-message">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
                     color: 'var(--text-muted)', flexShrink: 0, padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
