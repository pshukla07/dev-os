'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Contract, KeyTerm } from '@/types/contract'
import KeyTermsPanel from './key-terms/KeyTermsPanel'
import ChatTab from './chat/ChatTab'
import PDFViewer from './pdf-viewer/PDFViewer'
import TextViewerFallback from './pdf-viewer/TextViewerFallback'
import DisclaimerBanner from '@/components/shared/DisclaimerBanner'
import FeedbackWidget from '@/components/shared/FeedbackWidget'

interface Props {
  contract: Contract
  keyTerms: KeyTerm[]
  signedUrl: string | null
  hasFeedback: boolean
}

type ActiveTab = 'terms' | 'chat'

export default function ResultsView({ contract, keyTerms, signedUrl, hasFeedback }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('terms')
  const [targetPage, setTargetPage] = useState<number>(1)
  const [terms, setTerms] = useState<KeyTerm[]>(keyTerms)

  function handlePageNavigate(page: number) {
    if (page > 0) setTargetPage(page)
  }

  function handleTermUpdate(updated: KeyTerm) {
    setTerms((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-surface)' }}>
      {/* Nav */}
      <nav className="bg-white border-b border-brand-border flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-ds-grey-300 hover:text-ds-grey-500 text-sm transition-colors duration-100"
          >
            ← Dashboard
          </Link>
          <span className="text-brand-border">/</span>
          <span className="text-sm font-medium text-ds-grey-900 truncate max-w-xs">
            {contract.name}
          </span>
          <div className="ml-auto">
            <span className="badge-neutral">{contract.contract_type}</span>
          </div>
        </div>
      </nav>

      <DisclaimerBanner />

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full px-4 py-4 gap-4 min-h-0">
        {/* Left: PDF / text viewer */}
        <div className="flex-1 min-w-0 card overflow-hidden flex flex-col">
          {signedUrl ? (
            <PDFViewer signedUrl={signedUrl} targetPage={targetPage} />
          ) : (
            <TextViewerFallback
              contractText={contract.contract_text}
              targetPage={targetPage}
            />
          )}
        </div>

        {/* Right: Terms / Chat tabs + Feedback */}
        <div className="w-96 flex-shrink-0 card overflow-hidden flex flex-col">
          {/* Tab switcher */}
          <div className="flex border-b border-brand-border flex-shrink-0">
            {(['terms', 'chat'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition-colors duration-100 ${
                  activeTab === tab
                    ? 'text-brand-primary border-b-2 border-brand-primary bg-ds-blue-50/50'
                    : 'text-ds-grey-500 hover:text-ds-grey-900 hover:bg-brand-surface'
                }`}
              >
                {tab === 'terms'
                  ? `Key Terms (${terms.length})`
                  : 'Chat with Contract'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === 'terms' ? (
              <KeyTermsPanel
                terms={terms}
                onPageNavigate={handlePageNavigate}
                onTermUpdate={handleTermUpdate}
              />
            ) : (
              <ChatTab contractId={contract.id} onPageCite={handlePageNavigate} />
            )}
          </div>

          {/* Feedback widget — always visible at bottom */}
          <div className="flex-shrink-0">
            <FeedbackWidget contractId={contract.id} hasFeedback={hasFeedback} />
          </div>
        </div>
      </div>
    </div>
  )
}
