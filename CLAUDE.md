# RAGNARÖK

## What
Onchain AI battle arena on Solana. AI agents compete in real-time, users bet via parimutuel prediction markets. Built with Next.js 15 (App Router), Supabase, Groq (Llama 3.3 70B + fallbacks), Solana Web3.js, Tailwind CSS.

## Why
Scheduled matches with betting windows and live spectacle. The user is a **bettor first** — arrive, see a match, pick a side, watch, win or lose.

## Current Sprint
@SPECS.md

## Compact Instructions
When compacting context, ALWAYS preserve:
- The full Architecture section below (battle system, betting, payouts, ELO, cron)
- The current sprint status from SPECS.md (which tasks are done vs pending)
- The Locked Files list — never modify these without explicit task approval
- The Design System rules (sharp corners, gold #c9a84c, no amber branding)
- The Agents section — code-reviewer and battle-debugger descriptions and when to invoke
- Any in-progress task context and file paths being worked on
- The PROGRESS.md log of completed work this session

## Commands
```bash
npm run dev          # local dev server (http://localhost:3000)
npm run build        # production build — MUST pass before any PR
npm run lint         # ESLint strict
```

## Architecture (DO NOT CHANGE without discussion)

### Battle System
- **Match lifecycle:** `scheduled → betting_open → in_progress → judging → completed | failed`
- **3-judge LLM panel** — Odin (llama-3.3-70b, 50%), Thor (qwen3-32b, 30%), Freya (llama-3.1-8b, 20%)
- Ties = random coin flip (not ELO-based)
- Each battle = 5 Groq API calls (2 agent responses + 3 judge scores)

### Betting
- **Parimutuel odds** — pool-based, 5% rake, treasury never pays from reserves
- **Bet tiers:** Bifrost 0.01, Midgard 0.05, Asgard 0.1 SOL
- On-chain Solana tx verification before bet is recorded
- Idempotency via UNIQUE constraint on `tx_signature`
- Rate limit: 5 bets/wallet/minute

### Payouts
- **Sequential payouts** — `payout_queue` with `FOR UPDATE SKIP LOCKED`, never parallel
- `claim_pending_payout()` SQL function for atomic claim
- Max 3 retry attempts, then permanent failure with notification

### ELO & Matchmaking
- ±200 → ±300 → ±400 → any (expanding bands)
- Dynamic K-factor: K=40 (<20 battles), K=20 (20-50), K=10 (50+)
- Atomic stat updates via `update_agent_battle_stats()` RPC

### Cron / QStash
- **Primary:** Upstash QStash → `/api/cron/scheduler` every minute
- **Fallback:** `vercel.json` daily cron
- `scheduler_lock` table prevents concurrent execution (50s timeout)
- Auth: QStash signature OR `CRON_SECRET` Bearer token
- Shared auth: `src/lib/qstash/verify.ts`

## Conventions
- TypeScript strict — **no `any` in financial logic**
- All SOL amounts: `numeric` in Supabase, never floating point
- snake_case for DB columns, camelCase for TypeScript
- Commits: `feat:` / `fix:` / `refactor:` / `chore:`
- UNIQUE constraint on every transaction signature column
- Idempotency on all financial endpoints
- Error messages to client: sanitized. Full errors in `console.error` only.

## Design System
- **Palette:** Dark base `#0a0a0f`, text `#e8e8e8`, accent gold `#c9a84c` / `#D4A843`, danger red `#c41e3a`
- **Font:** Mono/Orbitron for headings, Rajdhani for body
- **Style:** Sharp geometric angles — `rounded-none` or `rounded-sm`, NEVER `rounded-lg` or `rounded-xl`
- **Effects:** Subtle particle fields, glitch text, scanlines. Respect `useReducedMotion`.
- Gold accent = `#c9a84c`, NOT Tailwind `amber-500`. Only use `amber-*` for warning states.

## Locked Files (do NOT modify unless a SPECS task explicitly targets them)
- `src/lib/battles/engine.ts`
- `src/lib/bets/parimutuel.ts`
- `src/lib/payouts/processor.ts`
- `src/lib/groq/client.ts`
- `src/lib/qstash/verify.ts`

## Agents (`.claude/agents/`)
Two custom subagents with **isolated context** — their exploration doesn't fill your main context window.

- **code-reviewer** — Auto-invoked after code changes. Checks security, financial safety, design system, locked files. Feedback: 🔴 critical / 🟡 warning / 🟢 suggestion.
- **battle-debugger** — Auto-invoked when matches fail, scores are wrong, scheduler is stuck, or Groq rate limits hit. Traces: scheduler → engine → groq → payout chain.

Both use `model: sonnet`, `memory: project` (accumulate knowledge across sessions). Invoke explicitly: `"Use the battle-debugger to check why matches are failing"`. Or Claude will invoke them automatically based on the task description.

Built-in agents also available:
- **Explore** (Haiku, read-only) — fast codebase search
- **Plan** (Sonnet, read-only) — used in Plan Mode (Shift+Tab)

## File Structure
```
src/
  app/              # Pages + API routes (see src/app/api/CLAUDE.md for API rules)
    api/bets/       # place, active
    api/battles/    # quick, execute, auto, history, payout, bet
    api/cron/       # scheduler, matchmaker, cleanup, scheduled-battles
    api/payouts/    # process
    arena/          # Battle arena page
    leaderboard/    # Rankings page
    docs/           # Whitepaper page
  components/
    arena/          # MatchLiveView, BetPanel, BattleRoyale*, SubmitChallenge...
    landing/        # Hero, Features, FAQ, Roadmap, CTA...
    effects/        # GlitchText, ParticleField, EmberField...
    layout/         # Header, Footer, LayoutWrapper
    leaderboard/    # BettorLeaderboard
    ui/             # MatchCard, StatsBar, NotificationBell, ErrorBoundary...
    wallet/         # WalletProvider
  hooks/            # useCurrentMatch, useMatchOdds, useMyBet, usePlaceBet...
  lib/
    battles/        # engine.ts — LOCKED
    bets/           # parimutuel.ts — LOCKED
    groq/           # client.ts — LOCKED
    payouts/        # processor.ts — LOCKED
    qstash/         # verify.ts — LOCKED
    matchmaking.ts
    solana/         # config, transfer, payout, matchHash
    supabase/       # client, types, battleRoyale
    treasury/       # logger.ts
    validation.ts
    rateLimit.ts
```

## Pitfalls
- Vercel Hobby: 60s function timeout — battles must complete within this
- Groq free tier: 100k tokens/day — ~10 battles max. Fallback: llama-3.3-70b → llama-3.1-8b → gemma2-9b
- Always get fresh blockhash before building Solana transactions
- `verify.ts` allows all requests if `CRON_SECRET` is unset — MUST be set in production

## Outdated Files (IGNORE)
`BATTLEPLAN.md`, `RAGNAROK_ROADMAP.md`, `tasks/todo.md`, `tasks/lessons.md`, `WORKFLOW.md`
