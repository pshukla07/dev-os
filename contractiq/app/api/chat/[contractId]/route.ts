import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_req: Request, { params }: { params: { contractId: string } }) {
  if (!params.contractId || !UUID_RE.test(params.contractId)) {
    return NextResponse.json({ error: 'Invalid contract ID', code: 400 }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 401 }, { status: 401 })

  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('contract_id', params.contractId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!session) return NextResponse.json({ sessionId: null, messages: [] })

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })
    .limit(200)

  return NextResponse.json({ sessionId: session.id, messages: messages ?? [] })
}
