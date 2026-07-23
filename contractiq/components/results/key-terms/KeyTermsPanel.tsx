'use client'

import type { KeyTerm } from '@/types/contract'
import KeyTermCard from './KeyTermCard'

interface Props {
  terms: KeyTerm[]
  onPageNavigate: (page: number) => void
  onTermUpdate: (term: KeyTerm) => void
}

export default function KeyTermsPanel({ terms, onPageNavigate, onTermUpdate }: Props) {
  if (terms.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        No key terms extracted yet.
      </div>
    )
  }

  const lowConfidenceCount = terms.filter((t) => t.confidence_score < 0.5).length

  return (
    <div>
      {lowConfidenceCount > 0 && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700 flex items-start gap-2">
          <span>⚠️</span>
          <span>
            {lowConfidenceCount} term{lowConfidenceCount > 1 ? 's' : ''} have low confidence.
            We recommend verifying these in the document directly.
          </span>
        </div>
      )}
      <div className="divide-y divide-brand-border">
        {terms.map((term) => (
          <KeyTermCard
            key={term.id}
            term={term}
            onPageNavigate={onPageNavigate}
            onTermUpdate={onTermUpdate}
          />
        ))}
      </div>
    </div>
  )
}
