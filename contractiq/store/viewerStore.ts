import { create } from 'zustand'

interface ViewerStore {
  targetPage: number
  setTargetPage: (page: number) => void
}

export const useViewerStore = create<ViewerStore>((set) => ({
  targetPage: 1,
  setTargetPage: (page) => set({ targetPage: page }),
}))
