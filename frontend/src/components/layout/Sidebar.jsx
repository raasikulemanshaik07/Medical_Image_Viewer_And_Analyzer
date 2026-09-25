/**
 * components/layout/Sidebar.jsx
 * ------------------------------
 * Left sidebar: upload button, image list, search.
 * Receives `images`, `selectedId`, `onSelect`, and upload callbacks.
 */
import { useState } from 'react'
import { Search, Upload, Activity, Clock } from 'lucide-react'
import UploadZone from '../upload/UploadZone'
import { imageFileUrl } from '../../services/api'
import { formatBytes, formatDate } from '../../utils/imageUtils'

export default function Sidebar({
  images,
  selectedId,
  onSelect,
  onUploadSuccess,
  onUploadError,
  loading,
}) {
  const [showUpload,   setShowUpload]   = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')

  const filtered = images.filter((img) =>
    img.filename.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleUploadSuccess = (data) => {
    setShowUpload(false)
    onUploadSuccess?.(data)
  }

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      minWidth: 'var(--sidebar-width)',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Activity size={16} color="var(--brand-primary)" />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em',
                       textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Image Library
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <span className="badge badge-brand">{images.length}</span>
        </span>
      </div>

      {/* ── Upload button ─────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          id="btn-upload-toggle"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => setShowUpload((v) => !v)}
        >
          <Upload size={14} />
          Upload Image
        </button>

        {showUpload && (
          <div style={{ marginTop: 12 }}>
            <UploadZone
              onUploadSuccess={handleUploadSuccess}
              onError={onUploadError}
            />
          </div>
        )}
      </div>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={13}
            style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
                     color: 'var(--text-muted)', pointerEvents: 'none' }}
          />
          <input
            id="search-images"
            type="text"
            placeholder="Search images…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px 6px 28px',
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
      </div>

      {/* ── Image list ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
            <span className="empty-state-sub">Loading images…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Clock size={32} /></div>
            <p className="empty-state-title">
              {searchQuery ? 'No results found' : 'No images yet'}
            </p>
            <p className="empty-state-sub">
              {searchQuery ? 'Try a different search term' : 'Upload your first image to get started'}
            </p>
          </div>
        ) : (
          filtered.map((img) => (
            <div
              key={img.image_id}
              id={`img-thumb-${img.image_id}`}
              className={`img-thumb ${selectedId === img.image_id ? 'selected' : ''}`}
              onClick={() => onSelect(img.image_id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(img.image_id)}
            >
              <img
                src={imageFileUrl(img.image_id)}
                alt={img.filename}
                className="img-thumb-preview"
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <div className="img-thumb-info">
                <p className="img-thumb-name" title={img.filename}>{img.filename}</p>
                <p className="img-thumb-meta">
                  {img.width}×{img.height} · {formatBytes(img.file_size)}
                </p>
                <p className="img-thumb-meta">{formatDate(img.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
