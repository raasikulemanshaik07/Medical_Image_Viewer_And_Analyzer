/**
 * components/analysis/Histogram.jsx
 * -----------------------------------
 * Grayscale intensity histogram using Chart.js.
 *
 * Shows the distribution of pixel intensities (0–255).
 * Updates automatically when imageId or roi changes.
 *
 * Interview talking point:
 *   A histogram shows how pixel intensities are distributed.
 *   A narrow histogram → low-contrast image.
 *   A wide/flat histogram → high contrast image.
 *   Histogram equalization spreads this distribution towards uniformity.
 */
import { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Filler,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { analyzeHistogram } from '../../services/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Filler)

export default function Histogram({ imageId, roi }) {
  const [hist,    setHist]    = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchHistogram = async () => {
    if (!imageId) return
    setLoading(true)
    try {
      const { data } = await analyzeHistogram(imageId, roi || null)
      setHist(data)
    } catch {
      setHist(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setHist(null)  // reset on image change
  }, [imageId])

  const chartData = hist ? {
    labels: hist.bins,
    datasets: [{
      label: 'Pixel Count',
      data: hist.counts,
      backgroundColor: 'rgba(0,201,177,0.5)',
      borderColor:     'rgba(0,201,177,0.9)',
      borderWidth: 0,
      fill: true,
      barPercentage: 1.0,
      categoryPercentage: 1.0,
    }],
  } : null

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: { legend: { display: false }, tooltip: {
      callbacks: {
        title: (items) => `Intensity: ${items[0].label}`,
        label: (item)  => `Count: ${item.raw.toLocaleString()}`,
      },
    }},
    scales: {
      x: {
        ticks: { maxTicksLimit: 9, color: 'var(--text-muted)', font: { size: 10 } },
        grid:  { color: 'var(--border-subtle)' },
      },
      y: {
        ticks: { color: 'var(--text-muted)', font: { size: 10 }, maxTicksLimit: 5 },
        grid:  { color: 'var(--border-subtle)' },
      },
    },
  }

  return (
    <div>
      <button
        id="btn-load-histogram"
        className="btn btn-ghost"
        style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
        onClick={fetchHistogram}
        disabled={loading}
      >
        {loading
          ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Loading…</>
          : roi ? 'ROI Histogram' : 'Image Histogram'
        }
      </button>
      {hist && (
        <>
          <div style={{ height: 120, marginBottom: 4 }}>
            <Bar data={chartData} options={options} />
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            {hist.source === 'roi' ? 'ROI intensity distribution' : 'Full image intensity distribution'} · 256 bins
          </p>
        </>
      )}
    </div>
  )
}
