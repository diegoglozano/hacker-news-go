import { useEffect, useRef, useState } from 'react'
import * as Plot from '@observablehq/plot'
import { hierarchy, treemap } from 'd3'
import './App.css'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const PALETTE = ['#4269d0', '#efb118', '#ff725c', '#6cc5b0', '#3ca951', '#ff8ab7', '#a463f2', '#97bbf5', '#9c6b4e']

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

interface Group {
  label: string
  stories: Cluster[]
  color: string
}

function getGroups(clusters: Cluster[]): Group[] {
  const map = clusters.reduce((acc, d) => {
    (acc[d.label] ??= []).push(d)
    return acc
  }, {} as Record<string, Cluster[]>)

  const entries = Object.entries(map)
    .sort(([a], [b]) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b))

  const nonNoise = entries.map(([l]) => l).filter(l => l !== 'Other')

  return entries.map(([label, stories]) => ({
    label,
    stories: [...stories].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    color: label === 'Other' ? '#555' : PALETTE[nonNoise.indexOf(label) % PALETTE.length],
  }))
}

interface TreeNode {
  label?: string
  value?: number
  color?: string
  children?: TreeNode[]
}

function Treemap({ groups }: { groups: Group[] }) {
  const W = 800, H = 480

  const root = hierarchy<TreeNode>({
    children: groups.map(g => ({ label: g.label, value: g.stories.length, color: g.color })),
  }).sum(d => d.value ?? 0)

  treemap<TreeNode>().size([W, H]).padding(3)(root)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {root.leaves().map(node => {
        const n = node as typeof node & { x0: number; x1: number; y0: number; y1: number }
        const w = n.x1 - n.x0
        const h = n.y1 - n.y0
        return (
          <g key={n.data.label} transform={`translate(${n.x0},${n.y0})`}>
            <rect width={w} height={h} fill={n.data.color} opacity={0.85} rx={3} />
            {w > 60 && h > 28 && (
              <text x={8} y={20} fill="#fff" fontSize={11} fontWeight={600} style={{ pointerEvents: 'none' }}>
                {n.data.label}
              </text>
            )}
            {w > 60 && h > 44 && (
              <text x={8} y={36} fill="rgba(255,255,255,0.5)" fontSize={10} style={{ pointerEvents: 'none' }}>
                {n.data.value} stories
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function BubbleChart({ groups }: { groups: Group[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const centroids = groups.map(g => ({
      label: g.label,
      x: g.stories.reduce((s, d) => s + d.x, 0) / g.stories.length,
      y: g.stories.reduce((s, d) => s + d.y, 0) / g.stories.length,
      count: g.stories.length,
      r: Math.sqrt(g.stories.length) * 15,
      color: g.color,
    }))

    const plot = Plot.plot({
      width: 800,
      height: 480,
      style: { background: 'transparent', color: '#e0e0e0' },
      marks: [
        Plot.dot(centroids, {
          x: 'x',
          y: 'y',
          r: 'r',
          fill: 'color',
          fillOpacity: 0.6,
          stroke: 'color',
          tip: true,
          title: (d: typeof centroids[0]) => `${d.label}\n${d.count} stories`,
        }),
        Plot.text(centroids, {
          x: 'x',
          y: 'y',
          text: 'label',
          fill: '#fff',
          fontSize: 11,
          fontWeight: 600,
        }),
      ],
      r: { type: 'identity' },
      color: { type: 'identity' },
      x: { axis: null },
      y: { axis: null },
    })

    ref.current.replaceChildren(plot)
    return () => plot.remove()
  }, [groups])

  return <div ref={ref} />
}

function TopicBlock({ label, stories, color }: Group) {
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
  const [tab, setTab] = useState<'treemap' | 'bubble'>('treemap')

  useEffect(() => {
    fetch(`${API}/clusters`)
      .then(r => r.json())
      .then(data => {
        setClusters(data)
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="loading">Loading…</p>

  const groups = getGroups(clusters)

  return (
    <>
      <h1>Hacker News</h1>
      <div className="section">
        <div className="tabs">
          <button className={`tab${tab === 'treemap' ? ' active' : ''}`} onClick={() => setTab('treemap')}>Treemap</button>
          <button className={`tab${tab === 'bubble' ? ' active' : ''}`} onClick={() => setTab('bubble')}>Bubble</button>
        </div>
        <div className="chart-container">
          {tab === 'treemap' ? <Treemap groups={groups} /> : <BubbleChart groups={groups} />}
        </div>
      </div>
      <div className="grid">
        {groups.map(g => <TopicBlock key={g.label} {...g} />)}
      </div>
    </>
  )
}
