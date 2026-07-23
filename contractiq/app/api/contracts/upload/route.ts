import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { NDA_STANDARD_TERMS } from '@/lib/constants/ndaTerms'
import { MSA_STANDARD_TERMS } from '@/lib/constants/msaTerms'
import { requireAuth } from '@/lib/security/authGuard'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rateLimiter'
import { validateFileUpload } from '@/lib/security/inputValidator'
import { MAX_PAGES } from '@/lib/security/tokenLimiter'

const MIN_WORD_COUNT = 100

interface TextItem {
  str: string
  transform: number[]
}

interface PageData {
  getTextContent: () => Promise<{ items: TextItem[] }>
}

async function extractWithPageMarkers(buffer: Buffer): Promise<{ text: string; numpages: number }> {
  const pdfParse = (await import('pdf-parse')).default
  let currentPage = 0

  const options = {
    pagerender: async (pageData: PageData): Promise<string> => {
      currentPage++
      const textContent = await pageData.getTextContent()
      let lastY: number | undefined
      let pageText = ''

      for (const item of textContent.items) {
        if (!item.str) continue
        const y = item.transform[5]
        if (lastY !== undefined && Math.abs(y - lastY) > 5) {
          pageText += '\n'
        }
        pageText += item.str
        lastY = y
      }

      return `[PAGE ${currentPage}]\n${pageText}\n`
    },
  }

  return pdfParse(buffer, options)
}

export async function POST(req: Request) {
  const supabase = await createServerClient()

  const { user, error: authError } = await requireAuth(supabase)
  if (authError) return authError

  // Rate limit
  const { allowed, retryAfter } = await checkRateLimit({ ...RATE_LIMITS.upload, userId: user.id })
  if (!allowed) {
    return NextResponse.json(
      { error: 'Upload limit reached. Try again tomorrow.', code: 429 },
      { status: 429, headers: { 'Retry-After': String(retryAfter ?? 86400) } }
    )
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const contractType = formData.get('contract_type') as string

  if (!file || !['nda', 'msa'].includes(contractType)) {
    return NextResponse.json({ error: 'Invalid request', code: 400 }, { status: 400 })
  }

  // Validate file extension, MIME type, and size
  const fileCheck = validateFileUpload(file)
  if (!fileCheck.valid) {
    return NextResponse.json({ error: fileCheck.error, code: 400 }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let parsed: { text: string; numpages: number }
  try {
    parsed = await extractWithPageMarkers(buffer)
  } catch {
    return NextResponse.json({ error: 'Could not read PDF. Please check the file.', code: 422 }, { status: 422 })
  }

  if (parsed.numpages > MAX_PAGES) {
    return NextResponse.json({ error: `PDF exceeds ${MAX_PAGES} page limit.`, code: 400 }, { status: 400 })
  }

  const wordCount = parsed.text.replace(/\[PAGE \d+\]/g, '').split(/\s+/).filter(Boolean).length
  if (wordCount < MIN_WORD_COUNT) {
    return NextResponse.json({
      error: 'Scanned PDFs are not supported yet. Please upload a text-layer PDF.',
      code: 422,
    }, { status: 422 })
  }

  const contractText = parsed.text

  const { data: contract, error: insertError } = await supabase
    .from('contracts')
    .insert({
      user_id:       user.id,
      name:          file.name,
      contract_type: contractType,
      contract_text: contractText,
      file_path:     null,
      status:        'uploaded',
      page_count:    parsed.numpages,
    })
    .select('id')
    .single()

  if (insertError || !contract) {
    return NextResponse.json({ error: 'Failed to save contract.', code: 500 }, { status: 500 })
  }

  const filePath = `contracts/${user.id}/${contract.id}/${file.name}`
  supabase.storage.from('contracts').upload(filePath, buffer, { contentType: 'application/pdf' })
    .then(({ error }) => {
      if (!error) {
        supabase.from('contracts').update({ file_path: filePath }).eq('id', contract.id)
      }
    })

  const standardTerms = contractType === 'nda'
    ? [...NDA_STANDARD_TERMS]
    : [...MSA_STANDARD_TERMS]

  return NextResponse.json({ contractId: contract.id, pageCount: parsed.numpages, standardTerms, contractType })
}
