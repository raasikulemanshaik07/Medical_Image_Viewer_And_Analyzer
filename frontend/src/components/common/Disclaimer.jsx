/**
 * components/common/Disclaimer.jsx
 * ----------------------------------
 * Medical safety disclaimer shown wherever analysis results appear.
 * This is required by the project specification to make clear that
 * results are experimental image-processing metrics, not diagnoses.
 */
import { AlertTriangle } from 'lucide-react'

export default function Disclaimer({ text, compact = false }) {
  const msg = text || (
    'RESEARCH PROTOTYPE ONLY — Results are experimental image-processing ' +
    'metrics. They have no clinical validity and must not be used for ' +
    'medical diagnosis or treatment decisions.'
  )
  if (compact) {
    return (
      <p style={{ fontSize: '0.68rem', color: 'var(--color-warning)', opacity: 0.75 }}>
        ⚠ {msg}
      </p>
    )
  }
  return (
    <div className="disclaimer">
      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{msg}</span>
    </div>
  )
}
