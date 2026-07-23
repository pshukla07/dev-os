import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/shared/SignOutButton'

function StatusBadge({ status }: { status: string }) {
  if (status === 'processed') return <span className="badge-success">Processed</span>
  if (status === 'error')     return <span className="badge-error">Error</span>
  return <span className="badge-warning capitalize">{status}</span>
}

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, name, contract_type, status, page_count, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const total    = contracts?.length ?? 0
  const ndaCount = contracts?.filter((c) => c.contract_type === 'nda').length ?? 0
  const msaCount = contracts?.filter((c) => c.contract_type === 'msa').length ?? 0

  return (
    <div className="min-h-screen bg-brand-surface">
      {/* Nav */}
      <nav className="bg-white border-b border-brand-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-base font-medium text-ds-grey-900">ContractIQ</span>
          <SignOutButton />
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-ds-grey-900">Dashboard</h1>
            <p className="text-sm text-ds-grey-500 mt-0.5">{user.email}</p>
          </div>
          <Link href="/upload" className="btn-primary">
            + Review a Contract
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Contracts', value: total },
            { label: 'NDAs',            value: ndaCount },
            { label: 'MSAs',            value: msaCount },
          ].map((s) => (
            <div key={s.label} className="card p-6">
              <div className="text-3xl font-semibold text-ds-grey-900">{s.value}</div>
              <div className="text-sm text-ds-grey-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Contract table or empty state */}
        {total === 0 ? (
          <div className="card p-16 text-center">
            <div className="text-4xl mb-4">📄</div>
            <h2 className="text-lg font-medium text-ds-grey-900 mb-2">
              No contracts reviewed yet
            </h2>
            <p className="text-sm text-ds-grey-500 mb-6 max-w-sm mx-auto">
              Upload your first NDA or MSA to get started — results in under 30 seconds.
            </p>
            <Link href="/upload" className="btn-primary">
              Upload Your First Contract
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border bg-brand-surface">
                  <th className="text-left px-6 py-3 text-xs font-medium text-ds-grey-500 uppercase tracking-wide">
                    Contract
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ds-grey-500 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ds-grey-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ds-grey-500 uppercase tracking-wide">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {contracts?.map((c) => (
                  <tr key={c.id} className="hover:bg-brand-surface transition-colors duration-100">
                    <td className="px-6 py-4">
                      <Link
                        href={`/results/${c.id}`}
                        className="text-brand-primary font-medium hover:underline truncate block max-w-xs"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge-neutral">{c.contract_type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-6 py-4 text-ds-grey-500">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
