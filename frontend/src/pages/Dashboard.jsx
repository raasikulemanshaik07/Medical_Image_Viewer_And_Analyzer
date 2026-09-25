/**
 * pages/Dashboard.jsx
 * --------------------
 * Main application page.
 *
 * Orchestrates all panels:
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │ Header                                                       │
 *  ├──────────────┬──────────────────────────────┬───────────────┤
 *  │ Sidebar      │ ImageViewer + ROIOverlay      │ RightPanel    │
 *  │ (image list) │ (centre, fills all space)     │ (tabs)        │
 *  ├──────────────┴──────────────────────────────┴───────────────┤
 *  │ ViewerControls toolbar                                       │
 *  └─────────────────────────────────────────────────────────────┘
 *
 * State management:
 *  - images[]      — list of all uploaded images (fetched on mount + after uploads)
 *  - selectedId    — which image is shown in the viewer
 *  - processedUrl  — URL of the last processed image (cleared on image change)
 *  - roiMode       — whether the user is currently drawing an ROI
 *
 * We keep all global state here and pass it down as props ("prop drilling").
 * For a larger application you would use Context or Zustand, but for this
 * portfolio project prop drilling is intentional — it's easy to follow and
 * explain in an interview.
 */
import { useEffect, useState, useRef } from 'react'
import { Crosshair, Activity, Stethoscope } from 'lucide-react'
import Sidebar        from '../components/layout/Sidebar'
import RightPanel     from '../components/layout/RightPanel'
import ImageViewer    from '../components/viewer/ImageViewer'
import ViewerControls from '../components/viewer/ViewerControls'
import ROIOverlay     from '../components/viewer/ROIOverlay'
import { useImageViewer } from '../hooks/useImageViewer'
import { useROI }         from '../hooks/useROI'
import { listImages, getImage } from '../services/api'

export default function Dashboard({ notify }) {
  const [images,        setImages]        = useState([])
  const [selectedId,    setSelectedId]    = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [processedUrl,  setProcessedUrl]  = useState(null)
  const [showProcessed, setShowProcessed] = useState(false)
  const [loadingImages, setLoadingImages] = useState(false)
  const [roiMode,       setRoiMode]       = useState(false)

  // Viewer dimensions for ROI overlay coordinate math
  const viewerRef    = useRef(null)
  const [viewerSize, setViewerSize] = useState({ width: 800, height: 600 })

  const viewerState = useImageViewer()
  const roiHook     = useROI()

  // ── Load image list ──────────────────────────────────────────────────────
  const loadImages = async () => {
    setLoadingImages(true)
    try {
      const { data } = await listImages()
      setImages(data.images || [])
    } catch {
      notify('Failed to load image list.', 'error')
    } finally { setLoadingImages(false) }
  }

  useEffect(() => { loadImages() }, [])

  // ── Select image ─────────────────────────────────────────────────────────
  const selectImage = async (id) => {
    setSelectedId(id)
    setProcessedUrl(null)
    setShowProcessed(false)
    roiHook.clearROI()
    viewerState.reset()
    try {
      const { data } = await getImage(id)
      setSelectedImage(data)
    } catch {
      notify('Failed to load image details.', 'error')
    }
  }

  // ── After upload ─────────────────────────────────────────────────────────
  const handleUploadSuccess = async (data) => {
    notify(`"${data.filename}" uploaded successfully.`, 'success')
    await loadImages()
    selectImage(data.image_id)
  }

  // ── After processing ─────────────────────────────────────────────────────
  const handleProcessed = (data) => {
    if (data.error) {
      notify(`Processing failed: ${data.error}`, 'error')
      return
    }
    setProcessedUrl(data.processed_image_url)
    setShowProcessed(true)
    notify(`${data.operation} applied successfully.`, 'success')
  }

  // ── Track viewer container size for ROI overlay ──────────────────────────
  useEffect(() => {
    const el = viewerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      setViewerSize({
        width:  entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{
        height: 'var(--header-h)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--brand-glow)',
            border: '1px solid var(--border-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={16} color="var(--brand-primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Medical Image Viewer
            </h1>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Research Prototype · Not for Clinical Use
            </p>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* ROI Mode toggle */}
          <button
            id="btn-roi-mode"
            className={`btn btn-ghost ${roiMode ? 'active' : ''}`}
            onClick={() => setRoiMode((v) => !v)}
            disabled={!selectedImage}
            style={{
              fontSize: '0.75rem',
              ...(roiMode ? {
                background: 'var(--brand-glow)',
                borderColor: 'var(--border-brand)',
                color: 'var(--brand-primary)',
              } : {})
            }}
          >
            <Crosshair size={13} />
            {roiMode ? 'Drawing ROI…' : 'Draw ROI'}
          </button>

          <span className="badge badge-warning" style={{ fontSize: '0.62rem' }}>
            <Stethoscope size={10} style={{ marginRight: 3 }} />
            Educational Use Only
          </span>
        </div>
      </header>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left sidebar */}
        <Sidebar
          images={images}
          selectedId={selectedId}
          onSelect={selectImage}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={(msg) => notify(msg, 'error')}
          loading={loadingImages}
        />

        {/* Centre: viewer + toolbar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div ref={viewerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <ImageViewer
              image={selectedImage}
              processedUrl={processedUrl}
              viewerState={viewerState}
              showProcessed={showProcessed}
            >
              {selectedImage && (
                <ROIOverlay
                  containerWidth={viewerSize.width}
                  containerHeight={viewerSize.height}
                  previewRect={roiHook.previewRect}
                  roi={roiHook.roi}
                  viewerState={viewerState}
                  roiHook={roiHook}
                  imageSize={{ width: selectedImage.width, height: selectedImage.height }}
                  roiMode={roiMode}
                />
              )}
            </ImageViewer>
          </div>

          <ViewerControls
            viewerState={viewerState}
            hasImage={!!selectedImage}
            showProcessed={showProcessed}
            onToggleProcessed={() => setShowProcessed((v) => !v)}
            hasProcessed={!!processedUrl}
          />
        </div>

        {/* Right panel */}
        <RightPanel
          image={selectedImage}
          roi={roiHook.roi}
          onClearROI={roiHook.clearROI}
          onProcessed={handleProcessed}
        />
      </div>
    </div>
  )
}
