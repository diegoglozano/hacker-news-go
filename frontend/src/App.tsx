import { useEffect, useState } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const PALETTE = ['#4269d0', '#efb118', '#ff725c', '#6cc5b0', '#3ca951', '#ff8ab7', '#a463f2', '#97bbf5', '#9c6b4e']

interface Cluster {
  title: string
  cluster: number
  label: string
  url: string | null
  score: number | null
  by: string | null
}

function TopicBlock({ label, stories, color }: { label: string; stories: Cluster[]; color: string }) {
  return (
    <div className="block" style={{ '--accent': color } as React.CSSProperties}>
      <h2>{label}</h2>
      <ul>
        {stories.map(s => (
          <li key={s.title}>
            <a href={s.url ?? undefined} target="_blank" rel="noreferrer">{s.title}</a>
            <span className="meta">{s.by && `${s.by} · `}{s.score ?? 0} pts</span>
          </li>
        ))}
      </ul>
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

  const groups = clusters.reduce((acc, d) => {
    (acc[d.label] ??= []).push(d)
    return acc
  }, {} as Record<string, Cluster[]>)

  const sorted = Object.entries(groups)
    .sort(([a], [b]) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b))

  const nonNoiseLabels = sorted.map(([l]) => l).filter(l => l !== 'Other')

  return (
    <>
      <h1>Hacker News</h1>
      {loading ? (
        <p className="loading">Loading…</p>
      ) : (
        <div className="grid">
          {sorted.map(([label, stories]) => (
            <TopicBlock
              key={label}
              label={label}
              stories={stories.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))}
              color={label === 'Other' ? '#555' : PALETTE[nonNoiseLabels.indexOf(label) % PALETTE.length]}
            />
          ))}
        </div>
      )}
    </>
  )
}
