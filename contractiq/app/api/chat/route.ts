import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { ChatSchema } from '@/lib/validators/contractSchemas'
import { buildChatSystemPrompt } from '@/lib/prompts/chat/chat-system-prompt'
import { classifyQuery } from '@/lib/chat/classifyQuery'
import type { QueryContext } from '@/lib/chat/classifyQuery'
import { requireAuth } from '@/lib/security/authGuard'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rateLimiter'
import { sanitizeForLLM } from '@/lib/security/promptInjectionGuard'
import { verifyContractAccess, verifySessionOwnership } from '@/lib/security/chatSecurity'

// Messages per context window (1 turn = 1 user + 1 assistant = 2 messages)
const CONTEXT_WINDOW: Record<QueryContext, number> = {
  contract: 20, // 10 turns
  history:  40, // 20 turns
  both:     20, // 10 turns
}

function parseCitation(content: string): number | null {
  const match = content.match(/\[Page (\d+)\]/i)
  return match ? parseInt(match[1], 10) : null
}

export async function POST(req: Request) {
  const supabase = await createServerClient()

  const { user, error: authError } = await requireAuth(supabase)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const parsed = ChatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid request', code: 400 },
      { status: 400 }
    )
  }

  const { contractId, sessionId, message } = parsed.data

  // Rate limit
  const { allowed, retryAfter } = await checkRateLimit({ ...RATE_LIMITS.chat, userId: user.id })
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.', code: 429 },
      { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
    )
  }

  // Prompt injection guard
  const injection = sanitizeForLLM(message.trim())
  if (!injection.safe) {
    return NextResponse.json(
      { error: injection.reason ?? 'Message contains disallowed content.', code: 400 },
      { status: 400 }
    )
  }

  // Verify contract ownership + processed status
  const { contract, response: contractError } = await verifyContractAccess(supabase, contractId, user.id)
  if (contractError) return contractError

  // ── Get or create session ───────────────────────────────────────────────────
  let activeSessionId = sessionId ?? null

  if (sessionId) {
    // Verify client-supplied session belongs to this user
    const owned = await verifySessionOwnership(supabase, sessionId, user.id)
    if (!owned) return NextResponse.json({ error: 'Session not found', code: 404 }, { status: 404 })
  } else {
    const { data: existing } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('contract_id', contractId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      activeSessionId = existing.id
    } else {
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({ contract_id: contractId, user_id: user.id })
        .select('id')
        .single()
      activeSessionId = newSession?.id ?? null
    }
  }

  if (!activeSessionId) {
    return NextResponse.json({ error: 'Could not create chat session', code: 500 }, { status: 500 })
  }

  // ── Load history BEFORE saving the new message ──────────────────────────────
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', activeSessionId)
    .order('created_at', { ascending: true })
    .limit(200)

  const historyMessages = history ?? []

  // ── Classify the query ──────────────────────────────────────────────────────
  const context = classifyQuery(message.trim(), historyMessages.length)

  // ── Build context window ────────────────────────────────────────────────────
  const windowSize = CONTEXT_WINDOW[context]
  const historyWindow = historyMessages.slice(-windowSize)

  const systemPrompt = buildChatSystemPrompt(contract!.contract_text, context)

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  type OAIMessage = OpenAI.Chat.ChatCompletionMessageParam

  const messages: OAIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...historyWindow.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message.trim() },
  ]

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.4,
      max_tokens: 1000,
      messages,
      user: user.id,
    })

    const assistantContent =
      res.choices[0]?.message?.content ?? 'I cannot find this in the document.'

    // Page citations only apply when the contract text was in scope
    const pageCitation = context !== 'history' ? parseCitation(assistantContent) : null

    // ── Save both messages after generation ─────────────────────────────────
    const { error: insertError } = await supabase.from('chat_messages').insert([
      {
        session_id:    activeSessionId,
        user_id:       user.id,
        role:          'user',
        content:       message.trim(),
        page_citation: null,
        context_type:  null,
      },
      {
        session_id:    activeSessionId,
        user_id:       user.id,
        role:          'assistant',
        content:       assistantContent,
        page_citation: pageCitation,
        context_type:  context,
      },
    ])

    if (insertError) {
      console.error('[chat insert error]', insertError.message)
      // context_type column missing → run the migration in database.sql
      return NextResponse.json(
        { error: 'Failed to save message. Run the database migration and try again.', code: 500 },
        { status: 500 }
      )
    }

    const { data: savedMsg } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', activeSessionId)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({ sessionId: activeSessionId, message: savedMsg })
  } catch {
    return NextResponse.json(
      { error: 'Chat service unavailable. Please try again.', code: 504 },
      { status: 504 }
    )
  }
}
