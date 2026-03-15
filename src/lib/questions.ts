import type { SpecAnswers } from '@/types'

export type QuestionType = 'single' | 'multi' | 'free'

export interface Question {
  id: keyof SpecAnswers
  section: string
  progressPct: number
  message: string
  type: QuestionType
  options?: string[]
  // Branch: skip this question based on prior answers
  skipIf?: (answers: SpecAnswers) => boolean
  // After answer: return an extra AI message
  followUp?: (answer: string | string[], answers: SpecAnswers) => string | null
}

export const QUESTIONS: Question[] = [
  {
    id: 'control',
    section: 'Control preference',
    progressPct: 5,
    message: "Your idea's been validated. Before we spec it out — how much control do you want over the tech?\n\nThis shapes everything: the stack I recommend, the questions I ask, and how tasks get handed to your coding agent.",
    type: 'single',
    options: [
      'Full control — I want to choose every layer',
      "Guided — suggest a stack, I'll approve it",
      'Hands-off — just pick what works',
    ],
    followUp: (answer) => {
      if (typeof answer !== 'string') return null
      if (answer.includes('Full control')) {
        return "Since you want full control, I'll ask about each layer. Suggested starting point:\n\n• **Frontend:** Next.js (React, SSR, routing)\n• **Backend:** Node.js + Hono\n• **Database:** PostgreSQL via Supabase\n• **Auth:** Supabase Auth or Clerk\n• **Hosting:** Vercel + Railway\n\nAll overridable on the canvas."
      }
      if (answer.includes('Guided')) {
        return "Good. I'll recommend a stack for your product type and you approve before we finalise tasks. My default for most products: **Next.js + Supabase** — covers auth, DB, storage, and real-time in one platform."
      }
      return "Perfect. I'll pick everything and explain what each piece does in plain language. No jargon required."
    },
  },
  {
    id: 'platform',
    section: 'Platform',
    progressPct: 15,
    message: 'What kind of product are we building?',
    type: 'single',
    options: [
      'Web app',
      'Mobile app (iOS + Android)',
      'Mobile app (single platform)',
      'Desktop app',
      'Browser extension',
      'API / backend only',
    ],
  },
  {
    id: 'users',
    section: 'User roles',
    progressPct: 25,
    message: 'Who uses this product? Select all that apply.',
    type: 'multi',
    options: [
      'End users (consumers)',
      'Business customers (B2B)',
      'Admin / ops team',
      'Third-party vendors / partners',
      'Internal team only',
    ],
  },
  {
    id: 'auth',
    section: 'Authentication',
    progressPct: 35,
    message: 'How should users log in?',
    type: 'multi',
    options: [
      'Email + password',
      'Google / social OAuth',
      'Magic link (passwordless email)',
      'Phone OTP',
      'No auth — public access',
    ],
  },
  {
    id: 'pages',
    section: 'Core pages',
    progressPct: 45,
    message: "Which screens does your product need? I'll map each to a dev task.",
    type: 'multi',
    options: [
      'Landing / marketing page',
      'Onboarding flow',
      'Main dashboard',
      'User profile',
      'Settings',
      'Admin panel',
      'Notifications',
      'Billing / subscription',
    ],
  },
  {
    id: 'data',
    section: 'Data & storage',
    progressPct: 55,
    message: 'Does your product need to store user data, files, or run complex queries?',
    type: 'single',
    options: [
      'Yes — full relational database',
      'Yes — simple key-value / NoSQL',
      'Files and media uploads only',
      'Minimal — mostly third-party data',
      'Not sure yet',
    ],
  },
  {
    id: 'realtime',
    section: 'Real-time features',
    progressPct: 65,
    message: 'Any real-time requirements? These significantly affect backend architecture.',
    type: 'multi',
    options: [
      'Live notifications',
      'Real-time data updates (tracking, feeds)',
      'In-app chat / messaging',
      'Collaborative editing',
      'None needed',
    ],
  },
  {
    id: 'payments',
    section: 'Payments',
    progressPct: 78,
    message: 'Will money move through this product?',
    type: 'single',
    options: [
      'Yes — one-time payments',
      'Yes — subscriptions / recurring',
      'Yes — marketplace / escrow between users',
      'Multiple payment types',
      'No payments needed',
    ],
  },
  {
    id: 'integrations',
    section: 'Integrations',
    progressPct: 90,
    message: 'Any third-party services you know you need?',
    type: 'multi',
    options: [
      'Maps / location (Google Maps, Mapbox)',
      'Email (SendGrid, Resend)',
      'SMS / push (Twilio, Expo)',
      'Analytics (Mixpanel, PostHog)',
      'AI / LLM API',
      'None yet',
    ],
  },
  {
    id: 'timeline',
    section: 'Timeline',
    progressPct: 97,
    message: "Last one — what's your build urgency? This helps me scope the MVP.",
    type: 'single',
    options: [
      'ASAP — ship an MVP in weeks',
      'Methodical — 2–3 months, get it right',
      'Exploring — no fixed deadline',
    ],
  },
]

// Generate stack recommendation from answers
export function generateStackRecommendation(answers: SpecAnswers) {
  const isFullControl = answers.control?.includes('Full control')
  const needsRealtime = answers.realtime?.some(r => !r.includes('None'))
  const needsPayments = !answers.payments?.includes('No payments')
  const isMobile = answers.platform?.includes('Mobile')

  return {
    frontend: isMobile ? 'React Native (Expo)' : 'Next.js 14 (App Router)',
    backend: 'Supabase Edge Functions + Row Level Security',
    database: 'PostgreSQL via Supabase',
    auth: 'Supabase Auth',
    hosting: isMobile ? ['Expo EAS', 'Supabase'] : ['Vercel (frontend)', 'Supabase (backend)'],
    extras: [
      ...(needsRealtime ? ['Supabase Realtime'] : []),
      ...(needsPayments ? ['Stripe'] : []),
      ...(answers.integrations?.includes('Maps / location (Google Maps, Mapbox)') ? ['Mapbox GL JS'] : []),
      ...(answers.integrations?.includes('AI / LLM API') ? ['Anthropic Claude API (via Vercel AI SDK)'] : []),
    ],
    reasoning: isFullControl
      ? 'Full control stack — every layer chosen for flexibility and override-ability. All replaceable on the canvas.'
      : 'Recommended stack optimised for speed to ship. Supabase handles auth, DB, storage, and real-time so you build features, not infrastructure.',
  }
}

// Map spec answers to initial canvas nodes
export function generateInitialNodes(answers: SpecAnswers, projectId: string) {
  const nodes = []

  // Always create a feature proposal node
  nodes.push({
    project_id: projectId,
    type: 'feature' as const,
    title: 'Core feature — MVP',
    body: `Platform: ${answers.platform} · Users: ${answers.users?.join(', ')}`,
    status: 'open' as const,
    position: { x: 280, y: 100 },
  })

  // Auth node
  if (answers.auth && !answers.auth.includes('No auth')) {
    nodes.push({
      project_id: projectId,
      type: 'ui_change' as const,
      title: 'Auth system',
      body: `Methods: ${answers.auth.join(', ')}`,
      status: 'open' as const,
      position: { x: 60, y: 100 },
    })
  }

  // Data model node
  if (answers.data && !answers.data.includes('Not sure')) {
    nodes.push({
      project_id: projectId,
      type: 'data_model' as const,
      title: 'Data model',
      body: `Storage: ${answers.data}`,
      status: 'open' as const,
      position: { x: 280, y: 280 },
    })
  }

  // Payments node
  if (answers.payments && !answers.payments.includes('No payments')) {
    nodes.push({
      project_id: projectId,
      type: 'feature' as const,
      title: 'Payment integration',
      body: answers.payments,
      status: 'open' as const,
      position: { x: 500, y: 100 },
    })
  }

  return nodes
}
