import { useEffect, useRef, useState } from 'react'
import * as Plot from '@observablehq/plot'
import './App.css'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface Story {
  id: number
  by: string
  title: string
  score: number
  url: string | null
  time: number
  descendants: number | null
}

interface Cluster {
  title: string
  cluster: number
  x: number
  y: number
}

function ClusterPlot({ data }: { data: Cluster[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const plot = Plot.plot({
      width: 800,
      height: 500,
      style: { background: 'transparent', color: '#e0e0e0' },
      marks: [
        Plot.dot(data, {
          x: 'x',
          y: 'y',
          fill: (d: Cluster) => String(d.cluster),
          r: 5,
          opacity: 0.8,
          tip: true,
          title: 'title',
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
  const [stories, setStories] = useState<Story[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/stories`).then(r => r.json()),
      fetch(`${API}/clusters`).then(r => r.json()),
    ]).then(([s, c]) => {
      setStories(s)
      setClusters(c)
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

      <div className="section">
        <h2>Top stories</h2>
        {loading ? (
          <p className="loading">Loading…</p>
        ) : (
          <div className="stories-list">
            {stories.map(s => (
              <div className="story" key={s.id}>
                <span className="story-score">{s.score}</span>
                {s.url ? (
                  <a className="story-title" href={s.url} target="_blank" rel="noreferrer">
                    {s.title}
                  </a>
                ) : (
                  <span className="story-title">{s.title}</span>
                )}
                <span className="story-by">{s.by}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
