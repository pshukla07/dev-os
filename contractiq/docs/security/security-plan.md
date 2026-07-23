# ContractIQ — Security Plan

## Issues Found & Fixed

| # | Issue | Severity | Fix Applied |
|---|-------|----------|-------------|
| 1 | No rate limiting on any endpoint | High | Added sliding-window rate limiter via Supabase `rate_limit_events` table — chat (30/min), process (5/hr), upload (20/day) |
| 2 | No prompt injection protection | High | `sanitizeForLLM()` in `lib/security/promptInjectionGuard.ts` blocks 15+ patterns before any LLM call |
| 3 | File upload accepted any MIME type and extension | High | `validateFileUpload()` in `lib/security/inputValidator.ts` enforces allowlist (pdf, docx), blocklist (.exe, .js, .sh, etc.), and MIME type check |
| 4 | Chat route did not verify `status === 'processed'` | Medium | `verifyContractAccess()` in `lib/security/chatSecurity.ts` rejects chats on unprocessed contracts |
| 5 | Client-supplied `sessionId` was used without ownership verification | Medium | `verifySessionOwnership()` now validates session belongs to the authenticated user before use |
| 6 | UUID params not validated on `contracts/[id]` and `chat/[contractId]` routes | Medium | Regex UUID guard added before any DB query |
| 7 | Debug `console.log` leaked contract text preview to server logs | Low | Debug log removed from `app/api/chat/route.ts` |
| 8 | Chat message max length was 4000 (below spec) | Low | Updated to 5000 in `lib/validators/contractSchemas.ts` |
| 9 | No server-side auth login/logout routes | Medium | Added `app/api/auth/login/route.ts` and `app/api/auth/logout/route.ts` |
| 10 | No centralized admin (service-role) Supabase client | Low | `lib/supabase/admin.ts` — used exclusively by rate limiter |

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/supabase/admin.ts` | Service-role Supabase client for privileged operations (rate limiting only) |
| `lib/security/authGuard.ts` | `requireAuth()` — centralised 401 guard for all API routes |
| `lib/security/rateLimiter.ts` | Sliding-window rate limiter backed by Supabase |
| `lib/security/promptInjectionGuard.ts` | `sanitizeForLLM()` — blocks prompt injection before any OpenAI call |
| `lib/security/tokenLimiter.ts` | Constants: MAX_FILE_SIZE (10 MB), MAX_PAGES (200), MAX_MESSAGE_LEN (5000), MAX_CHAT_HISTORY |
| `lib/security/chatSecurity.ts` | `verifyContractAccess()` + `verifySessionOwnership()` |
| `lib/security/inputValidator.ts` | `validateFileUpload()` — extension, MIME, and size checks |
| `app/api/auth/login/route.ts` | Server-side login (sets auth cookie correctly via SSR client) |
| `app/api/auth/logout/route.ts` | Server-side logout |
| `supabase/rls-policies.sql` | `rate_limit_events` table + RLS + cleanup function |
| `docs/security/security-plan.md` | This document |

## Files Modified

| File | Change |
|------|--------|
| `app/api/chat/route.ts` | Added auth guard, rate limiting, prompt injection check, contract access + session ownership verification; removed debug log |
| `app/api/contracts/upload/route.ts` | Added auth guard, rate limiting, file extension + MIME validation |
| `app/api/contracts/process/route.ts` | Added auth guard, rate limiting |
| `app/api/contracts/[id]/route.ts` | Added UUID validation on GET and DELETE |
| `app/api/chat/[contractId]/route.ts` | Added UUID validation on GET |
| `lib/validators/contractSchemas.ts` | Chat message max raised from 4000 → 5000 |
| `.env.example` | Added `MAX_CHAT_HISTORY` variable |

---

## SQL to Run in Supabase

Run `supabase/rls-policies.sql` in the Supabase SQL Editor. This creates:
- `rate_limit_events` table with index and RLS enabled
- `cleanup_rate_limit_events()` function for daily pruning

---

## Environment Variables to Add to `.env.local`

| Variable | Value | Notes |
|----------|-------|-------|
| `MAX_CHAT_HISTORY` | `100` | Max messages sent to the model per chat session |

---

## Existing Controls Verified

| Control | Status |
|---------|--------|
| All routes use `getUser()` not `getSession()` | ✅ |
| `OPENAI_API_KEY` server-side only (no `NEXT_PUBLIC_` prefix) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` server-side only | ✅ |
| Storage bucket is private; access only via signed URLs (1-hour expiry) | ✅ |
| All DB queries filter by `user_id = auth.uid()` (RLS + explicit `.eq('user_id', user.id)`) | ✅ |
| No raw SQL string interpolation | ✅ |
| Zod validation on all API routes | ✅ |
| Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) | ✅ |
| Protected routes redirect unauthenticated users in middleware | ✅ |

---

## Outstanding Items

- **Auth rate limiting**: Login brute-force protection is best handled at the WAF/Supabase Auth level (Supabase has built-in protection). The `rate_limit_events` table requires a UUID user ID; email-based limiting before login requires a separate mechanism.
- **Content Security Policy**: A CSP header should be added once the full list of third-party domains (fonts, analytics, etc.) is known. Prematurely locking CSP breaks legitimate resources.
- **pg_cron cleanup**: Uncomment the `cron.schedule` call in `supabase/rls-policies.sql` after enabling `pg_cron` in the Supabase dashboard to keep `rate_limit_events` compact.
