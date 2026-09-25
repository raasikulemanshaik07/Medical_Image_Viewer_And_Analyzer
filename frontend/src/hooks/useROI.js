/**
 * hooks/useROI.js
 * ---------------
 * State and logic for drawing a rectangular Region of Interest
 * on top of the image viewer.
 *
 * Coordinate mapping is the trickiest part of this feature.
 * The user draws on a canvas that may be scaled (zoom) and panned,
 * so we must convert canvas-space mouse positions to image-space pixels
 * before sending them to the backend.
 *
 * See utils/imageUtils.js → canvasToImageCoords() for the formula.
 */
import { useState, useCallback } from 'react'
import { canvasToImageCoords, clamp } from '../utils/imageUtils'

export function useROI() {
  const [roi, setRoi]           = useState(null)     // { x, y, width, height } in image pixels
  const [drawing, setDrawing]   = useState(false)
  const [startPt, setStartPt]   = useState(null)     // canvas-space start point
  const [previewRect, setPreviewRect] = useState(null) // canvas-space rect for drawing the overlay

  /**
   * Called on mousedown on the viewer canvas.
   * Stores the canvas-space start point.
   */
  const startDraw = useCallback((canvasX, canvasY) => {
    setDrawing(true)
    setStartPt({ x: canvasX, y: canvasY })
    setPreviewRect({ x: canvasX, y: canvasY, width: 0, height: 0 })
  }, [])

  /**
   * Called on mousemove while drawing.
   * Updates the preview rectangle (canvas-space, for rendering).
   */
  const updateDraw = useCallback((canvasX, canvasY) => {
    if (!drawing || !startPt) return
    setPreviewRect({
      x:      Math.min(startPt.x, canvasX),
      y:      Math.min(startPt.y, canvasY),
      width:  Math.abs(canvasX - startPt.x),
      height: Math.abs(canvasY - startPt.y),
    })
  }, [drawing, startPt])

  /**
   * Called on mouseup.
   * Converts the canvas-space rectangle to image-space coordinates
   * and stores the final ROI.
   *
   * @param {number} canvasX   - final mouse x in canvas pixels
   * @param {number} canvasY   - final mouse y in canvas pixels
   * @param {number} scale     - current zoom scale
   * @param {number} offsetX   - current horizontal pan offset
   * @param {number} offsetY   - current vertical pan offset
   * @param {number} imgWidth  - original image width in pixels
   * @param {number} imgHeight - original image height in pixels
   */
  const endDraw = useCallback((canvasX, canvasY, scale, offsetX, offsetY, imgWidth, imgHeight) => {
    if (!drawing || !startPt) return
    setDrawing(false)

    // Convert both corners to image space
    const topLeft = canvasToImageCoords(
      Math.min(startPt.x, canvasX),
      Math.min(startPt.y, canvasY),
      scale, offsetX, offsetY
    )
    const bottomRight = canvasToImageCoords(
      Math.max(startPt.x, canvasX),
      Math.max(startPt.y, canvasY),
      scale, offsetX, offsetY
    )

    // Clamp to image boundaries
    const x      = clamp(topLeft.x,     0, imgWidth  - 1)
    const y      = clamp(topLeft.y,     0, imgHeight - 1)
    const width  = clamp(bottomRight.x - x, 1, imgWidth  - x)
    const height = clamp(bottomRight.y - y, 1, imgHeight - y)

    if (width < 5 || height < 5) {
      // Ignore tiny accidental clicks
      setStartPt(null)
      setPreviewRect(null)
      return
    }

    setRoi({ x, y, width, height })
    setStartPt(null)
  }, [drawing, startPt])

  const clearROI = useCallback(() => {
    setRoi(null)
    setPreviewRect(null)
    setStartPt(null)
    setDrawing(false)
  }, [])

  return {
    roi,
    drawing,
    previewRect,
    startDraw,
    updateDraw,
    endDraw,
    clearROI,
  }
}
