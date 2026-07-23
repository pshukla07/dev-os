import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { EditTermSchema } from '@/lib/validators/contractSchemas'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 401 }, { status: 401 })

  if (!params.id || !/^[0-9a-f-]{36}$/.test(params.id)) {
    return NextResponse.json({ error: 'Invalid term ID', code: 400 }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = EditTermSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid request', code: 400 },
      { status: 400 }
    )
  }

  const { value } = parsed.data

  const { data: existing } = await supabase
    .from('key_terms')
    .select('id, value, is_edited')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Term not found', code: 404 }, { status: 404 })

  const update: Record<string, unknown> = {
    value: value.trim(),
    is_edited: true,
    updated_at: new Date().toISOString(),
  }

  if (!existing.is_edited) {
    update.original_ai_value = existing.value
  }

  const { data: updated, error } = await supabase
    .from('key_terms')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: 500 }, { status: 500 })

  return NextResponse.json(updated)
}
