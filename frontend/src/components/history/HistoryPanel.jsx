/**
 * components/history/HistoryPanel.jsx
 * ---------------------------------------
 * Processing history timeline for the selected image.
 */
import { useEffect, useState } from 'react'
import { Clock, RefreshCw } from 'lucide-react'
import { getHistory } from '../../services/api'
import { operationLabel, formatDate } from '../../utils/imageUtils'

export default function HistoryPanel({ imageId }) {
  const [history, setHistory]  = useState([])
  const [loading, setLoading]  = useState(false)

  const load = async () => {
    if (!imageId) return
    setLoading(true)
    try {
      const { data } = await getHistory(imageId)
      setHistory(data.entries || [])
    } catch {
      setHistory([])
    } finally { setLoading(false) }
  }

  useEffect(() => { setHistory([]); load() }, [imageId])

  if (!imageId) return (
    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      Select an image to view its processing history.
    </p>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {history.length} operation{history.length !== 1 ? 's' : ''}
        </span>
        <button className="btn-icon" onClick={load} disabled={loading} title="Refresh history">
          <RefreshCw size={13} />
        </button>
      </div>

      {loading && <div className="spinner" style={{ margin: '12px auto' }} />}

      {!loading && history.length === 0 && (
        <div className="empty-state">
          <Clock size={24} className="empty-state-icon" />
          <p className="empty-state-sub">No processing operations yet.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {history.map((entry, i) => (
          <div key={entry.id} style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            {/* Timeline dot */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', marginTop: 4,
                background: 'var(--brand-primary)',
                boxShadow: '0 0 6px var(--brand-glow)',
              }} />
              {i < history.length - 1 && (
                <div style={{ width: 1, flex: 1, background: 'var(--border-subtle)', marginTop: 4, minHeight: 16 }} />
              )}
            </div>
            {/* Content */}
            <div style={{ flex: 1, paddingBottom: 8 }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                {operationLabel(entry.operation_name)}
              </p>
              {entry.parameters && Object.keys(entry.parameters).length > 0 && (
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {Object.entries(entry.parameters)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(' · ')}
                </p>
              )}
              <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {formatDate(entry.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
