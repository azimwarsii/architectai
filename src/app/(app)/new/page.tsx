'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ScanLog } from '@/components/tinyfish/ScanLog'
import { ValidationReport } from '@/components/tinyfish/ValidationReport'
import { ProblemList } from '@/components/tinyfish/ProblemList'
import { AppSidebar } from '@/components/shared/AppSidebar'
import { Lightbulb, Globe, ArrowRight, ArrowLeft } from 'lucide-react'
import type { ScanLine, ValidationResult, Problem } from '@/types'

type Step = 'choose' | 'validate' | 'ideate'

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()

  // Flow state
  const [step, setStep] = useState<Step>('choose')
  const [showing, setShowing] = useState<Step>('choose')
  const [fadeIn, setFadeIn] = useState(true)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  // Validate flow state
  const [idea, setIdea] = useState('')
  const [domain, setDomain] = useState('')
  const [scanLines, setScanLines] = useState<ScanLine[]>([])
  const [results, setResults] = useState<ValidationResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanDone, setScanDone] = useState(false)

  // Ideate flow state
  const [ideateDomain, setIdeateDomain] = useState('')
  const [ideateFocus, setIdeateFocus] = useState('')
  const [ideateLines, setIdeateLines] = useState<ScanLine[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [ideateScanning, setIdeateScanning] = useState(false)
  const [ideateDone, setIdeateDone] = useState(false)
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)

  function transitionTo(next: Step) {
    setFadeIn(false)
    setTimeout(() => { setShowing(next); setStep(next); setFadeIn(true) }, 160)
  }

  async function startFlow(path: 'has_idea' | 'needs_idea') {
    setCreating(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setCreating(false); return }
    const { data } = await supabase
      .from('projects')
      .insert({ user_id: u.id, name: 'Untitled project', entry_path: path, status: 'intake' })
      .select().single()
    setCreating(false)
    if (data) {
      setCurrentProjectId(data.id)
      transitionTo(path === 'has_idea' ? 'validate' : 'ideate')
    }
  }

  // ── Validate scan ─────────────────────────────────────────────────────────
  async function startValidateScan() {
    if (!idea.trim() || !currentProjectId) return
    setScanning(true); setScanLines([]); setResults([])
    await supabase.from('projects')
      .update({ raw_idea: idea, domain: domain || null, name: idea.slice(0, 60), status: 'questioning' })
      .eq('id', currentProjectId)
    const res = await fetch('/api/tinyfish/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, domain }),
    })
    if (!res.body) { setScanning(false); return }
    const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n'); buf = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const d = JSON.parse(line.slice(6))
        if (d.type === 'scan_line') setScanLines(prev => [...prev, d.line])
        else if (d.type === 'results') setResults(d.results)
      }
    }
    setScanning(false); setScanDone(true)
  }

  // ── Ideate scan ───────────────────────────────────────────────────────────
  async function startIdeateScan() {
    if (!ideateDomain.trim()) return
    setIdeateScanning(true); setIdeateLines([]); setProblems([])
    const res = await fetch('/api/tinyfish/ideate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: ideateDomain, focus: ideateFocus }),
    })
    if (!res.body) { setIdeateScanning(false); return }
    const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n'); buf = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const d = JSON.parse(line.slice(6))
        if (d.type === 'scan_line') setIdeateLines(prev => [...prev, d.line])
        else if (d.type === 'problems') setProblems(d.problems)
      }
    }
    setIdeateScanning(false); setIdeateDone(true)
  }

  async function selectProblem(problem: Problem) {
    setSelectedProblem(problem)
    if (!currentProjectId) return
    await supabase.from('projects').update({
      raw_idea: problem.title, domain: ideateDomain,
      name: problem.title.slice(0, 60), status: 'questioning',
    }).eq('id', currentProjectId)
  }

  // ── Input style ───────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', fontSize: '14px', fontWeight: 500,
    border: '2px solid #000', borderRadius: '10px', background: '#fff',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const textareaStyle: React.CSSProperties = {
    ...inputStyle, resize: 'none', minHeight: 96,
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-screen overflow-hidden bg-white"
      style={{ fontFamily: 'var(--font-host-grotesk), ui-sans-serif, system-ui, sans-serif' }}
    >
      <AppSidebar
        currentProjectId={currentProjectId ?? undefined}
        onNewProject={() => transitionTo('choose')}
      />

      {/* ════════════════ MAIN CONTENT ════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Top strip */}
        <div
          className="flex-shrink-0 h-11 flex items-center px-6 gap-3"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        >
          {showing !== 'choose' && (
            <button
              onClick={() => transitionTo('choose')}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-black/40 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          )}
          <span className="text-[13px] font-semibold text-black/35">
            {showing === 'choose' ? 'New project' : showing === 'validate' ? 'Validate idea' : 'Discover problems'}
          </span>
        </div>

        {/* Animated content area */}
        <div
          className="flex-1 overflow-auto"
          style={{
            opacity: fadeIn ? 1 : 0,
            transform: fadeIn ? 'none' : 'translateY(6px)',
            transition: 'opacity 0.16s ease, transform 0.16s ease',
          }}
        >
          {/* ── CHOOSE VIEW ── */}
          {showing === 'choose' && (
            <div className="flex flex-col items-center justify-center min-h-full px-8 py-12">
              <div className="text-center mb-10 max-w-lg">
                <h1 className="text-[34px] font-extrabold tracking-tight text-black leading-none mb-3">
                  Where are you starting?
                </h1>
                <p className="text-[15px] text-black/45 font-medium leading-relaxed">
                  We'll tailor the experience based on where you are in the process
                </p>
              </div>

              <div
                className={`grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl ${creating ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {/* Has idea */}
                <button
                  onClick={() => startFlow('has_idea')}
                  onMouseEnter={() => setHoveredCard('idea')}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="text-left p-6 rounded-2xl transition-all duration-150"
                  style={{
                    background: hoveredCard === 'idea' ? '#F5E642' : '#FAFAF7',
                    border: '2px solid #000',
                    boxShadow: hoveredCard === 'idea' ? '5px 5px 0px 0px #000' : '3px 3px 0px 0px #000',
                    transform: hoveredCard === 'idea' ? 'translate(-1px,-1px)' : 'none',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: '#F5E642', border: '2px solid #000', boxShadow: '2px 2px 0 0 #000' }}
                  >
                    <Lightbulb className="w-5 h-5 text-black" />
                  </div>
                  <h2 className="text-[18px] font-extrabold text-black tracking-tight mb-1.5">I have an idea</h2>
                  <p className="text-[13px] text-black/55 font-medium leading-relaxed mb-4">
                    Validate it against real market signals, competitor gaps, and live user complaints.
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[12px] font-bold text-black">
                    Validate idea <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>

                {/* Needs idea */}
                <button
                  onClick={() => startFlow('needs_idea')}
                  onMouseEnter={() => setHoveredCard('discover')}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="text-left p-6 rounded-2xl transition-all duration-150"
                  style={{
                    background: hoveredCard === 'discover' ? '#FFE8DF' : '#FFF8F5',
                    border: '2px solid #000',
                    boxShadow: hoveredCard === 'discover' ? '5px 5px 0px 0px #000' : '3px 3px 0px 0px #000',
                    transform: hoveredCard === 'discover' ? 'translate(-1px,-1px)' : 'none',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: '#F4520E', border: '2px solid #000', boxShadow: '2px 2px 0 0 #000' }}
                  >
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-[18px] font-extrabold text-black tracking-tight mb-1.5">I need an idea</h2>
                  <p className="text-[13px] text-black/55 font-medium leading-relaxed mb-4">
                    TinyFish surfs the web to find real unsolved problems in any domain, ranked by opportunity.
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[12px] font-bold text-black">
                    Discover problems <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>

              <p
                className="mt-8 text-[11px] text-black/30 font-medium"
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                Powered by TinyFish market intelligence
              </p>
            </div>
          )}

          {/* ── VALIDATE VIEW ── */}
          {showing === 'validate' && (
            <div className="max-w-2xl mx-auto px-6 py-10">
              <div className="mb-8">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4"
                  style={{ background: '#F5E642', border: '1.5px solid #000', boxShadow: '2px 2px 0 0 #000' }}
                >
                  <Lightbulb className="w-3.5 h-3.5 text-black" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-black" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                    Validate idea
                  </span>
                </div>
                <h2 className="text-[28px] font-extrabold tracking-tight text-black leading-tight">
                  Tell us your idea
                </h2>
                <p className="text-[14px] text-black/50 font-medium mt-1">
                  TinyFish will scan the web for real demand signals, competitor gaps, and user pain points.
                </p>
              </div>

              {!scanning && !scanDone && (
                <div className="space-y-4">
                  <div>
                    <label
                      className="block text-[11px] font-bold uppercase tracking-[0.1em] text-black/50 mb-2"
                      style={{ fontFamily: 'var(--font-geist-mono)' }}
                    >
                      Your idea
                    </label>
                    <textarea
                      style={textareaStyle}
                      placeholder="e.g. A real-time tracking app for peer-to-peer package delivery between travellers..."
                      value={idea}
                      onChange={e => setIdea(e.target.value)}
                      onFocus={e => { e.currentTarget.style.boxShadow = '3px 3px 0 0 #000' }}
                      onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[11px] font-bold uppercase tracking-[0.1em] text-black/50 mb-2"
                      style={{ fontFamily: 'var(--font-geist-mono)' }}
                    >
                      Domain / market <span className="normal-case font-medium">(optional)</span>
                    </label>
                    <input
                      style={inputStyle}
                      placeholder="e.g. logistics, edtech, fintech..."
                      value={domain}
                      onChange={e => setDomain(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && startValidateScan()}
                      onFocus={e => { e.currentTarget.style.boxShadow = '3px 3px 0 0 #000' }}
                      onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
                    />
                  </div>
                  <button
                    onClick={startValidateScan}
                    disabled={!idea.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-bold text-white transition-all disabled:opacity-40"
                    style={{
                      background: '#F4520E', border: '2px solid #000',
                      borderRadius: '12px', boxShadow: '4px 4px 0 0 #000',
                    }}
                    onMouseEnter={e => { if (idea.trim()) { (e.currentTarget as HTMLElement).style.boxShadow = '6px 6px 0 0 #000'; (e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)' } }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 0 #000'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
                  >
                    Start validation scan <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {(scanning || scanLines.length > 0) && (
                <div className="space-y-5">
                  <ScanLog lines={scanLines} scanning={scanning} />
                  {results.length > 0 && <ValidationReport results={results} />}
                </div>
              )}

              {scanDone && (
                <div className="mt-6">
                  <button
                    onClick={() => router.push(`/project/${currentProjectId}/questions`)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-bold text-white"
                    style={{
                      background: '#000', border: '2px solid #000',
                      borderRadius: '12px', boxShadow: '4px 4px 0 0 #F5E642',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '6px 6px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
                  >
                    Continue to spec builder <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── IDEATE VIEW ── */}
          {showing === 'ideate' && (
            <div className="max-w-2xl mx-auto px-6 py-10">
              <div className="mb-8">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4"
                  style={{ background: '#F4520E', border: '1.5px solid #000', boxShadow: '2px 2px 0 0 #000' }}
                >
                  <Globe className="w-3.5 h-3.5 text-white" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-white" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                    Discover problems
                  </span>
                </div>
                <h2 className="text-[28px] font-extrabold tracking-tight text-black leading-tight">
                  Find a problem worth solving
                </h2>
                <p className="text-[14px] text-black/50 font-medium mt-1">
                  TinyFish will surf Reddit, HN, and review sites to surface real unsolved problems.
                </p>
              </div>

              {!ideateScanning && !ideateDone && (
                <div className="space-y-4">
                  <div>
                    <label
                      className="block text-[11px] font-bold uppercase tracking-[0.1em] text-black/50 mb-2"
                      style={{ fontFamily: 'var(--font-geist-mono)' }}
                    >
                      Domain / market
                    </label>
                    <input
                      style={inputStyle}
                      placeholder="e.g. freelancing, remote work, small business, healthcare..."
                      value={ideateDomain}
                      onChange={e => setIdeateDomain(e.target.value)}
                      onFocus={e => { e.currentTarget.style.boxShadow = '3px 3px 0 0 #000' }}
                      onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[11px] font-bold uppercase tracking-[0.1em] text-black/50 mb-2"
                      style={{ fontFamily: 'var(--font-geist-mono)' }}
                    >
                      Focus area <span className="normal-case font-medium">(optional)</span>
                    </label>
                    <input
                      style={inputStyle}
                      placeholder="e.g. invoicing, team communication, financial reporting..."
                      value={ideateFocus}
                      onChange={e => setIdeateFocus(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && startIdeateScan()}
                      onFocus={e => { e.currentTarget.style.boxShadow = '3px 3px 0 0 #000' }}
                      onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
                    />
                  </div>
                  <button
                    onClick={startIdeateScan}
                    disabled={!ideateDomain.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-bold text-white transition-all disabled:opacity-40"
                    style={{
                      background: '#F4520E', border: '2px solid #000',
                      borderRadius: '12px', boxShadow: '4px 4px 0 0 #000',
                    }}
                    onMouseEnter={e => { if (ideateDomain.trim()) { (e.currentTarget as HTMLElement).style.boxShadow = '6px 6px 0 0 #000'; (e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)' } }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 0 #000'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
                  >
                    Start discovery scan <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {(ideateScanning || ideateLines.length > 0) && (
                <div className="space-y-5">
                  <ScanLog lines={ideateLines} scanning={ideateScanning} />
                  {problems.length > 0 && (
                    <div>
                      <p
                        className="text-[11px] font-bold uppercase tracking-[0.1em] text-black/50 mb-3"
                        style={{ fontFamily: 'var(--font-geist-mono)' }}
                      >
                        Pick a problem to build around
                      </p>
                      <ProblemList problems={problems} onSelect={selectProblem} selected={selectedProblem?.rank} />
                    </div>
                  )}
                </div>
              )}

              {selectedProblem && (
                <div className="mt-6 space-y-3">
                  <div
                    className="px-4 py-3 rounded-xl"
                    style={{ background: '#F0FDF4', border: '2px solid #16a34a' }}
                  >
                    <p className="text-[13px] font-semibold text-green-800">Selected: {selectedProblem.title}</p>
                    <p className="text-[11px] text-green-600 mt-0.5" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                      Opportunity score: {selectedProblem.opportunity_score}/100
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/project/${currentProjectId}/questions`)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-bold text-white"
                    style={{
                      background: '#000', border: '2px solid #000',
                      borderRadius: '12px', boxShadow: '4px 4px 0 0 #F5E642',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '6px 6px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
                  >
                    Build spec for this problem <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
