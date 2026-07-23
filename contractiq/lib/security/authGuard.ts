import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

type AuthClient = { auth: { getUser(): Promise<{ data: { user: User | null } }> } }

export type AuthResult =
  | { user: User; error: null }
  | { user: null; error: NextResponse }

export async function requireAuth(supabase: AuthClient): Promise<AuthResult> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized', code: 401 }, { status: 401 }) }
  }
  return { user, error: null }
}
