import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { ProcessSchema } from '@/lib/validators/contractSchemas'
import { buildNdaExtractionPrompt, NDA_PROMPT_VERSION } from '@/lib/prompts/extraction/nda-system-prompt'
import { buildMsaExtractionPrompt, MSA_PROMPT_VERSION } from '@/lib/prompts/extraction/msa-system-prompt'
import { requireAuth } from '@/lib/security/authGuard'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rateLimiter'

const MAX_RETRIES = 3

interface ExtractedTerm {
  term_name: string
  value: string
  page_number: number
  confidence_score: number
  source_sentence: string
}

function buildPrompt(contractText: string, contractType: string, customTerms: string[]): string {
  return contractType === 'nda'
    ? buildNdaExtractionPrompt(contractText, customTerms)
    : buildMsaExtractionPrompt(contractText, customTerms)
}

function parseTerms(content: string): ExtractedTerm[] {
  const parsed = JSON.parse(content)
  const terms = Array.isArray(parsed)
    ? parsed
    : (parsed.terms ?? parsed.key_terms ?? [])
  if (!Array.isArray(terms)) throw new Error('Response is not an array of terms')
  return terms
}

function validateAndClampTerm(t: ExtractedTerm, maxPage: number): ExtractedTerm {
  return {
    term_name: String(t.term_name ?? ''),
    value: String(t.value ?? 'Not found'),
    page_number: Number.isInteger(t.page_number) && t.page_number > 0 && t.page_number <= maxPage
      ? t.page_number
      : 0,
    confidence_score: Math.min(1, Math.max(0, Number(t.confidence_score) || 0)),
    source_sentence: String(t.source_sentence ?? ''),
  }
}

async function callOpenAIWithRetry(
  openai: OpenAI,
  prompt: string,
  userId: string
): Promise<ExtractedTerm[]> {
  type Message = OpenAI.Chat.ChatCompletionMessageParam

  let messages: Message[] = [{ role: 'user', content: prompt }]
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
    }

    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages,
        user: userId,
      })

      const content = res.choices[0]?.message?.content ?? ''
      return parseTerms(content)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt < MAX_RETRIES - 1) {
        messages = [
          ...messages,
          {
            role: 'assistant' as const,
            content: lastError.message.includes('JSON') ? '{}' : lastError.message,
          },
          {
            role: 'user' as const,
            content:
              'Your previous response was not valid JSON. Return only a JSON object with a "terms" key containing an array of term objects. No explanation.',
          },
        ]
      }
    }
  }

  throw lastError ?? new Error('OpenAI extraction failed after retries')
}

export async function POST(req: Request) {
  const supabase = await createServerClient()

  const { user, error: authError } = await requireAuth(supabase)
  if (authError) return authError

  // Rate limit: 5 processing calls per hour
  const { allowed, retryAfter } = await checkRateLimit({ ...RATE_LIMITS.process, userId: user.id })
  if (!allowed) {
    return NextResponse.json(
      { error: 'Processing limit reached. Please try again later.', code: 429 },
      { status: 429, headers: { 'Retry-After': String(retryAfter ?? 3600) } }
    )
  }

  const body = await req.json().catch(() => ({}))
  const parsed = ProcessSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request', code: 400 }, { status: 400 })
  }

  const { contractId, customTerms } = parsed.data

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, contract_text, contract_type, status, page_count')
    .eq('id', contractId)
    .eq('user_id', user.id)
    .single()

  if (!contract) return NextResponse.json({ error: 'Contract not found', code: 404 }, { status: 404 })

  if (contract.status === 'processed') {
    return NextResponse.json({ error: 'Contract already processed', code: 400 }, { status: 400 })
  }

  await supabase.from('contracts').update({ status: 'processing' }).eq('id', contractId)

  const prompt = buildPrompt(contract.contract_text, contract.contract_type, customTerms)
  const promptVersion = contract.contract_type === 'nda' ? NDA_PROMPT_VERSION : MSA_PROMPT_VERSION

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const rawTerms = await callOpenAIWithRetry(openai, prompt, user.id)

    const customTermSet = new Set(customTerms.map((t) => t.toLowerCase()))
    const termRows = rawTerms.map((t) => ({
      ...validateAndClampTerm(t, contract.page_count),
      contract_id: contractId,
      user_id: user.id,
      is_custom: customTermSet.has(t.term_name?.toLowerCase() ?? ''),
      is_edited: false,
    }))

    // Delete any existing terms (allow retry after error)
    await supabase.from('key_terms').delete().eq('contract_id', contractId)

    const { data: inserted } = await supabase.from('key_terms').insert(termRows).select()

    await supabase.from('contracts').update({
      status: 'processed',
      error_message: null,
    }).eq('id', contractId)

    console.log(JSON.stringify({
      event: 'extraction_complete',
      contractId,
      contractType: contract.contract_type,
      promptVersion,
      termCount: termRows.length,
      lowConfidenceCount: termRows.filter((t) => t.confidence_score < 0.5).length,
    }))

    return NextResponse.json({ contractId, terms: inserted ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed'

    await supabase.from('contracts').update({
      status: 'error',
      error_message: message,
    }).eq('id', contractId)

    return NextResponse.json(
      { error: 'Analysis failed. Please try again.', code: 504 },
      { status: 504 }
    )
  }
}
