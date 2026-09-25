/**
 * components/viewer/ROIOverlay.jsx
 * ---------------------------------
 * Transparent SVG overlay for drawing and displaying the Region of Interest.
 *
 * Why SVG instead of Canvas:
 *  - SVG coordinates match the container coordinates directly.
 *  - The ROI rectangle can be styled with CSS (dashed border, fill).
 *  - No need to manage a 2D canvas context.
 *
 * The overlay covers the entire viewer container (position: absolute, full size).
 * Mouse events here are intercepted to draw the ROI; click-drag is handled by
 * the useROI hook in the parent.
 */
export default function ROIOverlay({
  containerWidth,
  containerHeight,
  previewRect,
  roi,
  viewerState,
  roiHook,
  imageSize,
  roiMode,
}) {
  const { scale, offsetX, offsetY } = viewerState
  const { startDraw, updateDraw, endDraw } = roiHook

  // Convert image-space ROI → canvas-space rect for rendering
  const imageToCanvas = (ix, iy) => ({
    cx: ix * scale + (containerWidth / 2 + offsetX - (imageSize?.width  || 0) * scale / 2),
    cy: iy * scale + (containerHeight / 2 + offsetY - (imageSize?.height || 0) * scale / 2),
  })

  const canvasRoi = roi && imageSize ? (() => {
    const tl = imageToCanvas(roi.x, roi.y)
    return {
      x:      tl.cx,
      y:      tl.cy,
      width:  roi.width  * scale,
      height: roi.height * scale,
    }
  })() : null

  const handleMouseDown = (e) => {
    if (!roiMode) return
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    startDraw(e.clientX - rect.left, e.clientY - rect.top)
  }
  const handleMouseMove = (e) => {
    if (!roiMode) return
    const rect = e.currentTarget.getBoundingClientRect()
    updateDraw(e.clientX - rect.left, e.clientY - rect.top)
  }
  const handleMouseUp = (e) => {
    if (!roiMode || !imageSize) return
    const rect = e.currentTarget.getBoundingClientRect()
    endDraw(
      e.clientX - rect.left, e.clientY - rect.top,
      scale, offsetX + (containerWidth  / 2 - (imageSize.width  || 0) * scale / 2),
             offsetY + (containerHeight / 2 - (imageSize.height || 0) * scale / 2),
      imageSize.width, imageSize.height
    )
  }

  return (
    <svg
      style={{
        position:    'absolute',
        top: 0, left: 0,
        width:       '100%',
        height:      '100%',
        cursor:      roiMode ? 'crosshair' : 'inherit',
        pointerEvents: roiMode ? 'all' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Live drawing rectangle */}
      {previewRect && previewRect.width > 0 && (
        <rect
          x={previewRect.x}    y={previewRect.y}
          width={previewRect.width} height={previewRect.height}
          fill="rgba(0,201,177,0.08)"
          stroke="var(--brand-primary)"
          strokeWidth={1.5}
          strokeDasharray="6 3"
        />
      )}

      {/* Confirmed ROI in image space → canvas space */}
      {canvasRoi && (
        <>
          <rect
            x={canvasRoi.x}    y={canvasRoi.y}
            width={canvasRoi.width} height={canvasRoi.height}
            fill="rgba(0,201,177,0.06)"
            stroke="var(--brand-primary)"
            strokeWidth={2}
          />
          {/* Corner handles */}
          {[
            [canvasRoi.x,                  canvasRoi.y],
            [canvasRoi.x + canvasRoi.width, canvasRoi.y],
            [canvasRoi.x,                  canvasRoi.y + canvasRoi.height],
            [canvasRoi.x + canvasRoi.width, canvasRoi.y + canvasRoi.height],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={4}
              fill="var(--brand-primary)" stroke="var(--bg-void)" strokeWidth={1.5} />
          ))}
          {/* Label */}
          <text
            x={canvasRoi.x + 4} y={canvasRoi.y - 5}
            fontSize={10} fill="var(--brand-primary)" fontFamily="var(--font-mono)"
          >
            ROI {roi.width}×{roi.height}px
          </text>
        </>
      )}
    </svg>
  )
}
