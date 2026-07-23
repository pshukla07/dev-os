const INJECTION_PATTERNS: RegExp[] = [
  /ignore (previous|prior|all|your) (instructions?|rules?|prompts?|context)/i,
  /override (your|the|all) (rules?|instructions?|prompts?|context)/i,
  /reveal (your |the )?(system )?prompt/i,
  /print (your |the )?(system )?instructions/i,
  /expose (env(ironment)? variables?|api keys?|secrets?)/i,
  /show (me )?(your )?(api keys?|env(ironment)? variables?|secrets?)/i,
  /you are now (a |an )/i,
  /\bact as (a |an )/i,
  /pretend (you are|to be) (a |an )/i,
  /\bjailbreak\b/i,
  /\bDAN mode\b/i,
  /\bdeveloper mode\b/i,
  /forget (your |all )?(previous |prior )?(instructions?|rules?|training)/i,
  /\bnew persona\b/i,
  /\bdo anything now\b/i,
]

export interface InjectionCheckResult {
  safe: boolean
  reason?: string
}

export function sanitizeForLLM(message: string): InjectionCheckResult {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return { safe: false, reason: 'Message contains disallowed content.' }
    }
  }
  return { safe: true }
}
