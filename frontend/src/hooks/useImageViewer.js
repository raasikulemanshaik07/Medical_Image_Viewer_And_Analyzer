/**
 * hooks/useImageViewer.js
 * -----------------------
 * All state and logic for the image viewer canvas:
 *   - zoom (scale)
 *   - pan (offsetX, offsetY)
 *   - rotation
 *   - brightness and contrast (applied via CSS filter on the canvas image)
 *   - inversion flag
 *
 * We keep viewer state here (not in a global store) so the viewer
 * component stays declarative — it just renders what this hook provides.
 *
 * Interview talking point:
 *   CSS `filter: brightness() contrast() invert()` gives us real-time
 *   interactive adjustments without any backend round-trips.
 *   For permanent processing (e.g. saving a processed image) we still
 *   call the OpenCV backend.
 */
import { useState, useCallback } from 'react'

const ZOOM_STEP  = 0.15
const ZOOM_MIN   = 0.1
const ZOOM_MAX   = 10
const ZOOM_FIT   = 1.0   // "fit" means scale=1 initially; fit-to-screen is calculated in the viewer

export function useImageViewer() {
  const [scale,      setScale]      = useState(1)
  const [offsetX,    setOffsetX]    = useState(0)
  const [offsetY,    setOffsetY]    = useState(0)
  const [rotation,   setRotation]   = useState(0)   // degrees: 0, 90, 180, 270
  const [brightness, setBrightness] = useState(100) // CSS percentage, 100 = normal
  const [contrast,   setContrast]   = useState(100) // CSS percentage, 100 = normal
  const [inverted,   setInverted]   = useState(false)

  // ── Zoom ────────────────────────────────────────────────────────────────────
  const zoomIn  = useCallback(() => setScale((s) => Math.min(s + ZOOM_STEP, ZOOM_MAX)), [])
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - ZOOM_STEP, ZOOM_MIN)), [])

  const setZoom = useCallback((newScale) => {
    setScale(Math.min(Math.max(newScale, ZOOM_MIN), ZOOM_MAX))
  }, [])

  // ── Pan ──────────────────────────────────────────────────────────────────────
  const pan = useCallback((dx, dy) => {
    setOffsetX((x) => x + dx)
    setOffsetY((y) => y + dy)
  }, [])

  // ── Rotation ─────────────────────────────────────────────────────────────────
  const rotateCW  = useCallback(() => setRotation((r) => (r + 90) % 360), [])
  const rotateCCW = useCallback(() => setRotation((r) => (r - 90 + 360) % 360), [])

  // ── Image adjustments ────────────────────────────────────────────────────────
  const toggleInvert = useCallback(() => setInverted((v) => !v), [])

  // ── CSS filter string (applied to the <img> element) ─────────────────────────
  // This gives instant feedback without a backend call.
  const cssFilter = [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    inverted ? 'invert(1)' : '',
  ].filter(Boolean).join(' ')

  // ── Reset ────────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setScale(1)
    setOffsetX(0)
    setOffsetY(0)
    setRotation(0)
    setBrightness(100)
    setContrast(100)
    setInverted(false)
  }, [])

  return {
    // state
    scale, offsetX, offsetY, rotation,
    brightness, contrast, inverted,
    cssFilter,
    // actions
    zoomIn, zoomOut, setZoom,
    pan,
    rotateCW, rotateCCW,
    setBrightness, setContrast,
    toggleInvert,
    reset,
  }
}
