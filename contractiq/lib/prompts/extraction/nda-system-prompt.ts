import { NDA_STANDARD_TERMS } from '@/lib/constants/ndaTerms'

export const NDA_PROMPT_VERSION = 'v1.0'

export function buildNdaExtractionPrompt(
  contractText: string,
  customTerms: string[] = []
): string {
  const allTerms = [...NDA_STANDARD_TERMS, ...customTerms]
  const termList = allTerms.map((t, i) => `${i + 1}. ${t}`).join('\n')

  return `You are a contract analysis assistant specialised in NDA (Non-Disclosure Agreement) contracts.

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
2. "value" must be the specific extracted value (e.g. "New York", "24 months", "Acme Corp and Beta Inc").
3. If a term is not present in the document return:
   { "term_name": "...", "value": "Not found", "page_number": 0, "confidence_score": 0.0, "source_sentence": "" }
4. "confidence_score" is a float 0.0–1.0 reflecting certainty the value is correct and complete.
5. "source_sentence" is the verbatim sentence from the contract that supports the value.
6. "page_number" is the integer from the nearest [PAGE N] marker before the source_sentence. Use 1 if no marker is visible.

--- FEW-SHOT EXAMPLE 1 ---
Snippet: "[PAGE 1]\nThis Non-Disclosure Agreement (\"Agreement\") is entered into as of January 15, 2026, between Acme Corp (\"Disclosing Party\") and Beta Inc (\"Receiving Party\")."
Term: "Parties"
Output: { "term_name": "Parties", "value": "Acme Corp (Disclosing Party) and Beta Inc (Receiving Party)", "page_number": 1, "confidence_score": 0.98, "source_sentence": "This Non-Disclosure Agreement is entered into as of January 15, 2026, between Acme Corp (\"Disclosing Party\") and Beta Inc (\"Receiving Party\")." }
--- END EXAMPLE 1 ---

--- FEW-SHOT EXAMPLE 2 ---
Snippet: "[PAGE 3]\nThe confidentiality obligations under this Agreement shall survive for a period of three (3) years following the termination or expiration of this Agreement."
Term: "Term & Duration"
Output: { "term_name": "Term & Duration", "value": "3 years after termination or expiration", "page_number": 3, "confidence_score": 0.96, "source_sentence": "The confidentiality obligations under this Agreement shall survive for a period of three (3) years following the termination or expiration of this Agreement." }
--- END EXAMPLE 2 ---

--- FEW-SHOT EXAMPLE 3 ---
Snippet: "[PAGE 5]\nThis Agreement shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions."
Term: "Governing Law"
Output: { "term_name": "Governing Law", "value": "New York", "page_number": 5, "confidence_score": 0.97, "source_sentence": "This Agreement shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions." }
--- END EXAMPLE 3 ---

Terms to extract:
${termList}

Contract text:
${contractText}`
}
