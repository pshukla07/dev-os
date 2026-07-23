'use client'

import { useState } from 'react'
import type { KeyTerm } from '@/types/contract'
import ConfidenceBadge from './ConfidenceBadge'

interface Props {
  term: KeyTerm
  onPageNavigate: (page: number) => void
  onTermUpdate: (term: KeyTerm) => void
}

export default function KeyTermCard({ term, onPageNavigate, onTermUpdate }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(term.value)
  const [saving, setSaving] = useState(false)

  const isLowConfidence = term.confidence_score < 0.5

  async function handleSave() {
    if (editValue.trim() === term.value) {
      setEditing(false)
      return
    }
    setSaving(true)
    const res = await fetch(`/api/key-terms/${term.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: editValue.trim() }),
    })
    if (res.ok) {
      const updated = await res.json()
      onTermUpdate(updated)
    }
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className={`p-4 ${isLowConfidence ? 'bg-red-50/30' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {term.term_name}
          </span>
          {term.is_custom && <span className="badge-custom">Custom</span>}
          {term.is_edited && <span className="badge-edited">Edited</span>}
        </div>
        <ConfidenceBadge score={term.confidence_score} />
      </div>

      {/* Value */}
      {editing ? (
        <div className="flex gap-2 mb-2">
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            className="input text-sm py-1.5 flex-1"
            autoFocus
          />
          <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="btn-ghost text-xs px-3 py-1.5">
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-gray-900 font-medium text-left hover:text-brand-primary transition-colors w-full mb-2"
          title="Click to edit"
        >
          {term.value}
        </button>
      )}

      {isLowConfidence && !editing && (
        <div
          role="alert"
          className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 mb-2"
        >
          ⚠️ Low confidence — verify this in the document directly.
        </div>
      )}

      {/* Page + Why */}
      <div className="flex items-center gap-3 text-xs">
        <button
          onClick={() => onPageNavigate(term.page_number)}
          className="text-brand-primary hover:underline font-medium"
        >
          Page {term.page_number}
        </button>
        <button
          onClick={() => setExpanded((p) => !p)}
          className="text-gray-400 hover:text-gray-600"
        >
          {expanded ? 'Hide source ↑' : 'Why? ↓'}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 p-2 rounded bg-gray-50 border border-gray-100 text-xs text-gray-600 italic leading-relaxed">
          &ldquo;{term.source_sentence}&rdquo;
        </div>
      )}
    </div>
  )
}
