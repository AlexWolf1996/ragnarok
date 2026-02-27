# CLAUDE.md — Automatic instructions for Claude Code

## Project: Ragnarok (theragnarok.fun)
AI battle arena on Solana. Tech: Next.js 16, Supabase, Groq LLM, Vercel, Solana Web3.js.

## Current Status
- Battles: WORKING (Groq LLM engine, 10 agents, auto-battle daily cron)
- Agent registration: WORKING (custom system prompts, avatars)
- Agent profiles: WORKING (stats, match history, ELO chart)
- Landing page: WORKING (deployed)
- Betting: BROKEN — frontend + backend complete, but Solana RPC fails in browser
  - Error: "failed to get recent blockhash: TypeError: Failed to fetch"
  - Likely cause: NEXT_PUBLIC_SOLANA_RPC_URL not injected into client JS bundle
  - Treasury wallet: FcaoVBJAqZL2Ya7TEiaNdXm4FGdwGA7ZjXyryhsXt7Tb

## Key Commands
- `npm run build` — must pass before any commit
- `npm run dev` — local dev server
- `npx vercel --prod` — deploy (GitHub webhook is unreliable, use CLI)
- `npx vercel env pull .env.local` — sync env vars from Vercel

## ALWAYS do first
1. Run `git status` to check for uncommitted files before starting

## ALWAYS do last
1. `npm run build` — if it fails, fix before committing
2. `git status` — if new files are untracked, `git add` them
3. `git push origin main` — verify push succeeded
4. Report the commit hash

## Pre-flight checklist before saying "Done"
- [ ] `npm run build` passes
- [ ] All new files are `git add`ed
- [ ] Changes are pushed
- [ ] No `process.env` reads at module level (must be inside functions)
- [ ] DB column names match code
- [ ] If fixing a bug in one route, grep for same pattern in ALL routes

## Common pitfalls — NEVER repeat these

### Next.js build-time
- `next build` prerenders static pages with NO env vars available
- NEVER: `const url = process.env.NEXT_PUBLIC_SUPABASE_URL!` at file top level
- ALWAYS: read env vars inside functions at runtime
- ALWAYS: add fallback values for client-side env vars:
  `const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'`
- Test with `npm run build` before pushing

### Environment variables
- `NEXT_PUBLIC_` vars are baked into the JS bundle AT BUILD TIME, not runtime
- If a NEXT_PUBLIC_ var is undefined in Vercel when you build, it will be undefined forever in that deploy
- To fix: set the var in Vercel dashboard, then redeploy with `npx vercel --prod`
- To verify locally: `npx vercel env pull .env.local` then check the file
- ALWAYS add hardcoded fallbacks for RPC URLs so the app never breaks

### Supabase
- DB columns: `agent_a_id` not `agent_a`, `agent_a_score` not `score_a`
- When adding DB columns, also update `src/lib/supabase/types.ts`
- When seeding data, check NOT NULL constraints first

### Solana
- Treasury wallet MUST differ from user wallet
- Don't await `confirmTransaction()` on frontend — it times out
- Verify transactions on backend with retry loop (5x, 3s apart)
- Use Helius RPC (`https://mainnet.helius-rpc.com/?api-key=KEY`), not public endpoints
- Fallback RPC: `https://api.mainnet-beta.solana.com` (slow but works)
- NEVER use devnet URLs as fallback — everything is mainnet

### Vercel
- After push, check Vercel build logs for correct commit hash
- If wrong commit deploys: use `npx vercel --prod` from local
- Hobby plan: cron must be daily (`0 0 * * *`), not every 15 min
- If build cache causes issues: redeploy without cache

### Code quality
- When fixing a bug in `/api/battles/quick`, check `/api/battles/execute` and `/api/battles/bet` too
- Extract shared logic into helper functions (e.g., `src/lib/battles/engine.ts`)
- If a component exists but feature doesn't work: check `git status` for uncommitted files

## When stuck on the same error twice
STOP. Do not try another variation of the same fix. Instead:
1. `grep -r "PATTERN" src/` to find ALL occurrences
2. Identify the real root cause (not the symptom)
3. Fix every instance at once
4. `npm run build` to verify

## Architecture
See BATTLEPLAN.md for DB schema, API routes, and feature specs.
