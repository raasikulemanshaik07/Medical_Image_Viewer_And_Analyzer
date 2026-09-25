/**
 * components/viewer/ViewerControls.jsx
 * ---------------------------------------
 * Bottom toolbar: zoom, rotation, brightness, contrast, invert, reset.
 * Appears as a floating control bar above the bottom of the viewer.
 */
import {
  ZoomIn, ZoomOut, Maximize2, RotateCw, RotateCcw,
  Sun, Contrast, Layers, RefreshCw, Eye, EyeOff,
} from 'lucide-react'

export default function ViewerControls({
  viewerState,
  hasImage,
  showProcessed,
  onToggleProcessed,
  hasProcessed,
}) {
  const {
    scale, zoomIn, zoomOut, setZoom,
    rotation, rotateCW, rotateCCW,
    brightness, setBrightness,
    contrast, setContrast,
    inverted, toggleInvert,
    reset,
  } = viewerState

  const disabled = !hasImage

  return (
    <div style={{
      height: 'var(--toolbar-h)',
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '0 16px',
      flexShrink: 0,
      overflowX: 'auto',
    }}>
      {/* ── Zoom controls ────────────────────────────────────────────────── */}
      <button id="btn-zoom-out" className="btn-icon" onClick={zoomOut} disabled={disabled} title="Zoom out">
        <ZoomOut size={15} />
      </button>

      <span style={{
        fontSize: '0.72rem', color: 'var(--text-secondary)',
        fontFamily: 'var(--font-mono)', minWidth: 42, textAlign: 'center',
      }}>
        {Math.round(scale * 100)}%
      </span>

      <button id="btn-zoom-in" className="btn-icon" onClick={zoomIn} disabled={disabled} title="Zoom in">
        <ZoomIn size={15} />
      </button>

      <button id="btn-fit" className="btn-icon" onClick={() => setZoom(1)} disabled={disabled} title="Reset zoom to 100%">
        <Maximize2 size={15} />
      </button>

      <div className="divider" style={{ width: 1, height: 24, margin: '0 6px', background: 'var(--border-subtle)' }} />

      {/* ── Rotation ─────────────────────────────────────────────────────── */}
      <button id="btn-rotate-ccw" className="btn-icon" onClick={rotateCCW} disabled={disabled} title="Rotate 90° counter-clockwise">
        <RotateCcw size={15} />
      </button>
      <button id="btn-rotate-cw" className="btn-icon" onClick={rotateCW} disabled={disabled} title="Rotate 90° clockwise">
        <RotateCw size={15} />
      </button>

      <div className="divider" style={{ width: 1, height: 24, margin: '0 6px', background: 'var(--border-subtle)' }} />

      {/* ── Brightness ───────────────────────────────────────────────────── */}
      <Sun size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          id="slider-brightness"
          type="range" min={0} max={300} step={5}
          value={brightness}
          onChange={(e) => setBrightness(Number(e.target.value))}
          disabled={disabled}
          title={`Brightness: ${brightness}%`}
          style={{ width: 90 }}
        />
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', minWidth: 32, fontFamily: 'var(--font-mono)' }}>
          {brightness}%
        </span>
      </div>

      <div className="divider" style={{ width: 1, height: 24, margin: '0 4px', background: 'var(--border-subtle)' }} />

      {/* ── Contrast ─────────────────────────────────────────────────────── */}
      <Contrast size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          id="slider-contrast"
          type="range" min={0} max={300} step={5}
          value={contrast}
          onChange={(e) => setContrast(Number(e.target.value))}
          disabled={disabled}
          title={`Contrast: ${contrast}%`}
          style={{ width: 90 }}
        />
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', minWidth: 32, fontFamily: 'var(--font-mono)' }}>
          {contrast}%
        </span>
      </div>

      <div className="divider" style={{ width: 1, height: 24, margin: '0 4px', background: 'var(--border-subtle)' }} />

      {/* ── Invert ───────────────────────────────────────────────────────── */}
      <button
        id="btn-invert"
        className={`btn-icon ${inverted ? 'active' : ''}`}
        onClick={toggleInvert}
        disabled={disabled}
        title={inverted ? 'Disable inversion' : 'Invert image'}
      >
        {inverted ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>

      {/* ── Processed toggle ─────────────────────────────────────────────── */}
      {hasProcessed && (
        <>
          <div className="divider" style={{ width: 1, height: 24, margin: '0 4px', background: 'var(--border-subtle)' }} />
          <button
            id="btn-toggle-processed"
            className={`btn btn-ghost ${showProcessed ? 'active' : ''}`}
            onClick={onToggleProcessed}
            style={{ fontSize: '0.73rem', padding: '5px 10px' }}
          >
            <Layers size={13} />
            {showProcessed ? 'Show Original' : 'Show Processed'}
          </button>
        </>
      )}

      {/* ── Reset ────────────────────────────────────────────────────────── */}
      <div style={{ marginLeft: 'auto' }}>
        <button
          id="btn-reset-viewer"
          className="btn btn-ghost"
          onClick={reset}
          disabled={disabled}
          style={{ fontSize: '0.73rem', padding: '5px 10px' }}
        >
          <RefreshCw size={13} />
          Reset
        </button>
      </div>
    </div>
  )
}
