/**
 * services/api.js
 * ---------------
 * Centralized Axios API client.
 *
 * Every backend call goes through this module so that:
 *  - The base URL is configured in one place.
 *  - Error responses are normalized before reaching components.
 *  - Timeouts and headers are set consistently.
 *
 * Interview note: This is the "service layer" pattern — UI components
 * call these functions and never construct URLs themselves.
 */
import axios from 'axios'

const BASE_URL = '/api'  // Vite proxy forwards this to http://localhost:8000

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,  // 30 s — image processing can take a moment
  headers: { 'Content-Type': 'application/json' },
})

// ── Response interceptor: normalize errors ────────────────────────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract the detail message from FastAPI's error body
    const detail =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred.'
    return Promise.reject(new Error(typeof detail === 'string' ? detail : JSON.stringify(detail)))
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────────────────────
export const checkHealth = () => client.get('/health', { baseURL: '/' })

// ─────────────────────────────────────────────────────────────────────────────
// Images
// ─────────────────────────────────────────────────────────────────────────────

/** Upload a File object; reports upload progress via onProgress(0–100) */
export const uploadImage = (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  return client.post('/images/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded / evt.total) * 100))
      }
    },
  })
}

/** Fetch the list of all uploaded images */
export const listImages = () => client.get('/images')

/** Fetch metadata for a single image */
export const getImage = (imageId) => client.get(`/images/${imageId}`)

/** Get the URL that serves the original image file (no axios needed — used as <img src>) */
export const imageFileUrl = (imageId) => `/api/images/${imageId}/file`

/** Get technical metadata */
export const getMetadata = (imageId) => client.get(`/images/${imageId}/metadata`)

// ─────────────────────────────────────────────────────────────────────────────
// Processing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply an OpenCV operation.
 * @param {string} imageId
 * @param {string} operation  — one of the VALID_OPERATIONS from schemas.py
 * @param {object} parameters — operation-specific params
 */
export const processImage = (imageId, operation, parameters = {}) =>
  client.post(`/images/${imageId}/process`, { operation, parameters })

/** URL to a previously processed image file */
export const processedFileUrl = (relativeUrl) => relativeUrl

// ─────────────────────────────────────────────────────────────────────────────
// Analysis
// ─────────────────────────────────────────────────────────────────────────────

export const analyzeStatistics = (imageId) =>
  client.post(`/images/${imageId}/analyze/statistics`)

export const analyzeROI = (imageId, roi) =>
  client.post(`/images/${imageId}/analyze/roi`, roi)

export const analyzeHistogram = (imageId, roi = null) =>
  client.post(`/images/${imageId}/analyze/histogram`, roi || undefined)

export const analyzeEdges = (imageId, threshold1 = 50, threshold2 = 150) =>
  client.post(`/images/${imageId}/analyze/edges`, null, {
    params: { threshold1, threshold2 },
  })

export const getHistory = (imageId) =>
  client.get(`/images/${imageId}/history`)
