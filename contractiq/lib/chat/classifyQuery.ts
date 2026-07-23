export type QueryContext = 'contract' | 'history' | 'both'

// Signals that the user is asking about something said in the conversation.
// All patterns require an explicit self-referential phrase so generic words
// like "earlier in the contract" or "previously defined" don't false-positive.
const HISTORY_PATTERNS: RegExp[] = [
  // Direct references to AI's prior statements
  /\byou (said|mentioned|told me|explained|noted|stated|indicated|described|covered|addressed|answered)\b/i,
  // Time-indexed references to the conversation ("earlier you", "before you said")
  /\b(earlier|previously|before|a moment ago|just now|last time)\b.{0,30}\byou\b/i,
  // Questions about what was said
  /\bwhat did you (say|mention|explain|describe|tell me|point out)\b/i,
  // Questions about shared conversational history
  /\bwhat (have|did) (we|you|i) (discuss(ed)?|talk(ed)? about|said|asked|go over)\b/i,
  // Explicit references to "the conversation" itself
  /\b(our|this|the) (conversation|discussion|chat|exchange)\b/i,
  // Recall and repetition requests
  /\b(remind me|repeat that|rephrase|say that again|summarize (our|this|the) (conversation|chat|discussion))\b/i,
  // References to a specific prior response
  /\b(in your|from your) (last|previous|earlier|prior|recent) (response|answer|message|reply)\b/i,
  // "Based on what you said..."
  /\bbased on (what|that) you (said|mentioned|told me)\b/i,
]

// Signals that, in addition to referencing conversation history, the user
// also wants to look something up in the contract document.
const DOCUMENT_CROSS_REF_PATTERNS: RegExp[] = [
  /\b(in the (contract|document|agreement|nda|msa|text))\b/i,
  /\bwhere (in|does) (the )?(contract|document|agreement)\b/i,
  /\bon (what )?page\b/i,
  /\b(find|show|locate|point to) (that|it|this) in\b/i,
  /\b(verify|confirm|check) (that|it|this) in (the )?(contract|document)\b/i,
  /\bwhat (clause|section|article|paragraph)\b/i,
]

/**
 * Classify a user message into one of three context types.
 *
 * CONTRACT  — default; question is about document content
 * HISTORY   — question is about the conversation itself
 * BOTH      — question references the conversation AND the document
 *
 * @param message      The raw user message text
 * @param historyLength Number of messages already in the session history
 */
export function classifyQuery(message: string, historyLength: number): QueryContext {
  const hasHistorySignal = HISTORY_PATTERNS.some((p) => p.test(message))
  const hasCrossRefSignal = DOCUMENT_CROSS_REF_PATTERNS.some((p) => p.test(message))

  // Classify by intent first, regardless of whether history exists yet.
  // If the user asks a history-type question with no history, the history
  // prompt correctly returns "I cannot find this in our conversation."
  if (hasHistorySignal && hasCrossRefSignal) return 'both'
  if (hasHistorySignal) return 'history'
  return 'contract'
}
