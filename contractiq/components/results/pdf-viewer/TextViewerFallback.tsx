'use client'

import { useEffect, useRef } from 'react'

interface Props {
  contractText: string
  targetPage: number
}

function parsePages(text: string): { page: number; content: string }[] {
  const parts = text.split(/\[PAGE (\d+)\]/g)
  const pages: { page: number; content: string }[] = []

  for (let i = 1; i < parts.length; i += 2) {
    const pageNum = parseInt(parts[i], 10)
    const content = parts[i + 1]?.trim() ?? ''
    if (content) pages.push({ page: pageNum, content })
  }

  return pages
}

export default function TextViewerFallback({ contractText, targetPage }: Props) {
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const pages = parsePages(contractText)

  useEffect(() => {
    const el = pageRefs.current.get(targetPage)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [targetPage])

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs text-gray-800 leading-relaxed">
      <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 font-sans">
        PDF viewer unavailable — showing extracted text
      </div>
      {pages.map(({ page, content }) => (
        <div
          key={page}
          ref={(el) => { if (el) pageRefs.current.set(page, el) }}
          id={`page-${page}`}
          className={`scroll-mt-4 ${targetPage === page ? 'ring-2 ring-brand-primary ring-offset-2 rounded' : ''}`}
        >
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 font-sans">
            — Page {page} —
          </div>
          <pre className="whitespace-pre-wrap break-words">{content}</pre>
        </div>
      ))}
    </div>
  )
}
