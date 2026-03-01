import { useEffect, useMemo, useRef, useState } from 'react'
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

type LayoutNode = {
  data: TreeNode
  x0: number; x1: number; y0: number; y1: number
}

function Treemap({ groups }: { groups: Group[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(800)
  const [selected, setSelected] = useState<Group | null>(null)
  const H = Math.min(600, Math.max(300, Math.round(containerW * 0.55)))

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const nodes = useMemo<LayoutNode[]>(() => {
    const root = hierarchy<TreeNode>({
      children: groups.map(g => ({ label: g.label, value: g.stories.length, color: g.color })),
    }).sum(d => d.value ?? 0)
    treemap<TreeNode>().size([containerW, H]).padding(3)(root)
    return root.leaves() as unknown as LayoutNode[]
  }, [groups, containerW])

  if (selected) {
    return (
      <div className="treemap-expanded">
        <div className="treemap-expanded-header" style={{ borderColor: selected.color }}>
          <span style={{ color: selected.color, fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {selected.label}
          </span>
          <button className="back-btn" onClick={() => setSelected(null)}>← Back</button>
        </div>
        <ul className="treemap-expanded-list">
          {selected.stories.map(s => (
            <li key={s.title}>
              <a href={s.url ?? undefined} target="_blank" rel="noreferrer">{s.title}</a>
              <span className="meta">{s.by && `${s.by} · `}{s.score ?? 0} pts</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', height: H }}>
      {nodes.map(n => {
        const w = n.x1 - n.x0
        const h = n.y1 - n.y0
        const group = groups.find(g => g.label === n.data.label)!
        const storiesToShow = Math.max(0, Math.floor((h - 44) / 18))
        return (
          <div
            key={n.data.label}
            className="treemap-block"
            style={{ left: n.x0, top: n.y0, width: w, height: h, background: n.data.color } as React.CSSProperties}
            onClick={() => setSelected(group)}
          >
            {w > 50 && h > 24 && <div className="treemap-label">{n.data.label}</div>}
            {w > 50 && h > 40 && <div className="treemap-count">{n.data.value} stories</div>}
            {w > 80 && storiesToShow > 0 && (
              <ul className="treemap-stories">
                {group.stories.slice(0, storiesToShow).map(s => (
                  <li key={s.title}>{s.title}</li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

function BubbleChart({ groups }: { groups: Group[] }) {
  const [selected, setSelected] = useState<Group | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(600)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const S = containerW, PAD = S * 0.12

  const nodes = useMemo(() => {
    const raw = groups.map(g => ({
      group: g,
      cx: g.stories.reduce((s, d) => s + d.x, 0) / g.stories.length,
      cy: g.stories.reduce((s, d) => s + d.y, 0) / g.stories.length,
      r: Math.sqrt(g.stories.length) * (S / 40),
    }))
    const xs = raw.map(n => n.cx), ys = raw.map(n => n.cy)
    const [minX, maxX] = [Math.min(...xs), Math.max(...xs)]
    const [minY, maxY] = [Math.min(...ys), Math.max(...ys)]
    const norm = (v: number, lo: number, hi: number, a: number, b: number) =>
      lo === hi ? (a + b) / 2 : a + (v - lo) / (hi - lo) * (b - a)
    return raw.map(n => ({
      ...n,
      cx: norm(n.cx, minX, maxX, PAD, S - PAD),
      cy: norm(n.cy, minY, maxY, PAD, S - PAD),
    }))
  }, [groups, S, PAD])

  if (selected) {
    return (
      <div className="treemap-expanded">
        <div className="treemap-expanded-header" style={{ borderColor: selected.color }}>
          <span style={{ color: selected.color, fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {selected.label}
          </span>
          <button className="back-btn" onClick={() => setSelected(null)}>← Back</button>
        </div>
        <ul className="treemap-expanded-list">
          {selected.stories.map(s => (
            <li key={s.title}>
              <a href={s.url ?? undefined} target="_blank" rel="noreferrer">{s.title}</a>
              <span className="meta">{s.by && `${s.by} · `}{s.score ?? 0} pts</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const fontSize = Math.max(10, S / 60)

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${S} ${S}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {nodes.map(({ group, cx, cy, r }) => (
          <g key={group.label} onClick={() => setSelected(group)} style={{ cursor: 'pointer' }}>
            <circle cx={cx} cy={cy} r={r} fill={group.color} fillOpacity={0.6} stroke={group.color} strokeOpacity={0.9} />
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={fontSize} fontWeight={600} style={{ pointerEvents: 'none' }}>
              {group.label}
            </text>
            <text x={cx} y={cy + fontSize * 1.4} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.55)" fontSize={fontSize * 0.8} style={{ pointerEvents: 'none' }}>
              {group.stories.length} stories
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
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
  const [tab, setTab] = useState<'feed' | 'treemap' | 'bubble'>('feed')

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
      <h1>Orbit <span style={{ color: '#888', fontWeight: 400 }}>· Hacker News</span></h1>
      <div className="section">
        <div className="tabs">
          <button className={`tab${tab === 'feed' ? ' active' : ''}`} onClick={() => setTab('feed')}>Feed</button>
          <button className={`tab${tab === 'treemap' ? ' active' : ''}`} onClick={() => setTab('treemap')}>Treemap</button>
          <button className={`tab${tab === 'bubble' ? ' active' : ''}`} onClick={() => setTab('bubble')}>Bubble</button>
        </div>
        {tab === 'feed' && (
          <div className="grid">
            {groups.map(g => <TopicBlock key={g.label} {...g} />)}
          </div>
        )}
        {(tab === 'treemap' || tab === 'bubble') && (
          <div className="chart-container">
            {tab === 'treemap' ? <Treemap groups={groups} /> : <BubbleChart groups={groups} />}
          </div>
        )}
      </div>
    </>
  )
}
