'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  contractId: string
}

export default function RetryProcessingButton({ contractId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRetry() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/contracts/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId, customTerms: [] }),
    })

    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Retry failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="text-center">
      {error && (
        <p role="alert" className="text-sm text-brand-error mb-3">{error}</p>
      )}
      <button
        onClick={handleRetry}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? 'Retrying…' : 'Retry Analysis'}
      </button>
    </div>
  )
}
