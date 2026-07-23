import { create } from 'zustand'
import type { ContractType } from '@/types/contract'

interface UploadStore {
  contractType: ContractType
  customTerms: string[]
  setContractType: (type: ContractType) => void
  addCustomTerm: (term: string) => void
  removeCustomTerm: (term: string) => void
  reset: () => void
}

export const useUploadStore = create<UploadStore>((set) => ({
  contractType: 'nda',
  customTerms: [],
  setContractType: (type) => set({ contractType: type }),
  addCustomTerm: (term) =>
    set((state) => ({
      customTerms:
        state.customTerms.length < 5 && !state.customTerms.includes(term)
          ? [...state.customTerms, term]
          : state.customTerms,
    })),
  removeCustomTerm: (term) =>
    set((state) => ({
      customTerms: state.customTerms.filter((t) => t !== term),
    })),
  reset: () => set({ contractType: 'nda', customTerms: [] }),
}))
