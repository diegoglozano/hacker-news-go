import { useEffect, useRef, useState } from 'react'
import * as Plot from '@observablehq/plot'
import './App.css'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface Cluster {
  title: string
  cluster: number
  label: string
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

    const palette = ['#4269d0', '#efb118', '#ff725c', '#6cc5b0', '#3ca951', '#ff8ab7', '#a463f2', '#97bbf5', '#9c6b4e']
    const labels = [...new Set(data.map(d => d.label))]
    const nonNoiseLabels = labels.filter(l => l !== 'Other')
    const colorRange = labels.map(l =>
      l === 'Other' ? '#888888' : palette[nonNoiseLabels.indexOf(l) % palette.length]
    )

    const plot = Plot.plot({
      width: 800,
      height: 550,
      style: { background: 'transparent', color: '#e0e0e0', cursor: 'default' },
      marks: [
        Plot.dot(data, {
          x: 'x',
          y: 'y',
          fill: (d: Cluster) => d.label,
          r: 5,
          opacity: 0.8,
          tip: true,
          title: (d: Cluster) => d.by && d.score ? `${d.title}\n${d.by} · ${d.score} pts` : d.title,
          href: (d: Cluster) => d.url ?? undefined,
          target: '_blank',
        }),
      ],
      color: { domain: labels, range: colorRange, legend: true, label: 'Cluster' },
      x: { axis: null },
      y: { axis: null },
    })

    ref.current.replaceChildren(plot)
    return () => plot.remove()
  }, [data])

  return <div ref={ref} />
}

function Feed({ data }: { data: Cluster[] }) {
  const groups = data.reduce((acc, d) => {
    (acc[d.label] ??= []).push(d)
    return acc
  }, {} as Record<string, Cluster[]>)

  const sorted = Object.entries(groups).sort(([a], [b]) =>
    a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)
  )

  return (
    <div className="feed">
      {sorted.map(([label, stories]) => (
        <div key={label} className="feed-group">
          <h3>{label}</h3>
          <ul>
            {stories
              .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
              .map(s => (
                <li key={s.title}>
                  <a href={s.url ?? undefined} target="_blank" rel="noreferrer">{s.title}</a>
                  <span className="meta">{s.by && `${s.by} · `}{s.score ?? 0} pts</span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
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
      {loading ? (
        <p className="loading">Loading…</p>
      ) : (
        <>
          <div className="section">
            <h2>Story clusters</h2>
            <div className="plot-container">
              <ClusterPlot data={clusters} />
            </div>
          </div>
          <div className="section">
            <h2>Stories</h2>
            <Feed data={clusters} />
          </div>
        </>
      )}
    </>
  )
}
