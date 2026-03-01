# API Routes — Context-Specific Rules

> This file is loaded ONLY when working in `src/app/api/`.

## Auth Requirements
- ALL cron endpoints MUST verify via `verifyCronAuth()` from `src/lib/qstash/verify.ts`
- Accepts QStash signature header OR `Authorization: Bearer $CRON_SECRET`
- ⚠️ If `CRON_SECRET` is unset, `verify.ts` allows ALL requests — never deploy without it

## API Patterns
- All handlers: `export const runtime = 'nodejs'` + `export const maxDuration = 30` (60 for battles)
- Cron routes accept both GET (Vercel cron) and POST (QStash)
- Bet placement: 5-step validation (format → tier → match status → idempotency → on-chain verify)
- Rate limiting: 5 bets/wallet/minute in `/api/bets/place`

## Error Handling
- Client-facing: sanitized error messages, NO internal details
- Server-side: full error context in `console.error`
- Unique constraint violations (23505): return 409, not 500

## Financial Safety Checklist
- [ ] SOL amounts are `numeric`, not float
- [ ] Transaction signature has UNIQUE constraint
- [ ] Idempotency: same input = same output
- [ ] Rate limiting in place
- [ ] On-chain verification before recording
- [ ] `FOR UPDATE SKIP LOCKED` on payout claims
- [ ] Treasury audit log on every movement
