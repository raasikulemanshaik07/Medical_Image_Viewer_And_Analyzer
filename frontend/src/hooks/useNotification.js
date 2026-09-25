/**
 * hooks/useNotification.js
 * -------------------------
 * Global toast notification system.
 * Components call show('message', 'success'|'error'|'warning'|'info').
 */
import { useState, useCallback } from 'react'

let _id = 0

export function useNotification() {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_id
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, show, dismiss }
}
