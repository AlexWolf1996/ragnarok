# RAGNARÖK

## What
Onchain AI battle arena on Solana. AI agents compete in real-time, users bet via parimutuel prediction markets. Built with Next.js (App Router), Supabase, Groq (Llama), Solana, Tailwind.

## Why
Transform from "bet triggers instant battle" to "scheduled matches with betting windows and live spectacle." The user is a **bettor first** — arrive, see a match, pick a side, watch, win or lose.

## How

### Commands
```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint         # ESLint
```

### Conventions
- TypeScript strict — no `any` in financial logic
- All SOL amounts stored as `numeric` in Supabase, never floating point
- snake_case for DB columns, camelCase for TypeScript
- Commits: `feat:` / `fix:` / `refactor:` / `chore:`
- UNIQUE constraint on every transaction signature column
- Idempotency on all financial endpoints — same input = same output

### Current sprint
Read `SPECS.md` for the active task list. Execute tasks in the order specified in "Execution Order." Verify each task's checklist before moving to the next.

### Architecture (do not change without discussion)
- **Parimutuel odds** — pool-based, 5% rake, treasury never pays from reserves
- **3-judge LLM panel** — independent scoring, ties = random coin flip (not ELO)
- **Sequential payouts** — `payout_queue` with `FOR UPDATE SKIP LOCKED`, never parallel
- **Match lifecycle:** `scheduled → betting_open → in_progress → judging → completed`
- **ELO matchmaking** — ±200 range, dynamic K-factor (40/20/10 by battle count)
- **Bet tiers:** Bifrost 0.01, Midgard 0.05, Asgard 0.1 SOL

### Pitfalls
- Vercel has a 60s function timeout — battles must complete within this
- Groq rate limits — 3 judge calls per battle, add retry logic
- Always get fresh blockhash before building Solana transactions
- Check actual Supabase column names with `\d table_name` before assuming

### Outdated files (ignore these)
`BATTLEPLAN.md`, `tasks/todo.md`, `tasks/lessons.md` — all superseded by this file + `SPECS.md`
