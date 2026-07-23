import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!params.id || !UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'Invalid contract ID', code: 400 }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 401 }, { status: 401 })

  const { data: contract, error } = await supabase
    .from('contracts')
    .select('*, key_terms(*)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !contract) return NextResponse.json({ error: 'Not found', code: 404 }, { status: 404 })

  let signedUrl: string | null = null
  let signedUrlExpiresAt: string | null = null

  if (contract.file_path) {
    const { data } = await supabase.storage
      .from('contracts')
      .createSignedUrl(contract.file_path, 3600)
    if (data?.signedUrl) {
      signedUrl = data.signedUrl
      signedUrlExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
    }
  }

  const { data: feedback } = await supabase
    .from('user_feedback')
    .select('id')
    .eq('contract_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    ...contract,
    terms: contract.key_terms ?? [],
    signedUrl,
    signedUrlExpiresAt,
    hasFeedback: !!feedback,
  })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!params.id || !UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'Invalid contract ID', code: 400 }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 401 }, { status: 401 })

  const { data: contract } = await supabase
    .from('contracts')
    .select('file_path')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!contract) return NextResponse.json({ error: 'Not found', code: 404 }, { status: 404 })

  if (contract.file_path) {
    await supabase.storage.from('contracts').remove([contract.file_path])
  }

  const { error } = await supabase
    .from('contracts')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message, code: 500 }, { status: 500 })

  return NextResponse.json({ success: true })
}
