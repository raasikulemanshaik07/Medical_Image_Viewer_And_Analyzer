/**
 * utils/imageUtils.js
 * --------------------
 * Pure utility functions for the image viewer.
 * No React dependencies — easy to unit-test.
 */

/** Format bytes into a human-readable string (e.g. "1.23 MB") */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

/** Format an ISO date string into a readable timestamp */
export function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Return a short display label for an operation name */
export function operationLabel(op) {
  const labels = {
    grayscale:             'Grayscale',
    gaussian_blur:         'Gaussian Blur',
    median_blur:           'Median Blur',
    histogram_equalization:'Histogram Equalization',
    canny_edge:            'Canny Edge Detection',
    threshold:             'Binary Threshold',
    erode:                 'Erosion',
    dilate:                'Dilation',
    morph_open:            'Morphological Open',
    morph_close:           'Morphological Close',
    brightness_contrast:   'Brightness & Contrast',
    invert:                'Invert',
  }
  return labels[op] || op
}

/**
 * Clamp a value between min and max.
 * Used when mapping ROI coordinates at different zoom levels.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Convert viewer canvas coordinates to image pixel coordinates.
 *
 * The viewer renders the image at a certain scale and offset (pan).
 * When the user draws an ROI on the canvas, we need to convert those
 * canvas pixel positions back to the original image pixels.
 *
 * @param {number} canvasX   - x coordinate on the canvas
 * @param {number} canvasY   - y coordinate on the canvas
 * @param {number} scale     - current zoom scale (1 = original size)
 * @param {number} offsetX   - horizontal pan offset applied to the image
 * @param {number} offsetY   - vertical pan offset applied to the image
 * @returns {{ x: number, y: number }}  image-space coordinates
 */
export function canvasToImageCoords(canvasX, canvasY, scale, offsetX, offsetY) {
  return {
    x: Math.round((canvasX - offsetX) / scale),
    y: Math.round((canvasY - offsetY) / scale),
  }
}
