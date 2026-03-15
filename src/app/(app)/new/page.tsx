'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lightbulb, Globe, ArrowLeft, ArrowRight } from 'lucide-react'

type Step = 'choose' | 'validate' | 'ideate'

const TF = 'var(--font-host-grotesk, ui-sans-serif, system-ui, sans-serif)'
const MONO = 'var(--font-geist-mono, monospace)'

const DOMAIN_CHIPS = ['Remote work', 'Logistics', 'Healthcare', 'SMB finance', 'Creator tools', 'EdTech', 'Legal', 'Real estate', 'Dev tools']

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('choose')
  const [launching, setLaunching] = useState(false)

  // Validate form state
  const [idea, setIdea] = useState('')
  const [domain, setDomain] = useState('')

  // Ideate form state
  const [selectedDomain, setSelectedDomain] = useState('')
  const [customDomain, setCustomDomain] = useState('')

  const ideateDomain = customDomain.trim() || selectedDomain

  const inputBase: React.CSSProperties = {
    width: '100%', fontSize: 14, fontWeight: 500,
    border: '2px solid #000', borderRadius: 10, padding: '11px 14px',
    background: '#fff', fontFamily: TF, outline: 'none',
    boxSizing: 'border-box', transition: 'box-shadow .12s',
  }
  const textareaBase: React.CSSProperties = { ...inputBase, resize: 'none', minHeight: 100 }

  async function launchValidate() {
    if (!idea.trim() || launching) return
    setLaunching(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLaunching(false); return }
    const { data } = await supabase.from('projects')
      .insert({ user_id: user.id, name: '', entry_path: 'has_idea', status: 'intake', raw_idea: idea, domain: domain || null })
      .select().single()
    if (!data) { setLaunching(false); return }
    sessionStorage.setItem('tf-scan-params', JSON.stringify({ mode: 'validate', idea, domain, autostart: true }))
    router.push(`/project/${data.id}/validate`)
  }

  async function launchIdeate() {
    if (!ideateDomain || launching) return
    setLaunching(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLaunching(false); return }
    const { data } = await supabase.from('projects')
      .insert({ user_id: user.id, name: '', entry_path: 'needs_idea', status: 'intake', domain: ideateDomain })
      .select().single()
    if (!data) { setLaunching(false); return }
    sessionStorage.setItem('tf-scan-params', JSON.stringify({ mode: 'ideate', domain: ideateDomain, autostart: true }))
    router.push(`/project/${data.id}/ideate`)
  }

  return (
    <div className="flex h-screen items-center justify-center overflow-auto py-12" style={{ background: '#FAFAF8', fontFamily: TF }}>
      <div style={{ width: '100%', maxWidth: 560, padding: '0 24px' }}>

        {/* ── CHOOSE ── */}
        {step === 'choose' && (
          <div style={{ animation: 'fadeUp .2s ease both' }}>
            <div className="text-center mb-8">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#F5E642', border: '2px solid #000', boxShadow: '2px 2px 0 0 #000', borderRadius: 8, padding: '5px 12px', marginBottom: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: MONO }}>TinyFish</span>
              </div>
              <h1 style={{ fontSize: 34, fontWeight: 900, color: '#000', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>Where are you starting?</h1>
              <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', fontWeight: 500 }}>Tell us where you are — we'll tailor the experience</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button onClick={() => setStep('validate')} className="group" style={{ textAlign: 'left', padding: 20, borderRadius: 14, cursor: 'pointer', border: '2px solid #000', background: '#fff', boxShadow: '4px 4px 0 0 #000', transition: 'all .14s' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#F5E642'; el.style.boxShadow = '6px 6px 0 0 #000'; el.style.transform = 'translate(-2px,-2px)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#fff'; el.style.boxShadow = '4px 4px 0 0 #000'; el.style.transform = 'none' }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5E642', border: '2px solid #000', boxShadow: '2px 2px 0 0 #000', marginBottom: 12 }}>
                  <Lightbulb style={{ width: 18, height: 18, color: '#000' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#000', marginBottom: 5 }}>I have an idea</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', lineHeight: 1.5 }}>Validate it against real market signals and user complaints.</div>
              </button>

              <button onClick={() => setStep('ideate')} style={{ textAlign: 'left', padding: 20, borderRadius: 14, cursor: 'pointer', border: '2px solid #000', background: '#FFF8F5', boxShadow: '4px 4px 0 0 #000', transition: 'all .14s' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#FFE0D4'; el.style.boxShadow = '6px 6px 0 0 #000'; el.style.transform = 'translate(-2px,-2px)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#FFF8F5'; el.style.boxShadow = '4px 4px 0 0 #000'; el.style.transform = 'none' }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4520E', border: '2px solid #000', boxShadow: '2px 2px 0 0 #000', marginBottom: 12 }}>
                  <Globe style={{ width: 18, height: 18, color: '#fff' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#000', marginBottom: 5 }}>I need an idea</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', lineHeight: 1.5 }}>Scan the web for real unsolved problems ranked by opportunity.</div>
              </button>
            </div>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 10, color: 'rgba(0,0,0,0.25)', fontFamily: MONO, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Powered by TinyFish market intelligence</p>
          </div>
        )}

        {/* ── VALIDATE FORM ── */}
        {step === 'validate' && (
          <div style={{ animation: 'fadeUp .18s ease both' }}>
            <button onClick={() => setStep('choose')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.4)', cursor: 'pointer', background: 'none', border: 'none', marginBottom: 24, padding: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#000' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(0,0,0,0.4)' }}>
              <ArrowLeft style={{ width: 14, height: 14 }} /> Back
            </button>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F5E642', border: '2px solid #000', boxShadow: '2px 2px 0 0 #000', borderRadius: 8, padding: '5px 12px', marginBottom: 16 }}>
              <Lightbulb style={{ width: 12, height: 12, color: '#000' }} />
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: MONO }}>Validate idea</span>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#000', letterSpacing: '-0.02em', marginBottom: 6 }}>Tell us your idea</h2>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', fontWeight: 500, marginBottom: 22 }}>TinyFish will scan for real demand signals, competitor gaps, and user pain points.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.45)', fontFamily: MONO, marginBottom: 7 }}>Your idea</label>
                <textarea style={textareaBase} placeholder="e.g. A real-time tracking app for peer-to-peer package delivery between travellers…" value={idea} onChange={e => setIdea(e.target.value)}
                  onFocus={e => { e.currentTarget.style.boxShadow = '3px 3px 0 0 #000' }} onBlur={e => { e.currentTarget.style.boxShadow = 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.45)', fontFamily: MONO, marginBottom: 7 }}>
                  Domain / market <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, opacity: 0.7 }}>(optional)</span>
                </label>
                <input style={inputBase} placeholder="e.g. logistics, edtech, fintech…" value={domain} onChange={e => setDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && launchValidate()}
                  onFocus={e => { e.currentTarget.style.boxShadow = '3px 3px 0 0 #000' }} onBlur={e => { e.currentTarget.style.boxShadow = 'none' }} />
              </div>
              <button onClick={launchValidate} disabled={!idea.trim() || launching}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: '2px solid #000', background: launching ? '#555' : '#F4520E', color: '#fff', fontSize: 14, fontWeight: 800, cursor: idea.trim() && !launching ? 'pointer' : 'not-allowed', fontFamily: TF, boxShadow: '4px 4px 0 0 #000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .14s', opacity: !idea.trim() ? 0.5 : 1 }}
                onMouseEnter={e => { if (idea.trim() && !launching) { (e.currentTarget as HTMLElement).style.boxShadow = '6px 6px 0 0 #000'; (e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)' } }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 0 #000'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>
                {launching ? 'Starting scan…' : <><span>Start validation scan</span><ArrowRight style={{ width: 16, height: 16 }} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── IDEATE FORM ── */}
        {step === 'ideate' && (
          <div style={{ animation: 'fadeUp .18s ease both' }}>
            <button onClick={() => setStep('choose')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.4)', cursor: 'pointer', background: 'none', border: 'none', marginBottom: 24, padding: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#000' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(0,0,0,0.4)' }}>
              <ArrowLeft style={{ width: 14, height: 14 }} /> Back
            </button>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F4520E', border: '2px solid #000', boxShadow: '2px 2px 0 0 #000', borderRadius: 8, padding: '5px 12px', marginBottom: 16 }}>
              <Globe style={{ width: 12, height: 12, color: '#fff' }} />
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: MONO, color: '#fff' }}>Discover problems</span>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#000', letterSpacing: '-0.02em', marginBottom: 6 }}>Find a problem worth solving</h2>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', fontWeight: 500, marginBottom: 22 }}>TinyFish will surf Reddit, HN, and review sites to surface real unsolved problems.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.45)', fontFamily: MONO, marginBottom: 9 }}>Pick a domain</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
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
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.45)', fontFamily: MONO, marginBottom: 7 }}>
                  Or describe your own
                </label>
                <input style={inputBase} placeholder="e.g. peer-to-peer logistics, creator monetisation…" value={customDomain} onChange={e => setCustomDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && launchIdeate()}
                  onFocus={e => { e.currentTarget.style.boxShadow = '3px 3px 0 0 #000' }} onBlur={e => { e.currentTarget.style.boxShadow = 'none' }} />
              </div>
              <button onClick={launchIdeate} disabled={!ideateDomain || launching}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: '2px solid #000', background: launching ? '#555' : '#000', color: '#fff', fontSize: 14, fontWeight: 800, cursor: ideateDomain && !launching ? 'pointer' : 'not-allowed', fontFamily: TF, boxShadow: '4px 4px 0 0 #F5E642', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .14s', opacity: !ideateDomain ? 0.5 : 1 }}
                onMouseEnter={e => { if (ideateDomain && !launching) { (e.currentTarget as HTMLElement).style.boxShadow = '6px 6px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)' } }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>
                {launching ? 'Starting scan…' : <><span>Start discovery scan</span><ArrowRight style={{ width: 16, height: 16 }} /></>}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}
