/**
 * components/upload/UploadZone.jsx
 * ---------------------------------
 * Drag-and-drop + click-to-browse file upload component.
 *
 * Features:
 *  - Accepts PNG, JPEG, JPG, TIFF via file dialog or drag-and-drop
 *  - Client-side validation (type + 50 MB limit) before network call
 *  - Upload progress bar (0–100 %)
 *  - Error display for rejected files
 *  - Calls onUploadSuccess(imageData) when the API responds 201
 *
 * Interview note: we validate on the client for fast UX feedback,
 * but the backend also validates independently (never trust the client).
 */
import { useState, useRef, useCallback } from 'react'
import { Upload, ImagePlus, FileX } from 'lucide-react'
import { uploadImage } from '../../services/api'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/tiff', 'image/tif']
const MAX_SIZE_MB   = 50
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export default function UploadZone({ onUploadSuccess, onError }) {
  const [dragOver,   setDragOver]   = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [localError, setLocalError] = useState(null)
  const inputRef = useRef(null)

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported file type: ${file.type || 'unknown'}. Please use PNG, JPEG, or TIFF.`
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_SIZE_MB} MB.`
    }
    if (file.size === 0) {
      return 'The selected file is empty.'
    }
    return null
  }

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    setLocalError(null)
    const err = validateFile(file)
    if (err) {
      setLocalError(err)
      onError?.(err)
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      const { data } = await uploadImage(file, setProgress)
      onUploadSuccess?.(data)
    } catch (e) {
      const msg = e.message || 'Upload failed. Please try again.'
      setLocalError(msg)
      onError?.(msg)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [onUploadSuccess, onError])

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); setDragOver(true) }
  const onDragLeave = ()  => setDragOver(false)
  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // ── File input ──────────────────────────────────────────────────────────────
  const onInputChange = (e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
    e.target.value = ''  // allow re-selecting the same file
  }

  return (
    <div>
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{ cursor: uploading ? 'default' : 'pointer' }}
        role="button"
        aria-label="Upload medical image"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.tif,.tiff"
          style={{ display: 'none' }}
          onChange={onInputChange}
          disabled={uploading}
        />

        {uploading ? (
          <>
            <div className="spinner" />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Uploading… {progress}%
            </p>
            <div className="progress-bar-track" style={{ width: '100%' }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <>
            <div className="drop-zone-icon">
              <ImagePlus size={36} />
            </div>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Drop image here or click to browse
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              PNG · JPEG · TIFF &nbsp;·&nbsp; Max {MAX_SIZE_MB} MB
            </p>
          </>
        )}
      </div>

      {localError && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '8px 12px', marginTop: 8,
          background: 'rgba(239,68,68,0.08)', borderRadius: 7,
          border: '1px solid rgba(239,68,68,0.25)',
        }}>
          <FileX size={14} color="var(--color-error)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{localError}</span>
        </div>
      )}
    </div>
  )
}
