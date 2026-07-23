import { NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any

interface ContractAccess {
  contract: { contract_text: string; page_count: number } | null
  response: NextResponse | null
}

export async function verifyContractAccess(
  supabase: SupabaseLike,
  contractId: string,
  userId: string
): Promise<ContractAccess> {
  const { data: contract } = await supabase
    .from('contracts')
    .select('contract_text, page_count, status')
    .eq('id', contractId)
    .eq('user_id', userId)
    .single()

  if (!contract) {
    return { contract: null, response: NextResponse.json({ error: 'Contract not found', code: 404 }, { status: 404 }) }
  }

  if (contract.status !== 'processed') {
    return {
      contract: null,
      response: NextResponse.json(
        { error: 'Contract has not been processed yet', code: 400 },
        { status: 400 }
      ),
    }
  }

  return { contract: { contract_text: contract.contract_text, page_count: contract.page_count }, response: null }
}

export async function verifySessionOwnership(
  supabase: SupabaseLike,
  sessionId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()

  return !!data
}
