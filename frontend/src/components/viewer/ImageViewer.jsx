/**
 * components/viewer/ImageViewer.jsx
 * ----------------------------------
 * Central image display panel with zoom, pan, rotation.
 *
 * Implementation approach:
 *  - The image is rendered as an <img> element inside a scrollable container.
 *  - CSS `transform: scale() rotate() translate()` handles zoom/pan/rotation
 *    without canvas overhead — this is fine for display purposes.
 *  - CSS `filter` applies brightness/contrast/invert in real time.
 *  - Mouse wheel → zoom; click+drag → pan; the toolbar controls rotation.
 *  - The ROIOverlay canvas is rendered on top for ROI drawing (Phase 5).
 *
 * The viewer container uses `overflow: hidden` so the transformed image
 * can extend beyond bounds while the container clips it cleanly.
 */
import { useRef, useEffect, useCallback } from 'react'
import { imageFileUrl } from '../../services/api'

export default function ImageViewer({
  image,
  processedUrl,
  viewerState,
  showProcessed,
  children,  // ROIOverlay is passed as a child
}) {
  const containerRef = useRef(null)
  const isDragging   = useRef(false)
  const lastPos      = useRef({ x: 0, y: 0 })

  const { scale, offsetX, offsetY, rotation, cssFilter,
          zoomIn, zoomOut, setZoom, pan } = viewerState

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  const onWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    setZoom(scale + delta)
  }, [scale, setZoom])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  // ── Mouse pan ─────────────────────────────────────────────────────────────
  const onMouseDown = (e) => {
    if (e.button !== 0) return
    isDragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }
  const onMouseMove = (e) => {
    if (!isDragging.current) return
    pan(e.clientX - lastPos.current.x, e.clientY - lastPos.current.y)
    lastPos.current = { x: e.clientX, y: e.clientY }
  }
  const onMouseUp = () => { isDragging.current = false }

  if (!image) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)',
      }}>
        <div className="empty-state">
          <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <p className="empty-state-title">No image selected</p>
          <p className="empty-state-sub">Upload or select an image from the library</p>
        </div>
      </div>
    )
  }

  const src = showProcessed && processedUrl ? processedUrl : imageFileUrl(image.image_id)

  return (
    <div
      ref={containerRef}
      id="image-viewer-container"
      style={{
        flex: 1,
        overflow: 'hidden',
        background: 'var(--bg-void)',
        position: 'relative',
        cursor: isDragging.current ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* The image, transformed by zoom/pan/rotation */}
      <img
        id="viewer-image"
        src={src}
        alt={image.filename}
        draggable={false}
        style={{
          position:        'absolute',
          top:             '50%',
          left:            '50%',
          transform:       `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${scale}) rotate(${rotation}deg)`,
          filter:          cssFilter,
          maxWidth:        'none',
          transformOrigin: 'center center',
          transition:      isDragging.current ? 'none' : 'transform 50ms ease',
          imageRendering:  scale > 3 ? 'pixelated' : 'auto',
          pointerEvents:   'none',  // clicks pass through to the ROI overlay
        }}
        onError={(e) => {
          e.target.style.display = 'none'
        }}
      />

      {/* Scale indicator */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        border: '1px solid var(--border-subtle)', borderRadius: 20,
        padding: '3px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)',
        fontFamily: 'var(--font-mono)', pointerEvents: 'none',
      }}>
        {Math.round(scale * 100)}%
        {rotation !== 0 && <span style={{ marginLeft: 8 }}>{rotation}°</span>}
      </div>

      {/* Processed image badge */}
      {showProcessed && processedUrl && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }}>
          <span className="badge badge-info">Processed View</span>
        </div>
      )}

      {/* ROI overlay (passed as child) */}
      {children}
    </div>
  )
}
