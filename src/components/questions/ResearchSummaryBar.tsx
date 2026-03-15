'use client'
import { useState } from 'react'

type Panel = 'none' | 'refine' | 'dig'
type DigTab = 'sources' | 'signals' | 'question'

const FOCUS_PILLS = ['Demand signals', 'Competitor gaps', 'Willingness to pay', 'Market timing', 'Regulatory risks']
const GEO_PILLS = ['Global', 'US / Canada', 'Europe', 'South Asia', 'LATAM', 'SEA']
const SOURCES = ['Reddit', 'HackerNews', 'Twitter / X', 'App Store', 'G2 / Capterra', 'Trustpilot', 'IndieHackers', 'LinkedIn', 'News / blogs']
const SIGNALS = [
  { color: '#E24B4A', label: 'Pain — complaints, frustrations, workarounds' },
  { color: '#1D9E75', label: 'Demand — people actively looking for a solution' },
  { color: '#7F77DD', label: 'Purchase intent — spending behaviour, willingness to pay' },
  { color: '#BA7517', label: 'Competitor weakness — negative reviews, churned users' },
  { color: '#5F5E5A', label: 'Trend — growing vs declining mentions over time' },
]
const RECENCY_LABELS = ['1 week', '1 month', '3 months', '6 months', '1 year']

const DUMMY_RESULTS = [
  { tag: 'Validated', dot: '#1D9E75', title: 'Real demand confirmed', body: '34 user complaints, 12 Reddit threads — tracking loss after pickup is a genuine pain with no current solution in the P2P segment.' },
  { tag: 'Risk', dot: '#E24B4A', title: '3 funded competitors nearby', body: 'Piggybee, Roadie, Grabr operate in adjacent spaces but none offer real-time GPS tracking in traveller-led delivery.' },
  { tag: 'Opportunity', dot: '#7F77DD', title: 'Clear wedge: live tracking', body: 'Real-time sender visibility is absent across all 3 competitors. This is your defensible first feature.' },
]

const DUMMY_REFINED = [
  { tag: 'Validated', dot: '#1D9E75', title: 'Stronger demand signal (US/Canada)', body: '18 new demand signals found — users expect to pay $3–8 per delivery. Willingness-to-pay confirmed.' },
  { tag: 'Risk', dot: '#E24B4A', title: 'New competitor: Sendit (3 months old)', body: 'Launched recently in the US market but lacks real-time tracking — your gap still holds.' },
  { tag: 'Opportunity', dot: '#7F77DD', title: 'B2B angle emerging', body: 'Small businesses using remote workers are asking for trackable delivery between offices. Untapped.' },
]

const DUMMY_DEEPER = [
  { tag: 'Validated', dot: '#1D9E75', title: 'Grabr: 23 tracking complaints (90d)', body: 'Reddit and App Store reviews confirm "ghost courier" as the #1 pain. Users are vocal and unsatisfied.' },
  { tag: 'Risk', dot: '#E24B4A', title: 'Roadie: "ghost driver" in 40 reviews', body: 'Pattern is consistent. No fix has been shipped by any competitor in 12 months.' },
  { tag: 'Opportunity', dot: '#7F77DD', title: 'Piggybee 3-star avg — top complaint: tracking', body: 'Deep competitor weakness confirmed. App Store evidence is direct and quotable.' },
]

const TF = 'var(--font-host-grotesk, ui-sans-serif, system-ui, sans-serif)'
const MONO = 'var(--font-geist-mono, monospace)'

interface Props {
  tinyfishReport?: object
}

export function ResearchSummaryBar({ tinyfishReport }: Props) {
  const [panel, setPanel] = useState<Panel>('none')
  const [digTab, setDigTab] = useState<DigTab>('sources')
  const [results, setResults] = useState(DUMMY_RESULTS)
  const [scanning, setScanning] = useState(false)
  const [scanLog, setScanLog] = useState<string[]>([])

  // Refine state
  const [focusPills, setFocusPills] = useState<string[]>([])
  const [geo, setGeo] = useState<string[]>(['US / Canada'])
  const [minMentions, setMinMentions] = useState(50)
  const [recencyIdx, setRecencyIdx] = useState(3)
  const [reframe, setReframe] = useState('')

  // Dig state
  const [selectedSources, setSelectedSources] = useState<string[]>(['HackerNews'])
  const [selectedSignals, setSelectedSignals] = useState<string[]>([])
  const [deepQuestion, setDeepQuestion] = useState('')

  const [expanded, setExpanded] = useState(false)

  function toggle<T>(arr: T[], item: T): T[] { return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item] }

  function openPanel(which: Panel) {
    setPanel(prev => prev === which ? 'none' : which)
    if (!expanded) setExpanded(true)
  }

  async function mockRescan(mode: 'refined' | 'deeper') {
    setScanning(true)
    setScanLog([])
    setPanel('none')

    const lines = mode === 'refined' ? [
      '→ Applying refined focus: demand signals + US/Canada…',
      '→ Filtering to signals from last 6 months…',
      '→ Re-running scan with updated parameters…',
      '✓ 18 new demand signals found (not in previous scan)',
      '✓ Pricing signal: users expect to pay $3–8 per delivery',
      '⚠ One new competitor launched 3 months ago: Sendit',
      '✓ Refined scan complete — results updated',
    ] : [
      '→ Targeting selected sources: Reddit, HackerNews…',
      '→ Filtering for: competitor weakness signals…',
      '✓ Grabr: 23 complaints about no live tracking in last 90d',
      '✓ Roadie: users report "ghost driver" issue in 40 reviews',
      '✓ Piggybee: 3 star avg on App Store, top complaint: tracking',
      '✓ Deep scan complete — competitor weakness confirmed',
    ]

    for (let i = 0; i < lines.length; i++) {
      await new Promise(r => setTimeout(r, 600))
      setScanLog(prev => [...prev, lines[i]])
    }

    await new Promise(r => setTimeout(r, 400))
    setResults(mode === 'refined' ? DUMMY_REFINED : DUMMY_DEEPER)
    setScanning(false)
  }

  const pill = (sel: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: '2px solid #000',
    cursor: 'pointer', fontFamily: TF, background: sel ? '#F5E642' : '#fff',
    boxShadow: sel ? '2px 2px 0 0 #000' : 'none', transition: 'all .12s',
  })

  const primaryBtn: React.CSSProperties = { padding: '8px 18px', borderRadius: 9, border: '2px solid #000', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: TF, background: '#000', color: '#fff', boxShadow: '3px 3px 0 0 #F5E642', transition: 'all .12s' }
  const ghostBtn: React.CSSProperties = { padding: '8px 14px', borderRadius: 9, border: '2px solid #000', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: TF, background: '#fff', color: '#000', boxShadow: '2px 2px 0 0 #000', transition: 'all .12s' }
  const panelStyle: React.CSSProperties = { border: '2px solid #000', borderRadius: 12, overflow: 'hidden', background: '#fff', boxShadow: '4px 4px 0 0 #000' }
  const sectionLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555', fontFamily: MONO, marginBottom: 8 }

  void tinyfishReport // use real data in future

  return (
    <div style={{ borderBottom: '1.5px solid rgba(0,0,0,0.08)', background: '#FAFAF8', flexShrink: 0, fontFamily: TF }}>

      {/* ── Summary bar (always visible) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', height: 46, flexWrap: 'nowrap', overflow: 'hidden' }}>
        {/* tf badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 7, background: '#000', border: '1.5px solid #000', boxShadow: '2px 2px 0 0 #F5E642', flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: '#F5E642', fontFamily: MONO, letterSpacing: '0.05em' }}>tf scan</span>
        </div>

        {/* Result chips */}
        <div style={{ display: 'flex', gap: 6, flex: 1, overflow: 'hidden' }}>
          {results.slice(0, 3).map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 7, border: '1.5px solid #000', background: '#fff', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.dot, flexShrink: 0 }} />
              {r.tag}
            </div>
          ))}
        </div>

        {/* Toggle expand */}
        <button onClick={() => setExpanded(v => !v)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 7, border: '1.5px solid #000', cursor: 'pointer', background: expanded ? '#F5E642' : '#fff', fontFamily: TF, boxShadow: '1px 1px 0 0 #000', flexShrink: 0 }}>
          {expanded ? '↑ Hide' : '↓ Details'}
        </button>

        {/* Actions */}
        <button onClick={() => openPanel('refine')}
          style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 8, border: '2px solid #000', cursor: 'pointer', background: panel === 'refine' ? '#F5E642' : '#fff', fontFamily: TF, boxShadow: panel === 'refine' ? '2px 2px 0 0 #000' : '2px 2px 0 0 #000', flexShrink: 0 }}>
          ⟳ Refine
        </button>
        <button onClick={() => openPanel('dig')}
          style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 8, border: '2px solid #000', cursor: 'pointer', background: panel === 'dig' ? '#F5E642' : '#fff', fontFamily: TF, boxShadow: panel === 'dig' ? '2px 2px 0 0 #000' : '2px 2px 0 0 #000', flexShrink: 0 }}>
          ↓ Dig deeper
        </button>
      </div>

      {/* ── Expanded details / panels ── */}
      {expanded && (
        <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Scanning log */}
          {scanning && (
            <div style={{ border: '2px solid #000', borderRadius: 10, background: '#111', padding: '12px 14px', fontFamily: MONO, fontSize: 11, lineHeight: 1.9, boxShadow: '3px 3px 0 0 #000' }}>
              {scanLog.map((line, i) => (
                <div key={i} style={{ color: line.startsWith('✓') ? '#4ade80' : line.startsWith('⚠') ? '#fbbf24' : 'rgba(255,255,255,0.6)' }}>{line}</div>
              ))}
              {scanLog.length === 0 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>Initialising…</span>}
            </div>
          )}

          {/* Result cards (when not scanning) */}
          {!scanning && panel === 'none' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.map((r, i) => (
                <div key={i} style={{ border: '2px solid #000', borderRadius: 9, padding: '11px 13px', background: '#fff', boxShadow: '3px 3px 0 0 #000' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#000', fontFamily: MONO }}>{r.tag}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#000', marginBottom: 3 }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: '#444', lineHeight: 1.55 }}>{r.body}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── REFINE PANEL ── */}
          {panel === 'refine' && !scanning && (
            <div style={panelStyle}>
              <div style={{ padding: '12px 15px', borderBottom: '1.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Refine the scan</span>
                <button onClick={() => setPanel('none')} style={{ fontSize: 20, color: '#888', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1, padding: '0 4px', fontFamily: TF }}>×</button>
              </div>
              <div style={{ padding: 15, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={sectionLabel}>Focus</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {FOCUS_PILLS.map(f => <button key={f} onClick={() => setFocusPills(v => toggle(v, f))} style={pill(focusPills.includes(f))}>{f}</button>)}
                  </div>
                </div>
                <div>
                  <div style={sectionLabel}>Minimum mentions</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="range" min={10} max={500} step={10} value={minMentions} onChange={e => setMinMentions(Number(e.target.value))} style={{ flex: 1, accentColor: '#F4520E' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 90 }}>{minMentions} mentions</span>
                  </div>
                </div>
                <div>
                  <div style={sectionLabel}>Geography</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {GEO_PILLS.map(g => <button key={g} onClick={() => setGeo(v => toggle(v, g))} style={pill(geo.includes(g))}>{g}</button>)}
                  </div>
                </div>
                <div>
                  <div style={sectionLabel}>Recency</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="range" min={1} max={5} step={1} value={recencyIdx + 1} onChange={e => setRecencyIdx(Number(e.target.value) - 1)} style={{ flex: 1, accentColor: '#F4520E' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 60 }}>{RECENCY_LABELS[recencyIdx]}</span>
                  </div>
                </div>
                <div>
                  <div style={sectionLabel}>Reframe (optional)</div>
                  <textarea rows={2} placeholder="e.g. Focus specifically on last-mile delivery in tier-2 cities rather than international travel…"
                    value={reframe} onChange={e => setReframe(e.target.value)}
                    style={{ width: '100%', fontSize: 12, border: '2px solid #000', borderRadius: 7, padding: '8px 11px', resize: 'none', fontFamily: TF, outline: 'none', lineHeight: 1.5, boxShadow: '2px 2px 0 0 #000' }} />
                </div>
              </div>
              <div style={{ padding: '11px 15px', borderTop: '1.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#FAFAF8' }}>
                <button onClick={() => setPanel('none')} style={ghostBtn}>Cancel</button>
                <button onClick={() => mockRescan('refined')} style={primaryBtn}>Re-run TinyFish →</button>
              </div>
            </div>
          )}

          {/* ── DIG DEEPER PANEL ── */}
          {panel === 'dig' && !scanning && (
            <div style={panelStyle}>
              <div style={{ display: 'flex', borderBottom: '1.5px solid rgba(0,0,0,0.08)' }}>
                {(['sources', 'signals', 'question'] as const).map(tab => (
                  <button key={tab} onClick={() => setDigTab(tab)}
                    style={{ flex: 1, padding: '10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'center', fontFamily: TF, background: digTab === tab ? '#F5E642' : 'transparent', border: 'none', borderBottom: `3px solid ${digTab === tab ? '#000' : 'transparent'}`, color: '#000', transition: 'all .12s' }}>
                    {tab === 'sources' ? 'Sources' : tab === 'signals' ? 'Signal type' : 'Ask a question'}
                  </button>
                ))}
              </div>
              <div style={{ padding: 15, display: 'flex', flexDirection: 'column', gap: 11 }}>
                {digTab === 'sources' && (
                  <>
                    <div style={sectionLabel}>Where should TinyFish look?</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                      {SOURCES.map(s => (
                        <button key={s} onClick={() => setSelectedSources(v => toggle(v, s))}
                          style={{ border: '2px solid #000', borderRadius: 7, padding: '7px 9px', cursor: 'pointer', fontSize: 11, fontWeight: 600, textAlign: 'center', background: selectedSources.includes(s) ? '#F5E642' : '#fff', fontFamily: TF, transition: 'all .12s', boxShadow: selectedSources.includes(s) ? '2px 2px 0 0 #000' : 'none' }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {digTab === 'signals' && (
                  <>
                    <div style={sectionLabel}>What kind of signal?</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {SIGNALS.map(sig => (
                        <button key={sig.label} onClick={() => setSelectedSignals(v => toggle(v, sig.label))}
                          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', border: '2px solid #000', borderRadius: 7, cursor: 'pointer', textAlign: 'left', background: selectedSignals.includes(sig.label) ? '#F5E642' : '#fff', fontFamily: TF, transition: 'all .12s', boxShadow: selectedSignals.includes(sig.label) ? '2px 2px 0 0 #000' : 'none' }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: sig.color, flexShrink: 0, border: '1.5px solid #000' }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#000' }}>{sig.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {digTab === 'question' && (
                  <>
                    <div style={sectionLabel}>Ask TinyFish directly</div>
                    <textarea rows={3} placeholder="e.g. Are there complaints specifically about tracking in peer-to-peer delivery apps in India? What do users say about pricing?"
                      value={deepQuestion} onChange={e => setDeepQuestion(e.target.value)}
                      style={{ width: '100%', fontSize: 12, border: '2px solid #000', borderRadius: 7, padding: '9px 11px', resize: 'none', fontFamily: TF, outline: 'none', lineHeight: 1.5, boxShadow: '2px 2px 0 0 #000' }} />
                    <div style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>TinyFish will run a targeted search and surface direct evidence</div>
                  </>
                )}
              </div>
              <div style={{ padding: '11px 15px', borderTop: '1.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#FAFAF8' }}>
                <button onClick={() => setPanel('none')} style={ghostBtn}>Cancel</button>
                <button onClick={() => mockRescan('deeper')} style={primaryBtn}>Dig deeper →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
