/**
 * components/analysis/AnalysisPanel.jsx
 * ----------------------------------------
 * Statistics + ROI analysis controls and results display.
 */
import { useState } from 'react'
import { BarChart2, Crosshair, Trash2 } from 'lucide-react'
import { analyzeStatistics, analyzeROI, analyzeEdges } from '../../services/api'
import Disclaimer from '../common/Disclaimer'
import Histogram from './Histogram'

export default function AnalysisPanel({ imageId, roi, onClearROI, disabled }) {
  const [stats,       setStats]       = useState(null)
  const [roiStats,    setRoiStats]    = useState(null)
  const [edgeMetrics, setEdgeMetrics] = useState(null)
  const [loading,     setLoading]     = useState(null)

  const runStats = async () => {
    if (!imageId || loading) return
    setLoading('stats')
    try {
      const { data } = await analyzeStatistics(imageId)
      setStats(data)
    } catch (e) {
      setStats({ error: e.message })
    } finally { setLoading(null) }
  }

  const runROI = async () => {
    if (!imageId || !roi || loading) return
    setLoading('roi')
    try {
      const { data } = await analyzeROI(imageId, roi)
      setRoiStats(data)
    } catch (e) {
      setRoiStats({ error: e.message })
    } finally { setLoading(null) }
  }

  const runEdges = async () => {
    if (!imageId || loading) return
    setLoading('edges')
    try {
      const { data } = await analyzeEdges(imageId)
      setEdgeMetrics(data)
    } catch (e) {
      setEdgeMetrics({ error: e.message })
    } finally { setLoading(null) }
  }

  const StatRows = ({ data, fields }) => (
    <div style={{ marginTop: 6 }}>
      {fields.map(([label, key, unit]) => (
        <div key={key} className="metric-row">
          <span className="metric-label">{label}</span>
          <span className="metric-value">
            {data[key] !== undefined ? `${typeof data[key] === 'number' ? data[key].toFixed(2) : data[key]}${unit || ''}` : '—'}
          </span>
        </div>
      ))}
      <div style={{ marginTop: 8 }}><Disclaimer compact /></div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Image Statistics ─────────────────────────────────────────────── */}
      <div>
        <button
          id="btn-analyze-stats"
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', marginBottom: 6 }}
          onClick={runStats}
          disabled={disabled || loading === 'stats'}
        >
          {loading === 'stats'
            ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Computing…</>
            : <><BarChart2 size={13} /> Image Statistics</>
          }
        </button>
        {stats?.error && <p style={{ fontSize: '0.72rem', color: 'var(--color-error)' }}>{stats.error}</p>}
        {stats && !stats.error && (
          <StatRows data={stats} fields={[
            ['Min Intensity',  'min_intensity', ''],
            ['Max Intensity',  'max_intensity', ''],
            ['Mean Intensity', 'mean_intensity', ''],
            ['Median',         'median_intensity', ''],
            ['Std Deviation',  'standard_deviation', ''],
            ['Dimensions',     null, ''],
          ].filter(([,k]) => k)} />
        )}
      </div>

      {/* ── ROI Analysis ─────────────────────────────────────────────────── */}
      <div className="divider" />
      <div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <button
            id="btn-analyze-roi"
            className="btn btn-ghost"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={runROI}
            disabled={disabled || !roi || loading === 'roi'}
          >
            {loading === 'roi'
              ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Computing…</>
              : <><Crosshair size={13} /> ROI Stats</>
            }
          </button>
          {roi && (
            <button className="btn-icon" onClick={onClearROI} title="Clear ROI">
              <Trash2 size={13} />
            </button>
          )}
        </div>
        {!roi && (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Draw an ROI on the image to enable ROI analysis.
          </p>
        )}
        {roiStats?.error && <p style={{ fontSize: '0.72rem', color: 'var(--color-error)' }}>{roiStats.error}</p>}
        {roiStats && !roiStats.error && (
          <StatRows data={roiStats} fields={[
            ['ROI Size',       null, ''],
            ['Pixel Count',    'pixel_count', ''],
            ['Min Intensity',  'min_intensity', ''],
            ['Max Intensity',  'max_intensity', ''],
            ['Mean Intensity', 'mean_intensity', ''],
            ['Std Deviation',  'standard_deviation', ''],
          ].filter(([,k]) => k)} />
        )}
      </div>

      {/* ── Histogram ────────────────────────────────────────────────────── */}
      <div className="divider" />
      {imageId && <Histogram imageId={imageId} roi={roi} />}

      {/* ── Edge Metrics ─────────────────────────────────────────────────── */}
      <div className="divider" />
      <div>
        <button
          id="btn-analyze-edges"
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', marginBottom: 6 }}
          onClick={runEdges}
          disabled={disabled || loading === 'edges'}
        >
          {loading === 'edges'
            ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Computing…</>
            : 'Edge Metrics'
          }
        </button>
        {edgeMetrics && !edgeMetrics.error && (
          <StatRows data={edgeMetrics} fields={[
            ['Total Pixels',  'total_pixels', ''],
            ['Edge Pixels',   'edge_pixels', ''],
            ['Edge %',        'edge_pixel_percentage', '%'],
          ]} />
        )}
      </div>
    </div>
  )
}
