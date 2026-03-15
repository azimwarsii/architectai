'use client'
import { AppSidebar } from '@/components/shared/AppSidebar'
import { QuestionEngine } from './QuestionEngine'

interface Props {
  projectId: string
  tinyfishReport?: object
}

export function QuestionsPageClient({ projectId, tinyfishReport }: Props) {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ fontFamily: 'var(--font-host-grotesk), ui-sans-serif, system-ui, sans-serif' }}
    >
      <AppSidebar currentProjectId={projectId} />
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <QuestionEngine projectId={projectId} tinyfishReport={tinyfishReport} />
      </div>
    </div>
  )
}
