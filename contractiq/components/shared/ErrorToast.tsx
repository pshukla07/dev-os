'use client'

import { useEffect } from 'react'

interface Props {
  message: string
  onDismiss: () => void
  durationMs?: number
}

export default function ErrorToast({ message, onDismiss, durationMs = 5000 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(timer)
  }, [onDismiss, durationMs])

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-4 right-4 z-50 flex items-start gap-3 max-w-sm
                 bg-white border border-brand-error rounded-lg shadow-lg px-4 py-3"
    >
      <span className="text-brand-error mt-0.5 flex-shrink-0">✕</span>
      <p className="text-sm text-ds-grey-900 flex-1">{message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="text-ds-grey-300 hover:text-ds-grey-500 flex-shrink-0 text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}
