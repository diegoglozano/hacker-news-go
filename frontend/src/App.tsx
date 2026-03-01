import { useEffect, useRef, useState } from 'react'
import * as Plot from '@observablehq/plot'
import './App.css'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface Cluster {
  title: string
  cluster: number
  x: number
  y: number
  url: string | null
  score: number | null
  by: string | null
}

function ClusterPlot({ data }: { data: Cluster[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const plot = Plot.plot({
      width: 800,
      height: 550,
      style: { background: 'transparent', color: '#e0e0e0', cursor: 'default' },
      marks: [
        Plot.dot(data, {
          x: 'x',
          y: 'y',
          fill: (d: Cluster) => String(d.cluster),
          r: 5,
          opacity: 0.8,
          tip: true,
          title: (d: Cluster) => d.by && d.score ? `${d.title}\n${d.by} · ${d.score} pts` : d.title,
          href: 'url',
          target: '_blank',
        }),
      ],
      color: { legend: true, label: 'Cluster' },
      x: { axis: null },
      y: { axis: null },
    })

    ref.current.replaceChildren(plot)
    return () => plot.remove()
  }, [data])

  return <div ref={ref} />
}

export default function App() {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/clusters`)
      .then(r => r.json())
      .then(data => {
        setClusters(data)
        setLoading(false)
      })
  }, [])

  return (
    <>
      <h1>Hacker News</h1>
      <div className="section">
        <h2>Story clusters</h2>
        <div className="plot-container">
          {loading ? (
            <p className="loading">Loading…</p>
          ) : (
            <ClusterPlot data={clusters} />
          )}
        </div>
      </div>
    </>
  )
}
