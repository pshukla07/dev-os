'use client'

import { useState } from 'react'

interface Props {
  contractId: string
  hasFeedback: boolean
}

type Rating = 'up' | 'down'

export default function FeedbackWidget({ contractId, hasFeedback }: Props) {
  const [rating, setRating] = useState<Rating | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(hasFeedback)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (submitted) {
    return (
      <div className="px-4 py-3 border-t border-brand-border">
        <p className="text-xs text-confidence-high font-medium text-center">
          ✓ Thanks for your feedback
        </p>
      </div>
    )
  }

  async function handleSubmit() {
    if (!rating) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId, rating, comment: comment || undefined }),
    })

    if (res.ok || res.status === 409) {
      setSubmitted(true)
    } else {
      setError('Could not save feedback. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="px-4 py-3 border-t border-brand-border">
      <p className="text-xs text-ds-grey-500 mb-2">Was this extraction accurate?</p>

      <div className="flex gap-2 mb-2">
        {(['up', 'down'] as Rating[]).map((r) => (
          <button
            key={r}
            onClick={() => setRating(r)}
            aria-pressed={rating === r}
            className={`flex-1 py-1.5 rounded-md text-sm border transition-colors duration-100 ${
              rating === r
                ? r === 'up'
                  ? 'bg-confidence-high-bg border-confidence-high text-confidence-high'
                  : 'bg-confidence-low-bg border-confidence-low text-confidence-low'
                : 'border-brand-border text-ds-grey-500 hover:border-ds-grey-200 hover:bg-brand-surface'
            }`}
          >
            {r === 'up' ? '👍' : '👎'}
          </button>
        ))}
      </div>

      {rating && (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional comment…"
          rows={2}
          maxLength={1000}
          className="input text-xs resize-none mb-2"
        />
      )}

      {error && (
        <p role="alert" className="text-xs text-brand-error mb-2">{error}</p>
      )}

      {rating && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary w-full text-xs py-1.5"
        >
          {loading ? 'Submitting…' : 'Submit Feedback'}
        </button>
      )}
    </div>
  )
}
