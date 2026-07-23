import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 401 }, { status: 401 })

  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('id, name, contract_type, status, page_count, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message, code: 500 }, { status: 500 })

  const total = contracts?.length ?? 0
  const nda = contracts?.filter((c) => c.contract_type === 'nda').length ?? 0
  const msa = contracts?.filter((c) => c.contract_type === 'msa').length ?? 0

  return NextResponse.json({ contracts: contracts ?? [], summary: { total, nda, msa } })
}
