export type ContractType = 'nda' | 'msa'
export type ContractStatus = 'uploaded' | 'processing' | 'processed' | 'error'

export interface Contract {
  id: string
  user_id: string
  name: string
  contract_type: ContractType
  contract_text: string
  file_path: string | null
  status: ContractStatus
  page_count: number
  token_estimate: number | null
  error_message: string | null
  last_accessed_at: string
  created_at: string
  updated_at: string
}

export interface KeyTerm {
  id: string
  contract_id: string
  user_id: string
  term_name: string
  value: string
  original_ai_value: string | null
  page_number: number
  confidence_score: number
  source_sentence: string
  is_custom: boolean
  is_edited: boolean
  created_at: string
  updated_at: string
}

export interface ChatSession {
  id: string
  contract_id: string
  user_id: string
  created_at: string
}

export type ChatRole = 'user' | 'assistant'
export type QueryContext = 'contract' | 'history' | 'both'

export interface ChatMessage {
  id: string
  session_id: string
  user_id: string
  role: ChatRole
  content: string
  page_citation: number | null
  context_type: QueryContext | null  // null on user messages and pre-v2 assistant messages
  created_at: string
}

export interface UserFeedback {
  id: string
  contract_id: string
  user_id: string
  rating: 'up' | 'down'
  comment: string | null
  created_at: string
}
