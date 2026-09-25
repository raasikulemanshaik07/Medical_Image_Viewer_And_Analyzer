/**
 * components/layout/RightPanel.jsx
 * ----------------------------------
 * Right sidebar with tabbed panels:
 *   - Info (Metadata)
 *   - Process (OpenCV)
 *   - Analyze (Statistics + Histogram + ROI)
 *   - History
 */
import { useState } from 'react'
import { Info, Cpu, BarChart2, Clock } from 'lucide-react'
import MetadataPanel   from '../metadata/MetadataPanel'
import ProcessingPanel from '../processing/ProcessingPanel'
import AnalysisPanel   from '../analysis/AnalysisPanel'
import HistoryPanel    from '../history/HistoryPanel'

const TABS = [
  { id: 'info',    label: 'Info',    icon: <Info    size={14} /> },
  { id: 'process', label: 'Process', icon: <Cpu     size={14} /> },
  { id: 'analyze', label: 'Analyze', icon: <BarChart2 size={14} /> },
  { id: 'history', label: 'History', icon: <Clock   size={14} /> },
]

export default function RightPanel({
  image,
  roi,
  onClearROI,
  onProcessed,
}) {
  const [tab, setTab] = useState('info')

  return (
    <aside style={{
      width: 'var(--right-panel-w)',
      minWidth: 'var(--right-panel-w)',
      background: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '10px 4px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t.id ? 'var(--brand-primary)' : 'transparent'}`,
              cursor: 'pointer',
              color: tab === t.id ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontSize: '0.62rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)',
              transition: 'color var(--transition-fast), border-color var(--transition-fast)',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Panel content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {tab === 'info'    && <MetadataPanel   imageId={image?.image_id} />}
        {tab === 'process' && (
          <ProcessingPanel
            imageId={image?.image_id}
            onProcessed={onProcessed}
            disabled={!image}
          />
        )}
        {tab === 'analyze' && (
          <AnalysisPanel
            imageId={image?.image_id}
            roi={roi}
            onClearROI={onClearROI}
            disabled={!image}
          />
        )}
        {tab === 'history' && <HistoryPanel imageId={image?.image_id} />}
      </div>
    </aside>
  )
}
