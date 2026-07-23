import { redirect } from 'next/navigation'
import { createServerClient as createSupabaseClient } from '@/lib/supabase/server'
import UploadForm from '@/components/upload/UploadForm'

export default async function UploadPage() {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  return (
    <div className="min-h-screen bg-brand-surface">
      <nav className="bg-white border-b border-brand-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
          <a href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium text-sm">Review a Contract</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Review a Contract</h1>
          <p className="text-gray-500">
            Upload your NDA or MSA. We&apos;ll extract every key term in under 30 seconds.
          </p>
        </div>
        <UploadForm />
      </main>
    </div>
  )
}
