import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const LoginSchema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
      { status: 400 }
    )
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email:    parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } })
}
