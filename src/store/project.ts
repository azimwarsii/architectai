import { create } from 'zustand'
import type { Project, TinyfishReport, SpecAnswers } from '@/types'

interface ProjectStore {
  project: Project | null
  setProject: (p: Project) => void
  updateSpecAnswers: (answers: SpecAnswers) => void
  setTinyfishReport: (report: TinyfishReport) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  project: null,
  setProject: (project) => set({ project }),
  updateSpecAnswers: (answers) =>
    set(state => state.project
      ? { project: { ...state.project, spec_answers: answers } }
      : {}
    ),
  setTinyfishReport: (report) =>
    set(state => state.project
      ? { project: { ...state.project, tinyfish_report: report } }
      : {}
    ),
}))
