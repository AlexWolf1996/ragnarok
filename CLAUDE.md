# RAGNARÖK

## What
Onchain AI battle arena on Solana. AI agents compete in real-time, users bet via parimutuel prediction markets. Built with Next.js 15 (App Router), Supabase, Groq (Llama 3.3 70B + fallbacks), Solana Web3.js, Tailwind CSS.

## Why
Scheduled matches with betting windows and live spectacle. The user is a **bettor first** — arrive, see a match, pick a side, watch, win or lose.

## Commands
```bash
npm run dev          # local dev server (http://localhost:3000)
npm run build        # production build — MUST pass before any PR
npm run lint         # ESLint strict
```

## Current Sprint
**Read `SPECS.md` for the active task list.** Execute tasks in exact order. Verify each task's checklist before moving to the next. Do NOT skip ahead.

## Architecture (DO NOT CHANGE without discussion)

### Battle System
- **Match lifecycle:** `scheduled → betting_open → in_progress → judging → completed | failed`
- **3-judge LLM panel** — Odin (llama-3.3-70b, 50%), Thor (qwen3-32b, 30%), Freya (llama-3.1-8b, 20%)
- Judges score 0-100 independently → weighted average → winner determined
- Ties = random coin flip (not ELO-based)
- If judge fails, remaining judges re-weight proportionally
- If all 3 fail, retry once with primary model, then mark match `failed`
- Each battle = 5 Groq API calls (2 agent responses + 3 judge scores)

### Betting
- **Parimutuel odds** — pool-based, 5% rake, treasury never pays from reserves
- **Bet tiers:** Bifrost 0.01, Midgard 0.05, Asgard 0.1 SOL
- On-chain Solana tx verification before bet is recorded
- Idempotency via UNIQUE constraint on `tx_signature`
- Rate limit: 5 bets/wallet/minute (enforced in `/api/bets/place`)

### Payouts
- **Sequential payouts** — `payout_queue` with `FOR UPDATE SKIP LOCKED`, never parallel
- `claim_pending_payout()` SQL function for atomic claim
- Max 3 retry attempts, then permanent failure with notification
- Treasury audit log on every movement

### ELO & Matchmaking
- ±200 → ±300 → ±400 → any (expanding bands)
- Dynamic K-factor: K=40 (<20 battles), K=20 (20-50), K=10 (50+)
- Excludes last 3 opponents, weights toward inactive agents
- Atomic stat updates via `update_agent_battle_stats()` RPC

### Cron / QStash
- **Primary:** Upstash QStash → `/api/cron/scheduler` every minute
- **Fallback:** `vercel.json` daily cron as safety net
- `scheduler_lock` table prevents concurrent execution (50s timeout)
- Auth: QStash signature OR `CRON_SECRET` Bearer token
- Shared auth: `src/lib/qstash/verify.ts`
- Env vars: `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `CRON_SECRET`

## Conventions
- TypeScript strict — **no `any` in financial logic**
- All SOL amounts: `numeric` in Supabase, never floating point
- snake_case for DB columns, camelCase for TypeScript
- Commits: `feat:` / `fix:` / `refactor:` / `chore:`
- UNIQUE constraint on every transaction signature column
- Idempotency on all financial endpoints
- Error messages to client: sanitized (no internal details). Full errors in `console.error` only.

## Design System
- **Palette:** Dark base `#0a0a0f`, text `#e8e8e8`, accent gold `#c9a84c` / `#D4A843`, danger red `#c41e3a`
- **Font:** Mono/Orbitron for headings, Rajdhani for body
- **Style:** Sharp geometric angles — prefer `rounded-none` or `rounded-sm` over `rounded-lg`
- **Effects:** Subtle particle fields, glitch text, scanlines. Respect `useReducedMotion`.
- **Components with `rounded-lg` are legacy** — migrate to sharp corners when touching them

## File Structure
```
src/
  app/           # Next.js App Router pages + API routes
    api/
      bets/      # place, active
      battles/   # quick, execute, auto, history, payout, bet
      cron/      # scheduler, matchmaker, cleanup, scheduled-battles
      payouts/   # process
  components/
    arena/       # MatchLiveView, BetPanel, BattleRoyale*, SubmitChallenge...
    landing/     # Hero, Features, FAQ, Roadmap, CTA...
    effects/     # GlitchText, ParticleField, EmberField...
    layout/      # Header, Footer, LayoutWrapper
    leaderboard/ # BettorLeaderboard
    ui/          # MatchCard, StatsBar, NotificationBell, ErrorBoundary...
    wallet/      # WalletProvider
  hooks/         # useCurrentMatch, useMatchOdds, useMyBet, usePlaceBet...
  lib/
    battles/     # engine.ts (executeBattle, markMatchFailed)
    bets/        # parimutuel.ts (calculateOdds, settleMatch)
    groq/        # client.ts (callGroq, multiJudge, generateAgentResponse)
    matchmaking.ts
    payouts/     # processor.ts (processPayoutQueue)
    qstash/      # verify.ts (verifyCronAuth)
    solana/      # config, transfer, payout, matchHash
    supabase/    # client, types, battleRoyale
    treasury/    # logger.ts
    validation.ts
    rateLimit.ts
  types/         # battleRoyale.ts
  styles/        # globals.css
```

## Pitfalls
- Vercel Hobby: 60s function timeout — battles must complete within this
- Groq free tier: 100k tokens/day — ~8-10 battles max. Fallback chain: llama-3.3-70b → llama-3.1-8b → gemma2-9b
- Always get fresh blockhash before building Solana transactions
- `verify.ts` allows all requests if `CRON_SECRET` is unset — MUST be set in production
- Check actual Supabase column names before assuming — use `\d table_name`

## Outdated Files (IGNORE)
`BATTLEPLAN.md`, `RAGNAROK_ROADMAP.md`, `tasks/todo.md`, `tasks/lessons.md`, `WORKFLOW.md` — all superseded by this file + `SPECS.md`
