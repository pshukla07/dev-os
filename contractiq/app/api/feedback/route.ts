import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { FeedbackSchema } from '@/lib/validators/contractSchemas'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 401 }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = FeedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid request', code: 400 },
      { status: 400 }
    )
  }

  const { contractId, rating, comment } = parsed.data

  const { error } = await supabase.from('user_feedback').insert({
    contract_id: contractId,
    user_id: user.id,
    rating,
    comment: comment?.trim() || null,
  })

  if (error?.code === '23505') {
    return NextResponse.json({ error: 'Feedback already submitted', code: 409 }, { status: 409 })
  }

  if (error) return NextResponse.json({ error: error.message, code: 500 }, { status: 500 })

  return NextResponse.json({ success: true })
}
