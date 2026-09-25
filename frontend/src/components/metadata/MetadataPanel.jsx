/**
 * components/metadata/MetadataPanel.jsx
 * ----------------------------------------
 * Displays technical image metadata retrieved from the backend.
 */
import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { getMetadata } from '../../services/api'
import { formatBytes, formatDate } from '../../utils/imageUtils'

export default function MetadataPanel({ imageId }) {
  const [meta,    setMeta]    = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!imageId) { setMeta(null); return }
    setLoading(true)
    getMetadata(imageId)
      .then(({ data }) => setMeta(data))
      .catch(() => setMeta(null))
      .finally(() => setLoading(false))
  }, [imageId])

  if (!imageId) return (
    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '8px 0' }}>
      Select an image to view metadata.
    </p>
  )

  if (loading) return <div className="spinner" style={{ margin: '12px auto' }} />

  if (!meta) return (
    <p style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>
      Failed to load metadata.
    </p>
  )

  const rows = [
    ['Filename',   meta.filename],
    ['Format',     meta.file_format],
    ['Dimensions', `${meta.width} × ${meta.height} px`],
    ['Channels',   meta.channels],
    ['Color Mode', meta.color_mode],
    ['File Size',  meta.file_size_human],
    ['Uploaded',   formatDate(meta.created_at)],
  ]

  return (
    <div>
      {rows.map(([label, value]) => (
        <div key={label} className="metric-row">
          <span className="metric-label">{label}</span>
          <span className="metric-value">{value ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}
