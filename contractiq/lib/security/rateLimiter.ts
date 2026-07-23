import { createAdminClient } from '@/lib/supabase/admin'

interface RateLimitConfig {
  action: string
  userId: string
  limit: number
  windowSeconds: number
}

interface RateLimitResult {
  allowed: boolean
  retryAfter?: number
}

export async function checkRateLimit({
  action,
  userId,
  limit,
  windowSeconds,
}: RateLimitConfig): Promise<RateLimitResult> {
  const admin = createAdminClient()
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString()

  const { count, error } = await admin
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', windowStart)

  if (error) return { allowed: true } // fail open on DB errors

  if ((count ?? 0) >= limit) {
    return { allowed: false, retryAfter: windowSeconds }
  }

  await admin.from('rate_limit_events').insert({ user_id: userId, action })
  return { allowed: true }
}

export const RATE_LIMITS = {
  chat:    { action: 'chat',    limit: 30, windowSeconds: 60 },
  process: { action: 'process', limit: 5,  windowSeconds: 3600 },
  upload:  { action: 'upload',  limit: 20, windowSeconds: 86400 },
} as const
