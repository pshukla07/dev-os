'use client'

import { useState, useEffect, useRef } from 'react'
import type { ChatMessage, QueryContext } from '@/types/contract'

interface Props {
  contractId: string
  onPageCite: (page: number) => void
}

interface SourceBadgeProps {
  contextType: QueryContext | null
  pageCitation: number | null
  onPageCite: (page: number) => void
}

function SourceBadge({ contextType, pageCitation, onPageCite }: SourceBadgeProps) {
  if (contextType === 'history') {
    return (
      <span className="mt-2 text-xs text-ds-grey-500 flex items-center gap-1">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-ds-grey-300" />
        From conversation
      </span>
    )
  }

  if (contextType === 'both') {
    return (
      <div className="mt-2 flex flex-col gap-0.5">
        {pageCitation && (
          <button
            onClick={() => onPageCite(pageCitation)}
            className="text-xs text-brand-primary underline hover:no-underline text-left"
          >
            Source: Page {pageCitation}
          </button>
        )}
        <span className="text-xs text-ds-grey-500 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-ds-grey-300" />
          + From conversation
        </span>
      </div>
    )
  }

  // CONTRACT context (or null for legacy messages)
  if (pageCitation) {
    return (
      <button
        onClick={() => onPageCite(pageCitation)}
        className="mt-2 text-xs text-brand-primary underline hover:no-underline block"
      >
        Source: Page {pageCitation}
      </button>
    )
  }

  return null
}

function loadingLabel(context: QueryContext | null): string {
  if (context === 'history') return 'Searching conversation…'
  if (context === 'both')    return 'Checking contract + conversation…'
  return 'Analysing document…'
}

// Lightweight client-side pre-classifier to drive the loading message while
// the server computes the authoritative classification.
function preClassify(message: string, hasHistory: boolean): QueryContext | null {
  if (!hasHistory) return null
  if (/\byou (said|mentioned|told me|explained)\b/i.test(message)) return 'history'
  return null
}

export default function ChatTab({ contractId, onPageCite }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingContext, setPendingContext] = useState<QueryContext | null>(null)
  const [initialized, setInitialized] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/chat/${contractId}`)
      .then((r) => r.json())
      .then(({ messages: msgs, sessionId: sid }) => {
        setMessages(msgs ?? [])
        setSessionId(sid)
        setInitialized(true)
      })
  }, [contractId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const content = input.trim()
    if (!content || loading) return

    // Pre-classify for loading label (best-effort, server is authoritative)
    const preCtx = preClassify(content, messages.length > 0)
    setPendingContext(preCtx)

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: sessionId ?? '',
      user_id: '',
      role: 'user',
      content,
      page_citation: null,
      context_type: null,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId, sessionId, message: content }),
    })

    const json = await res.json()

    if (!res.ok || !json.message) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        session_id: sessionId ?? '',
        user_id: '',
        role: 'assistant',
        content: json.error ?? 'Something went wrong. Please try again.',
        page_citation: null,
        context_type: null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } else {
      if (json.sessionId) setSessionId(json.sessionId)
      setMessages((prev) => [...prev, json.message])
    }

    setPendingContext(null)
    setLoading(false)
  }

  if (!initialized) {
    return <div className="p-6 text-center text-sm text-ds-grey-500">Loading chat…</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-ds-grey-500 mt-8">
            <div className="text-3xl mb-3">💬</div>
            <p>Ask anything about your contract.</p>
            <p className="text-xs mt-1 text-ds-grey-300">
              e.g. &ldquo;What happens if I breach the NDA?&rdquo;
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-brand-primary text-white'
                  : 'bg-ds-grey-50 text-ds-grey-900'
              }`}
            >
              <p className="leading-relaxed">{msg.content}</p>
              {msg.role === 'assistant' && (
                <SourceBadge
                  contextType={msg.context_type}
                  pageCitation={msg.page_citation}
                  onPageCite={onPageCite}
                />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-ds-grey-50 rounded-xl px-4 py-3 text-sm text-ds-grey-500 animate-pulse">
              {loadingLabel(pendingContext)}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-brand-border p-3 flex gap-2 flex-shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask about this contract…"
          disabled={loading}
          className="input text-sm py-2 flex-1"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="btn-primary px-4 py-2 text-sm"
        >
          Send
        </button>
      </div>
    </div>
  )
}
