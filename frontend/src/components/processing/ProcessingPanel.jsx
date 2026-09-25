/**
 * components/processing/ProcessingPanel.jsx
 * ------------------------------------------
 * OpenCV processing controls in the right panel.
 * Each operation has its own parameter controls.
 */
import { useState } from 'react'
import { Cpu, ChevronDown, ChevronUp, Loader } from 'lucide-react'
import { processImage } from '../../services/api'
import { operationLabel } from '../../utils/imageUtils'

const OPERATIONS = [
  {
    id: 'grayscale',
    params: [],
  },
  {
    id: 'gaussian_blur',
    params: [{ key: 'kernel_size', label: 'Kernel Size', type: 'select', options: [3,5,7,9,11], default: 5 }],
  },
  {
    id: 'median_blur',
    params: [{ key: 'kernel_size', label: 'Kernel Size', type: 'select', options: [3,5,7,9,11], default: 5 }],
  },
  {
    id: 'histogram_equalization',
    params: [],
  },
  {
    id: 'canny_edge',
    params: [
      { key: 'threshold1', label: 'Lower Threshold', type: 'range', min: 0, max: 255, default: 50 },
      { key: 'threshold2', label: 'Upper Threshold', type: 'range', min: 0, max: 255, default: 150 },
    ],
  },
  {
    id: 'threshold',
    params: [{ key: 'threshold_value', label: 'Threshold', type: 'range', min: 0, max: 255, default: 127 }],
  },
  {
    id: 'erode',
    params: [
      { key: 'kernel_size', label: 'Kernel Size', type: 'select', options: [3,5,7,9], default: 5 },
      { key: 'iterations', label: 'Iterations',  type: 'range', min: 1, max: 5, default: 1 },
    ],
  },
  {
    id: 'dilate',
    params: [
      { key: 'kernel_size', label: 'Kernel Size', type: 'select', options: [3,5,7,9], default: 5 },
      { key: 'iterations', label: 'Iterations',  type: 'range', min: 1, max: 5, default: 1 },
    ],
  },
  {
    id: 'morph_open',
    params: [{ key: 'kernel_size', label: 'Kernel Size', type: 'select', options: [3,5,7,9], default: 5 }],
  },
  {
    id: 'morph_close',
    params: [{ key: 'kernel_size', label: 'Kernel Size', type: 'select', options: [3,5,7,9], default: 5 }],
  },
  {
    id: 'brightness_contrast',
    params: [
      { key: 'alpha', label: 'Contrast (α)', type: 'range', min: 0.1, max: 3.0, step: 0.1, default: 1.0 },
      { key: 'beta',  label: 'Brightness (β)', type: 'range', min: -100, max: 100, step: 5, default: 0 },
    ],
  },
  {
    id: 'invert',
    params: [],
  },
]

function buildDefaults(params) {
  return Object.fromEntries(params.map((p) => [p.key, p.default]))
}

export default function ProcessingPanel({ imageId, onProcessed, disabled }) {
  const [expanded,  setExpanded]  = useState(null)
  const [paramVals, setParamVals] = useState({})
  const [loading,   setLoading]   = useState(null)

  const getVal = (opId, param) =>
    paramVals[opId]?.[param.key] ?? param.default

  const setVal = (opId, key, val) =>
    setParamVals((prev) => ({
      ...prev,
      [opId]: { ...(prev[opId] || {}), [key]: val },
    }))

  const apply = async (op) => {
    if (!imageId || loading) return
    const params = Object.fromEntries(
      op.params.map((p) => [p.key, getVal(op.id, p)])
    )
    setLoading(op.id)
    try {
      const { data } = await processImage(imageId, op.id, params)
      onProcessed?.(data)
    } catch (e) {
      onProcessed?.({ error: e.message })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {OPERATIONS.map((op) => {
        const isOpen = expanded === op.id
        const isBusy = loading === op.id
        return (
          <div key={op.id} style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            overflow: 'hidden',
            background: isOpen ? 'var(--bg-elevated)' : 'transparent',
            transition: 'background var(--transition-fast)',
          }}>
            {/* Header */}
            <button
              id={`op-${op.id}`}
              onClick={() => setExpanded(isOpen ? null : op.id)}
              disabled={disabled}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px', background: 'none', border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                color: isOpen ? 'var(--brand-primary)' : 'var(--text-secondary)',
                fontSize: '0.78rem', fontWeight: 500, fontFamily: 'var(--font-sans)',
                transition: 'color var(--transition-fast)',
              }}
            >
              <span>{operationLabel(op.id)}</span>
              {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Parameters + Apply button */}
            {isOpen && (
              <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {op.params.map((param) => (
                  <div key={param.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {param.label}
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                        {getVal(op.id, param)}
                      </span>
                    </div>
                    {param.type === 'range' ? (
                      <input
                        type="range"
                        min={param.min} max={param.max} step={param.step || 1}
                        value={getVal(op.id, param)}
                        onChange={(e) => setVal(op.id, param.key, Number(e.target.value))}
                      />
                    ) : (
                      <select
                        value={getVal(op.id, param)}
                        onChange={(e) => setVal(op.id, param.key, Number(e.target.value))}
                        style={{
                          width: '100%', padding: '5px 8px',
                          background: 'var(--bg-overlay)', border: '1px solid var(--border-default)',
                          borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.78rem',
                          fontFamily: 'var(--font-sans)', cursor: 'pointer',
                        }}
                      >
                        {param.options.map((v) => (
                          <option key={v} value={v}>{v}×{v}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}

                <button
                  id={`btn-apply-${op.id}`}
                  className="btn btn-primary"
                  style={{ justifyContent: 'center' }}
                  onClick={() => apply(op)}
                  disabled={isBusy || disabled}
                >
                  {isBusy ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Applying…</> : 'Apply'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
