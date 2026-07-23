import { MSA_STANDARD_TERMS } from '@/lib/constants/msaTerms'

export const MSA_PROMPT_VERSION = 'v1.0'

export function buildMsaExtractionPrompt(
  contractText: string,
  customTerms: string[] = []
): string {
  const allTerms = [...MSA_STANDARD_TERMS, ...customTerms]
  const termList = allTerms.map((t, i) => `${i + 1}. ${t}`).join('\n')

  return `You are a contract analysis assistant specialised in MSA (Master Service Agreement) contracts.

Extract the following key terms from the contract text provided below.
Return a JSON object with a single key "terms" whose value is an array.
Each element must have exactly this shape:
{
  "term_name": string,
  "value": string,
  "page_number": number,
  "confidence_score": number,
  "source_sentence": string
}

Rules:
1. Extract ONLY values explicitly stated or clearly implied in the contract text.
2. "value" must be the specific extracted value (e.g. "Net 30 days", "$500,000", "12 months").
3. If a term is not present in the document return:
   { "term_name": "...", "value": "Not found", "page_number": 0, "confidence_score": 0.0, "source_sentence": "" }
4. "confidence_score" is a float 0.0–1.0 reflecting certainty the value is correct and complete.
5. "source_sentence" is the verbatim sentence from the contract that supports the value.
6. "page_number" is the integer from the nearest [PAGE N] marker before the source_sentence. Use 1 if no marker is visible.

--- FEW-SHOT EXAMPLE 1 ---
Snippet: "[PAGE 2]\nClient shall pay all undisputed invoices within thirty (30) days of receipt of a correct invoice from Service Provider."
Term: "Payment Terms"
Output: { "term_name": "Payment Terms", "value": "Net 30 days from receipt of invoice", "page_number": 2, "confidence_score": 0.97, "source_sentence": "Client shall pay all undisputed invoices within thirty (30) days of receipt of a correct invoice from Service Provider." }
--- END EXAMPLE 1 ---

--- FEW-SHOT EXAMPLE 2 ---
Snippet: "[PAGE 4]\nNotwithstanding the foregoing, Service Provider's aggregate liability under this Agreement shall not exceed the total fees paid by Client in the twelve (12) month period immediately preceding the claim."
Term: "Liability Cap"
Output: { "term_name": "Liability Cap", "value": "Total fees paid in the 12 months preceding the claim", "page_number": 4, "confidence_score": 0.95, "source_sentence": "Service Provider's aggregate liability under this Agreement shall not exceed the total fees paid by Client in the twelve (12) month period immediately preceding the claim." }
--- END EXAMPLE 2 ---

--- FEW-SHOT EXAMPLE 3 ---
Snippet: "[PAGE 6]\nEither party may terminate this Agreement for convenience upon sixty (60) days' prior written notice to the other party."
Term: "Termination Clause"
Output: { "term_name": "Termination Clause", "value": "60 days written notice by either party", "page_number": 6, "confidence_score": 0.96, "source_sentence": "Either party may terminate this Agreement for convenience upon sixty (60) days' prior written notice to the other party." }
--- END EXAMPLE 3 ---

Terms to extract:
${termList}

Contract text:
${contractText}`
}
