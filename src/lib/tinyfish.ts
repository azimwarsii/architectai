import type { ScanLine, ValidationResult, Problem } from '@/types'

const BASE = process.env.TINYFISH_API_URL!
const KEY = process.env.TINYFISH_API_KEY!

// --- Validate an idea ---
// Streams scan log lines, then returns validation results
export async function validateIdea(
  idea: string,
  domain: string,
  onLine: (line: ScanLine) => void
): Promise<ValidationResult[]> {
  const res = await fetch(`${BASE}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': KEY },
    body: JSON.stringify({ idea, domain }),
  })

  if (!res.ok) throw new Error('TinyFish validate failed')
  if (!res.body) throw new Error('No stream')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let results: ValidationResult[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = JSON.parse(line.slice(6))

      if (data.type === 'scan_line') {
        onLine(data.line as ScanLine)
      } else if (data.type === 'results') {
        results = data.results as ValidationResult[]
      }
    }
  }

  return results
}

// --- Find problems in a domain ---
// Streams scan log, returns ranked problem list
export async function findProblems(
  domain: string,
  focus: string,
  onLine: (line: ScanLine) => void
): Promise<Problem[]> {
  const res = await fetch(`${BASE}/ideate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': KEY },
    body: JSON.stringify({ domain, focus }),
  })

  if (!res.ok) throw new Error('TinyFish ideate failed')
  if (!res.body) throw new Error('No stream')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let problems: Problem[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = JSON.parse(line.slice(6))

      if (data.type === 'scan_line') {
        onLine(data.line as ScanLine)
      } else if (data.type === 'problems') {
        problems = data.problems as Problem[]
      }
    }
  }

  return problems
}

// --- Fallback mock for development (no TinyFish key yet) ---
export async function mockValidateIdea(
  onLine: (line: ScanLine) => void
): Promise<ValidationResult[]> {
  const lines: ScanLine[] = [
    { text: '→ Searching Reddit r/logistics r/freelance...', kind: 'info', timestamp: 0 },
    { text: '→ Reading Product Hunt comments...', kind: 'info', timestamp: 800 },
    { text: '→ Scanning App Store reviews for competitor apps...', kind: 'info', timestamp: 1600 },
    { text: '✓ Found 34 complaints about tracking drop-off post-pickup', kind: 'success', timestamp: 2400 },
    { text: '✓ 12 Reddit threads: couriers going dark after handoff', kind: 'success', timestamp: 3000 },
    { text: '⚠ 3 funded competitors in space (Piggybee, Roadie, Grabr)', kind: 'warning', timestamp: 3600 },
    { text: '✓ Clear gap: no real-time tracking in P2P delivery segment', kind: 'success', timestamp: 4200 },
    { text: '✓ Validation complete — strong signal found', kind: 'success', timestamp: 4700 },
  ]

  for (const line of lines) {
    await new Promise(r => setTimeout(r, line.timestamp === 0 ? 0 : 600))
    onLine(line)
  }

  return [
    { tag: 'Validated', title: 'Real demand confirmed', body: '34 user complaints, 12 Reddit threads — tracking gap in P2P delivery is genuine with no current solution.', evidence_count: 46 },
    { tag: 'Risk', title: 'Funded competition exists', body: 'Piggybee, Roadie, Grabr operate nearby but none offer real-time GPS tracking. Gap is real.', evidence_count: 3 },
    { tag: 'Opportunity', title: 'Clear wedge: live tracking', body: 'Real-time location from traveller to sender is absent in all 3 competitors. Build here first.' },
  ]
}

export async function mockFindProblems(
  onLine: (line: ScanLine) => void
): Promise<Problem[]> {
  const lines: ScanLine[] = [
    { text: '→ Surfing r/smallbusiness r/freelance r/entrepreneur...', kind: 'info', timestamp: 0 },
    { text: '→ Reading Hacker News "Ask HN: what do you wish existed"...', kind: 'info', timestamp: 700 },
    { text: '→ Scanning G2, Trustpilot for tool complaints...', kind: 'info', timestamp: 1400 },
    { text: '✓ Problem cluster: freelancers losing 4–6hrs/wk chasing invoices', kind: 'success', timestamp: 2100 },
    { text: '✓ Problem cluster: no async standup tool that actually works', kind: 'success', timestamp: 2700 },
    { text: "✓ Problem cluster: SMB owners can't parse their own cash flow", kind: 'success', timestamp: 3300 },
    { text: '⚠ Problem cluster: hiring bias in remote screening (crowded space)', kind: 'warning', timestamp: 3900 },
    { text: '✓ Scan complete — 4 ranked problems surfaced', kind: 'success', timestamp: 4400 },
  ]

  for (const line of lines) {
    await new Promise(r => setTimeout(r, 600))
    onLine(line)
  }

  return [
    { rank: 1, title: "Freelancers can't automate invoice follow-ups", mention_count: 847, evidence_quote: '"I spend more time chasing payment than doing work"', sources: ['Reddit', 'IndieHackers'], opportunity_score: 92 },
    { rank: 2, title: "Async standups never get read by managers", mention_count: 612, evidence_quote: '"Daily updates go into a void — no one acts on blockers"', sources: ['HackerNews', 'Slack communities'], opportunity_score: 78 },
    { rank: 3, title: "SMB owners can't understand their own P&L", mention_count: 489, evidence_quote: '"My accountant gives me a report I can\'t read"', sources: ['Trustpilot', 'G2'], opportunity_score: 71 },
    { rank: 4, title: "Remote hiring screens don't surface soft skills", mention_count: 201, evidence_quote: '"We filter for the wrong things and regret it in week 2"', sources: ['Reddit', 'LinkedIn'], opportunity_score: 55 },
  ]
}
