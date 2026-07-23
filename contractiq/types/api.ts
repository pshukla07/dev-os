import type { KeyTerm, Contract, ChatMessage } from './contract'

export interface ApiError {
  error: string
  code: number
  field?: string
}

export interface UploadResponse {
  contractId: string
  pageCount: number
  standardTerms: string[]
  contractType: string
}

export interface ProcessResponse {
  contractId: string
  terms: KeyTerm[]
}

export interface ContractListResponse {
  contracts: (Pick<Contract, 'id' | 'name' | 'contract_type' | 'status' | 'page_count' | 'created_at'> & {
    termCount: number
  })[]
  summary: { total: number; nda: number; msa: number }
}

export interface ContractDetailResponse extends Contract {
  signedUrl: string | null
  signedUrlExpiresAt: string | null
  terms: KeyTerm[]
  hasFeedback: boolean
}

export interface ChatResponse {
  sessionId: string
  message: ChatMessage
}

export interface ChatHistoryResponse {
  sessionId: string | null
  messages: ChatMessage[]
}
