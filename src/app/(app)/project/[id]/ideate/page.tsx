'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppSidebar } from '@/components/shared/AppSidebar'
import { Globe, ArrowRight } from 'lucide-react'
import type { ScanLine, Problem } from '@/types'

type Panel = 'none' | 'refine' | 'dig'
type DigTab = 'sources' | 'signals' | 'question'

interface ScanSession {
  id: string
  label: string
  problems: Problem[]
}

const DOMAIN_CHIPS = ['Remote work', 'Logistics', 'Healthcare', 'SMB finance', 'Creator tools', 'EdTech', 'Legal', 'Real estate', 'Dev tools']
const FOCUS_PILLS = ['B2B', 'B2C', 'High-growth markets', 'Underserved niches', 'High willingness to pay', 'Low competition']
const GEO_PILLS = ['Global', 'US / Canada', 'Europe', 'South Asia', 'LATAM', 'SEA']
const SOURCES = ['Reddit', 'HackerNews', 'Twitter / X', 'App Store', 'G2 / Capterra', 'Trustpilot', 'IndieHackers', 'LinkedIn', 'News / blogs']
const SIGNALS = [
  'Pain — complaints, frustrations, workarounds',
  'Demand — people actively looking for a solution',
  'Purchase intent — spending behaviour, willingness to pay',
  'Competitor weakness — negative reviews, churned users',
  'Trend — growing vs declining mentions over time',
]
const RECENCY_LABELS = ['1 week', '1 month', '3 months', '6 months', '1 year']

const TF = 'var(--font-host-grotesk, ui-sans-serif, system-ui, sans-serif)'
const MONO = 'var(--font-geist-mono, monospace)'

export default function IdeatePage() {
  const params = useParams()
  const projectId = params.id as string
  const router = useRouter()
  const supabase = createClient()
  const bodyRef = useRef<HTMLDivElement>(null)
  const autostartFired = useRef(false)

  const [selectedDomain, setSelectedDomain] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [phase, setPhase] = useState<'input' | 'active'>('input')
  const [sessions, setSessions] = useState<ScanSession[]>([])
  const [activeScanLines, setActiveScanLines] = useState<ScanLine[]>([])
  const [scanning, setScanning] = useState(false)
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)

  const [panel, setPanel] = useState<Panel>('none')
  const [focusPills, setFocusPills] = useState<string[]>([])
  const [geo, setGeo] = useState<string[]>(['US / Canada'])
  const [minMentions, setMinMentions] = useState(100)
  const [recencyIdx, setRecencyIdx] = useState(3)
  const [digTab, setDigTab] = useState<DigTab>('sources')
  const [selectedSources, setSelectedSources] = useState<string[]>(['Reddit', 'HackerNews'])
  const [selectedSignals, setSelectedSignals] = useState<string[]>([])
  const [deepQuestion, setDeepQuestion] = useState('')

  const activeDomain = customDomain.trim() || selectedDomain

  // Load project + sessionStorage autostart
  useEffect(() => {
    supabase.from('projects').select('domain, tinyfish_report').eq('id', projectId).single()
      .then(({ data }) => {
        if (!data) return
        if (data.domain) setSelectedDomain(data.domain)

        const r = data.tinyfish_report
        if (r?.type === 'ideation') {
          if (r.sessions?.length) {
            setSessions(r.sessions as ScanSession[])
            setPhase('active')
            return
          }
          if (r.results?.length) {
            setSessions([{ id: '0', label: 'Discovery scan', problems: r.results as Problem[] }])
            setPhase('active')
            return
          }
        }

        if (autostartFired.current) return
        if (typeof window !== 'undefined') {
          const raw = sessionStorage.getItem('tf-scan-params')
          if (raw) {
            const p = JSON.parse(raw)
            if (p.autostart && p.mode === 'ideate' && p.domain) {
              sessionStorage.removeItem('tf-scan-params')
              autostartFired.current = true
              setSelectedDomain(p.domain)
              runScanDirect('initial', 'Discovery scan', p.domain)
            }
          }
        }
      })
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  function buildRefineLabel() {
    const parts: string[] = []
    if (focusPills.length) parts.push(focusPills.slice(0, 2).join(', '))
    if (geo.length && !geo.includes('Global')) parts.push(geo.slice(0, 2).join(', '))
    parts.push(RECENCY_LABELS[recencyIdx])
    return `Refined · ${parts.join(' · ')}`
  }

  function buildDeeperLabel() {
    const parts: string[] = []
    if (selectedSources.length) parts.push(selectedSources.slice(0, 3).join(', '))
    if (selectedSignals.length) parts.push(selectedSignals[0].split(' —')[0])
    if (deepQuestion) parts.push('custom Q')
    return `Deeper · ${parts.join(' · ')}`
  }

  async function runScanDirect(mode: 'initial' | 'refined' | 'deeper', label: string, domain: string) {
    setScanning(true)
    setActiveScanLines([])
    setPhase('active')
    setPanel('none')

    if (mode === 'initial') {
      await supabase.from('projects').update({ domain, name: domain.slice(0, 60), status: 'questioning' }).eq('id', projectId)
    }

    const res = await fetch('/api/tinyfish/ideate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain, focus: focusPills.join(', '), mode,
        ...(mode === 'refined' ? { focus_pills: focusPills, geography: geo, min_mentions: minMentions, recency: RECENCY_LABELS[recencyIdx] } : {}),
        ...(mode === 'deeper' ? { sources: selectedSources, signals: selectedSignals, question: deepQuestion } : {}),
      }),
    })
    if (!res.body) { setScanning(false); return }

    const reader = res.body.getReader(); const decoder = new TextDecoder()
    let buffer = ''; const newProblems: Problem[] = []
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n'); buffer = parts.pop() ?? ''
      for (const line of parts) {
        if (!line.startsWith('data: ')) continue
        const data = JSON.parse(line.slice(6))
        if (data.type === 'scan_line') setActiveScanLines(prev => [...prev, data.line])
        else if (data.type === 'problems') newProblems.push(...data.problems)
      }
    }

    const newSession: ScanSession = { id: `${Date.now()}`, label, problems: newProblems }
    setSessions(prev => {
      const updated = [...prev, newSession]
      supabase.from('projects').update({
        tinyfish_report: { type: 'ideation', sessions: updated, completed_at: new Date().toISOString() },
      }).eq('id', projectId).then(() => {})
      return updated
    })
    setActiveScanLines([])
    setScanning(false)
    setTimeout(() => bodyRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 150)
  }

  function runScan(mode: 'initial' | 'refined' | 'deeper', label: string) {
    runScanDirect(mode, label, activeDomain)
  }

  async function pickProblem(p: Problem) {
    setSelectedProblem(p)
    await supabase.from('projects').update({ raw_idea: p.title, name: p.title.slice(0, 60), status: 'questioning' }).eq('id', projectId)
    setTimeout(() => bodyRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 80)
  }

  function toggle<T>(arr: T[], item: T): T[] { return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item] }

  function togglePanel(which: Panel) {
    setPanel(prev => prev === which ? 'none' : which)
    setTimeout(() => bodyRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 80)
  }

  const pill = (sel: boolean): React.CSSProperties => ({
    padding: '5px 11px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: '2px solid #000',
    cursor: 'pointer', fontFamily: TF, background: sel ? '#F5E642' : '#fff',
    boxShadow: sel ? '2px 2px 0 0 #000' : 'none', transition: 'all .12s',
  })
  const primaryBtn: React.CSSProperties = { padding: '9px 20px', borderRadius: 10, border: '2px solid #000', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: TF, background: '#000', color: '#fff', boxShadow: '3px 3px 0 0 #F5E642', transition: 'all .12s' }
  const ghostBtn: React.CSSProperties = { padding: '9px 18px', borderRadius: 10, border: '2px solid #000', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: TF, background: '#fff', color: '#000', boxShadow: '2px 2px 0 0 #000', transition: 'all .12s' }
  const panelBox: React.CSSProperties = { border: '2px solid #000', borderRadius: 12, overflow: 'hidden', background: '#fff', boxShadow: '4px 4px 0 0 #000', marginTop: 4 }
  const sLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555', fontFamily: MONO, marginBottom: 8 }
  const inputBase: React.CSSProperties = { width: '100%', fontSize: 14, fontWeight: 500, border: '2px solid #000', borderRadius: 10, padding: '11px 14px', background: '#fff', fontFamily: TF, outline: 'none', boxSizing: 'border-box' }

  function hoverPill(e: React.MouseEvent, sel: boolean, enter: boolean) {
    if (sel) return
    const el = e.currentTarget as HTMLElement
    el.style.background = enter ? '#F5E642' : '#fff'; el.style.boxShadow = enter ? '2px 2px 0 0 #000' : 'none'
  }

  const allProblems = sessions.flatMap(s => s.problems)

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: TF }}>
      <AppSidebar currentProjectId={projectId} />

      <div ref={bodyRef} className="flex-1 overflow-y-auto" style={{ background: '#FAFAF8' }}>
        <div className="max-w-2xl mx-auto p-8">

          {/* ── INPUT phase ── */}
          {phase === 'input' && (
            <>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F4520E', border: '2px solid #000', boxShadow: '2px 2px 0 0 #000', borderRadius: 8, padding: '5px 12px', marginBottom: 16 }}>
                <Globe style={{ width: 12, height: 12, color: '#fff' }} />
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: MONO, color: '#fff' }}>Discover problems</span>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#000', letterSpacing: '-0.02em', marginBottom: 6 }}>Find a problem worth solving</h1>
              <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', fontWeight: 500, marginBottom: 24 }}>TinyFish will surf Reddit, HN, and review sites to surface real unsolved problems.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ ...sLabel, display: 'block', marginBottom: 9 }}>Pick a domain</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
                    {DOMAIN_CHIPS.map(d => (
                      <button key={d} onClick={() => setSelectedDomain(v => v === d ? '' : d)}
                        style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '2px solid #000', cursor: 'pointer', fontFamily: TF, background: selectedDomain === d ? '#F5E642' : '#fff', boxShadow: selectedDomain === d ? '2px 2px 0 0 #000' : 'none', transition: 'all .12s' }}
                        onMouseEnter={e => { if (selectedDomain !== d) (e.currentTarget as HTMLElement).style.background = '#F5E642' }}
                        onMouseLeave={e => { if (selectedDomain !== d) (e.currentTarget as HTMLElement).style.background = '#fff' }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ ...sLabel, display: 'block', marginBottom: 7 }}>Or describe your own</label>
                  <input style={inputBase} placeholder="e.g. peer-to-peer logistics, creator monetisation…" value={customDomain} onChange={e => setCustomDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && activeDomain && runScan('initial', 'Discovery scan')}
                    onFocus={e => { e.currentTarget.style.boxShadow = '3px 3px 0 0 #000' }} onBlur={e => { e.currentTarget.style.boxShadow = 'none' }} />
                </div>
                <button onClick={() => runScan('initial', 'Discovery scan')} disabled={!activeDomain}
                  style={{ width: '100%', padding: '12px', borderRadius: 12, border: '2px solid #000', background: activeDomain ? '#000' : '#ddd', color: activeDomain ? '#fff' : '#999', fontSize: 14, fontWeight: 800, cursor: activeDomain ? 'pointer' : 'not-allowed', fontFamily: TF, boxShadow: activeDomain ? '4px 4px 0 0 #F5E642' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .14s' }}
                  onMouseEnter={e => { if (activeDomain) { (e.currentTarget as HTMLElement).style.boxShadow = '6px 6px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)' } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>
                  Start discovery scan <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </>
          )}

          {/* ── ACTIVE phase ── */}
          {phase === 'active' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>

              {sessions.map((session, si) => (
                <div key={session.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: si === 0 ? '0 0 20px' : '28px 0 20px' }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.1)' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999', fontFamily: MONO, whiteSpace: 'nowrap' }}>{session.label}</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.1)' }} />
                  </div>

                  {session.problems.map((p) => {
                    const isSelected = selectedProblem?.rank === p.rank && selectedProblem?.title === p.title
                    return (
                      <button key={`${session.id}-${p.rank}`} onClick={() => pickProblem(p)}
                        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: isSelected ? '14px 0 14px 13px' : '14px 0', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'flex-start', transition: 'all .12s', borderLeft: isSelected ? '3px solid #000' : '3px solid transparent' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,230,66,0.15)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#bbb', fontFamily: MONO, flexShrink: 0, paddingTop: 2, minWidth: 20 }}>
                          {String(p.rank).padStart(2, '0')}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#000', marginBottom: p.evidence_quote ? 6 : 8, lineHeight: 1.4 }}>{p.title}</div>
                          {p.evidence_quote && <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic', lineHeight: 1.55, marginBottom: 8 }}>"{p.evidence_quote}"</div>}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#999', fontFamily: MONO, flexWrap: 'wrap' }}>
                            <span>{p.mention_count.toLocaleString()} mentions</span>
                            {p.sources?.length > 0 && <><span>·</span><span>{p.sources.join(', ')}</span></>}
                            <span style={{ marginLeft: 'auto', fontWeight: 700, color: p.opportunity_score >= 75 ? '#000' : '#aaa' }}>{p.opportunity_score}/100</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}

              {/* Live scan log */}
              {scanning && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: sessions.length > 0 ? '28px 0 16px' : '0 0 16px' }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.1)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F4520E] animate-pulse inline-block" />
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#F4520E', fontFamily: MONO }}>Scanning…</span>
                    </div>
                    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.1)' }} />
                  </div>
                  <div style={{ background: '#111', borderRadius: 10, padding: '12px 16px', fontFamily: MONO, fontSize: 11, lineHeight: 2, minHeight: 80, border: '2px solid #000', boxShadow: '3px 3px 0 0 #000' }}>
                    {activeScanLines.length === 0 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>Initialising…</span>}
                    {activeScanLines.map((line, i) => (
                      <div key={i} style={{ color: line.kind === 'success' ? '#4ade80' : line.kind === 'warning' ? '#fbbf24' : line.kind === 'error' ? '#f87171' : 'rgba(255,255,255,0.55)' }}>{line.text}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected problem CTA */}
              {selectedProblem && !scanning && (
                <div style={{ border: '2px solid #000', borderRadius: 12, padding: '16px', background: '#F5E642', boxShadow: '4px 4px 0 0 #000', marginTop: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO, marginBottom: 4 }}>Selected problem</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>{selectedProblem.title}</div>
                  <button onClick={() => router.push(`/project/${projectId}/canvas`)}
                    style={{ width: '100%', padding: '11px', borderRadius: 10, border: '2px solid #000', background: '#000', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: TF, boxShadow: '3px 3px 0 0 #F5E642', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .14s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>
                    Build spec for this problem <ArrowRight style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              )}

              {/* Explore further */}
              {!scanning && allProblems.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', fontFamily: MONO, marginBottom: 10 }}>Explore further</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {(['refine', 'dig'] as const).map(which => (
                      <button key={which} onClick={() => togglePanel(which)}
                        style={{ border: '2px solid #000', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', fontFamily: TF, background: panel === which ? '#F5E642' : '#fff', boxShadow: panel === which ? '4px 4px 0 0 #000' : '3px 3px 0 0 #000', transform: panel === which ? 'translate(-1px,-1px)' : 'none', transition: 'all .15s' }}
                        onMouseEnter={e => { if (panel !== which) { const el = e.currentTarget as HTMLElement; el.style.background = '#F5E642'; el.style.transform = 'translate(-1px,-1px)'; el.style.boxShadow = '4px 4px 0 0 #000' } }}
                        onMouseLeave={e => { if (panel !== which) { const el = e.currentTarget as HTMLElement; el.style.background = '#fff'; el.style.transform = 'none'; el.style.boxShadow = '3px 3px 0 0 #000' } }}>
                        <div style={{ fontSize: 18, marginBottom: 5 }}>{which === 'refine' ? '⟳' : '↓'}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#000', marginBottom: 2 }}>{which === 'refine' ? 'Refine' : 'Dig deeper'}</div>
                        <div style={{ fontSize: 11, color: '#555', lineHeight: 1.4 }}>{which === 'refine' ? 'Narrow focus, geography or market size' : 'Pick a source or signal to investigate'}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── REFINE PANEL ── */}
              {panel === 'refine' && (
                <div style={panelBox}>
                  <div style={{ padding: '13px 16px', borderBottom: '1.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Refine the scan</span>
                    <button onClick={() => setPanel('none')} style={{ fontSize: 22, color: '#888', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1 }}>×</button>
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <div style={sLabel}>Narrow the focus</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {FOCUS_PILLS.map(f => <button key={f} onClick={() => setFocusPills(v => toggle(v, f))} style={pill(focusPills.includes(f))} onMouseEnter={e => hoverPill(e, focusPills.includes(f), true)} onMouseLeave={e => hoverPill(e, focusPills.includes(f), false)}>{f}</button>)}
                      </div>
                    </div>
                    <div>
                      <div style={sLabel}>Minimum signal volume</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input type="range" min={10} max={1000} step={10} value={minMentions} onChange={e => setMinMentions(Number(e.target.value))} style={{ flex: 1, accentColor: '#F4520E' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 90, fontFamily: MONO }}>{minMentions} mentions</span>
                      </div>
                    </div>
                    <div>
                      <div style={sLabel}>Geography</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {GEO_PILLS.map(g => <button key={g} onClick={() => setGeo(v => toggle(v, g))} style={pill(geo.includes(g))} onMouseEnter={e => hoverPill(e, geo.includes(g), true)} onMouseLeave={e => hoverPill(e, geo.includes(g), false)}>{g}</button>)}
                      </div>
                    </div>
                    <div>
                      <div style={sLabel}>Recency</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input type="range" min={1} max={5} step={1} value={recencyIdx + 1} onChange={e => setRecencyIdx(Number(e.target.value) - 1)} style={{ flex: 1, accentColor: '#F4520E' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 60, fontFamily: MONO }}>{RECENCY_LABELS[recencyIdx]}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '12px 16px', borderTop: '1.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#FAFAF8' }}>
                    <button onClick={() => setPanel('none')} style={ghostBtn}>Cancel</button>
                    <button onClick={() => runScan('refined', buildRefineLabel())} style={primaryBtn}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>
                      Re-run scan →
                    </button>
                  </div>
                </div>
              )}

              {/* ── DIG DEEPER PANEL ── */}
              {panel === 'dig' && (
                <div style={panelBox}>
                  <div style={{ display: 'flex', borderBottom: '1.5px solid rgba(0,0,0,0.08)' }}>
                    {(['sources', 'signals', 'question'] as const).map(tab => (
                      <button key={tab} onClick={() => setDigTab(tab)}
                        style={{ flex: 1, padding: '11px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'center', fontFamily: TF, background: digTab === tab ? '#F5E642' : 'transparent', border: 'none', borderBottom: `3px solid ${digTab === tab ? '#000' : 'transparent'}`, color: '#000', transition: 'all .12s' }}>
                        {tab === 'sources' ? 'Sources' : tab === 'signals' ? 'Signal type' : 'Ask a question'}
                      </button>
                    ))}
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {digTab === 'sources' && (
                      <>
                        <div style={sLabel}>Where should TinyFish look?</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                          {SOURCES.map(s => (
                            <button key={s} onClick={() => setSelectedSources(v => toggle(v, s))}
                              style={{ border: '2px solid #000', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, textAlign: 'center', background: selectedSources.includes(s) ? '#F5E642' : '#fff', fontFamily: TF, transition: 'all .12s', boxShadow: selectedSources.includes(s) ? '2px 2px 0 0 #000' : 'none' }}>{s}</button>
                          ))}
                        </div>
                      </>
                    )}
                    {digTab === 'signals' && (
                      <>
                        <div style={sLabel}>What kind of signal?</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {SIGNALS.map(sig => (
                            <button key={sig} onClick={() => setSelectedSignals(v => toggle(v, sig))}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: '2px solid #000', borderRadius: 8, cursor: 'pointer', textAlign: 'left', background: selectedSignals.includes(sig) ? '#F5E642' : '#fff', fontFamily: TF, transition: 'all .12s', boxShadow: selectedSignals.includes(sig) ? '2px 2px 0 0 #000' : 'none' }}>
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#000', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{sig}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    {digTab === 'question' && (
                      <>
                        <div style={sLabel}>Ask TinyFish directly</div>
                        <textarea rows={3} placeholder="e.g. Which of these problems has the least competition in the US market?" value={deepQuestion} onChange={e => setDeepQuestion(e.target.value)}
                          style={{ width: '100%', fontSize: 13, border: '2px solid #000', borderRadius: 8, padding: '10px 12px', resize: 'none', fontFamily: TF, outline: 'none', lineHeight: 1.5, boxShadow: '2px 2px 0 0 #000' }} />
                      </>
                    )}
                  </div>
                  <div style={{ padding: '12px 16px', borderTop: '1.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#FAFAF8' }}>
                    <button onClick={() => setPanel('none')} style={ghostBtn}>Cancel</button>
                    <button onClick={() => runScan('deeper', buildDeeperLabel())} style={primaryBtn}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>
                      Dig deeper →
                    </button>
                  </div>
                </div>
              )}

              <div style={{ height: 40 }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
