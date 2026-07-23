import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import ResultsView from '@/components/results/ResultsView'
import RetryProcessingButton from '@/components/results/RetryProcessingButton'
import Link from 'next/link'

interface Props {
  params: { contractId: string }
}

export default async function ResultsPage({ params }: Props) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: contract } = await supabase
    .from('contracts')
    .select('*, key_terms(*)')
    .eq('id', params.contractId)
    .eq('user_id', user.id)
    .single()

  if (!contract) notFound()

  // Update last_accessed_at (fire-and-forget)
  supabase
    .from('contracts')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', params.contractId)

  // In-progress state
  if (contract.status === 'uploaded' || contract.status === 'processing') {
    return (
      <div className="min-h-screen bg-brand-surface flex items-center justify-center">
        <div className="card p-12 text-center max-w-sm">
          <div className="text-4xl mb-4 animate-spin">⚙️</div>
          <h2 className="text-lg font-medium text-ds-grey-900 mb-2">
            Analysing your contract…
          </h2>
          <p className="text-sm text-ds-grey-500 mb-6">
            This usually takes under 30 seconds. Refresh to check progress.
          </p>
          <Link href={`/results/${params.contractId}`} className="btn-primary">
            Refresh
          </Link>
        </div>
      </div>
    )
  }

  // Error state (no key terms yet, allow retry)
  if (contract.status === 'error' && (!contract.key_terms || contract.key_terms.length === 0)) {
    return (
      <div className="min-h-screen bg-brand-surface flex items-center justify-center">
        <div className="card p-12 text-center max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-medium text-ds-grey-900 mb-2">Analysis failed</h2>
          <p className="text-sm text-ds-grey-500 mb-6">
            {contract.error_message ?? 'Something went wrong during analysis.'}
          </p>
          <RetryProcessingButton contractId={params.contractId} />
          <Link href="/dashboard" className="btn-ghost mt-3 w-full justify-center">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Get signed URL (non-blocking)
  let signedUrl: string | null = null
  if (contract.file_path) {
    const { data } = await supabase.storage
      .from('contracts')
      .createSignedUrl(contract.file_path, 3600)
    signedUrl = data?.signedUrl ?? null
  }

  // Check if user already submitted feedback
  const { data: feedback } = await supabase
    .from('user_feedback')
    .select('id')
    .eq('contract_id', params.contractId)
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <ResultsView
      contract={contract}
      keyTerms={contract.key_terms ?? []}
      signedUrl={signedUrl}
      hasFeedback={!!feedback}
    />
  )
}
