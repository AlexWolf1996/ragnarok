# RAGNAROK — ROADMAP & STATUS TRACKER
### Last updated: 27 Feb 2026
### Owner: Ferdinand | Dev: Claude Code (AlexWolf1996)

---

## EXECUTIVE SUMMARY

**Ragnarok** is an AI agent combat arena on Solana. Users register AI agents, watch them fight on random challenges judged by LLMs, and bet SOL on outcomes.

**Current state:** The core loop works end-to-end (agent registration → challenge → LLM judging → betting → SOL payout). The Battle Royale mode has full backend logic but has never been executed with real participants. The codebase has been migrated from Supabase Edge Functions to Vercel API routes. The product is functional but lacks the polish and credibility features needed for launch.

**Goal:** Ship a launch-ready product with multi-judge fairness, category-based analytics, and polished UX. Then iterate post-launch with engagement features (streaming, dynamic odds).

---

## STATUS LEGEND

| Symbol | Meaning |
|--------|---------|
| ✅ | Done — tested and working |
| 🔨 | In progress |
| ⬜ | Not started |
| ⚠️ | Done but has known issues |
| 🔴 | Blocked / needs decision |

---

## INFRASTRUCTURE AUDIT (as of 27 Feb 2026)

### Stack
| Component | Technology | Status |
|-----------|-----------|--------|
| Frontend | Next.js 16 (Turbopack) | ✅ Deployed |
| Backend | Vercel API Routes (Node.js) | ✅ Migrated from Edge Functions |
| Database | Supabase (PostgreSQL 17) | ✅ 16 migrations applied |
| Auth | Solana wallet (Phantom/Solflare) | ✅ Working |
| AI Judging | Groq API (3-judge panel: Llama 70B, Mixtral 8x7B, Gemma 9B) | ✅ Multi-judge panel |
| Blockchain | Solana (Helius RPC) | ⚠️ Partial — see details |
| Hosting | Vercel | ✅ Live at theragnarok.fun |

### Database Tables
| Table | Rows | Status | Notes |
|-------|------|--------|-------|
| agents | 10 | ✅ | 3 demo agents (Odin, Frost, Loki) + user-registered |
| matches | 27 | ✅ | Working with LLM judging |
| challenges | 33 | ✅ | Types: grid_puzzle, logic, pattern_matching, reasoning, creative, strategy, code, knowledge |
| bets | 3 | ⚠️ | DB tracking works, SOL transfer works, but low volume |
| battle_royales | 1 | ⚠️ | Schema complete, never executed with real participants |
| battle_royale_participants | 0 | ⬜ | Never used |
| battle_royale_rounds | 0 | ⬜ | Never used |
| battle_royale_bets | 0 | ⬜ | Never used |
| matchmaking_queue | 1 | ⚠️ | Logic exists, low usage |
| seasons | 1 | ⚠️ | Schema exists, not surfaced in UI |
| season_standings | 0 | ⬜ | Never populated |
| scheduled_events | 3 | ✅ | Cron scheduling configured |

### API Routes (Vercel)
| Route | Function | Status |
|-------|----------|--------|
| /api/battles/run | Execute 1v1 duel (Groq judge + SOL payout) | ✅ |
| /api/battles/auto | Auto-trigger battles to keep arena alive | ✅ |
| /api/battles/payout | SOL payout to winners | ✅ |
| /api/battles/quick | Quick bet + battle | ✅ |
| /api/battle-royale/create | Create BR arena | ✅ New (Phase 2) |
| /api/battle-royale/join | Join BR with SOL payment verification | ✅ New (Phase 2) |
| /api/battle-royale/start | Start BR, create rounds | ✅ New (Phase 2) |
| /api/battle-royale/execute | Run BR rounds, score, payout | ✅ New (Phase 2) |
| /api/cron/matchmaker | Pair queue agents + auto-battle | ✅ Rewritten (self-contained) |
| /api/cron/scheduled-battles | Auto-start/create scheduled BRs | ✅ Rewritten (self-contained) |
| /api/commentary | Match commentary generation | ✅ |

### Solana Integration
| Feature | Status | Notes |
|---------|--------|-------|
| Wallet connection (Phantom/Solflare) | ✅ | Working |
| SOL transfer to treasury (betting) | ✅ | Via transferToTreasury() |
| Transaction verification (Helius) | ✅ | verifyTransactionDetails() |
| SOL payout to winners | ✅ | From treasury wallet |
| Match hash on-chain | ⚠️ | hashMatchToSolana() exists, usage unclear |
| On-chain program/smart contract | ❌ | None — all server-side escrow |

### Known Technical Risks
| Risk | Severity | Details |
|------|----------|---------|
| Vercel 60s timeout | HIGH | Full battle = tx verify (~15s) + 2x Groq calls (~10s each) + judge (~5-10s) = ~50s. One slow response = timeout. No retry. |
| Groq single point of failure | HIGH | If Groq judge returns bad JSON, fallback is 50/50 tie. Nobody knows. |
| No async payout queue | MEDIUM | Payouts are synchronous. Multiple payouts = timeout risk. |
| RLS policies | LOW | Exist but need security audit before real money at scale. |

---

## ROADMAP

### PHASE 1: MULTI-JUDGE PANEL
**Goal:** Replace single LLM judge with 3 independent LLM judges. Show all 3 scores like boxing judges. Split decisions = drama + credibility.
**Estimated effort:** 2 days
**Status:** ✅ Complete (27 Feb 2026)
**Summary:** 3-judge panel (ODIN/Llama 70B 50%, THOR/Qwen3 32B 30%, FREYA/Llama 8B 20%) with weighted scoring, majority-vote tiebreaker, per-judge error handling, split decision badges, and full UI display. Tested with 5 live battles — 2 unanimous, 2 split decisions. Original Mixtral/Gemma models were decommissioned by Groq; replaced with Qwen3-32B and Llama-3.1-8B.

| # | Task | Status | Files | Complexity | Dependencies |
|---|------|--------|-------|------------|--------------|
| 1.1 | Create multiJudge() function — 3 parallel Groq calls (Llama 3.3 70B, Qwen3 32B, Llama 3.1 8B) | ✅ | src/lib/groq/client.ts | M | None |
| 1.2 | Implement score normalization across models (weighted average: 70B=50%, Qwen3=30%, 8B=20%) | ✅ | src/lib/groq/client.ts | S | 1.1 |
| 1.3 | Per-model JSON parse fallback (2/3 judges still valid if 1 fails) | ✅ | src/lib/groq/client.ts | S | 1.1 |
| 1.4 | Update match schema — store individual judge scores + reasonings | ✅ | supabase/migrations/20260227_multi_judge_panel.sql + types.ts | S | None |
| 1.5 | Update executeBattle() in engine.ts to use multiJudge() | ✅ | src/lib/battles/engine.ts | M | 1.1, 1.4 |
| 1.6 | Update BattleResultDisplay component — show 3 judge scores with names | ✅ | src/components/arena/BattleResultDisplay.tsx | M | 1.4 |
| 1.7 | Display split decision badge when judges disagree | ✅ | src/components/arena/BattleResultDisplay.tsx + BettingDuelPanel.tsx | S | 1.6 |
| 1.8 | Update BR batch scoring to use multi-judge | ⬜ | src/lib/groq/client.ts (scoreBatchResponses) | M | 1.1 |
| 1.9 | End-to-end test: run 5 battles, verify all 3 scores display correctly | ✅ | Manual — 5 battles run, all 3 judges working | S | 1.1–1.7 |

**Decisions required:**
| Decision | Options | Recommendation |
|----------|---------|----------------|
| Score aggregation method | A) Simple average B) Weighted average C) Majority vote | B — Weighted (70B has better reasoning quality) |
| What if all 3 judges fail? | A) Refund bets B) 50/50 split C) Retry once | C then A — retry once, if still fails refund bets |

---

### PHASE 2: CHALLENGE CATEGORIES + AGENT ANALYTICS
**Goal:** Surface existing challenge type data. Show bettors what type of challenge is coming and which agents are strong in that category. Makes betting feel like analysis, not luck.
**Estimated effort:** 1 day
**Status:** ✅ Complete (27 Feb 2026)
**Summary:** Added per-agent category stats (wins, losses, win rate per challenge type) to API and agent profile page with visual progress bars. Challenge category selection moved to the top of the betting panel with icon grid. Balanced random challenge distribution (picks random category first, then random challenge). Arena feed already had category badges.

| # | Task | Status | Files | Complexity | Dependencies |
|---|------|--------|-------|------------|--------------|
| 2.1 | Backend query: per-agent win rate by challenge type | ✅ | src/app/api/agents/[id]/route.ts | S | None |
| 2.2 | Show challenge type BEFORE agent selection in betting UI | ✅ | src/components/arena/BettingDuelPanel.tsx | M | None |
| 2.3 | Agent profile: category win rate bars (reasoning, creative, code, etc.) | ✅ | src/app/agents/[id]/page.tsx | M | 2.1 |
| 2.4 | Ensure balanced challenge category distribution in random selection | ✅ | src/lib/battles/engine.ts | S | None |
| 2.5 | Display category icon/badge on match cards in arena feed | ✅ | Already existed in RecentBattlesFeed.tsx | S | None |

---

### PHASE 3: QUICK WINS BUNDLE (Polish)
**Goal:** Small high-impact features using existing data. Each takes 2-4 hours.
**Estimated effort:** 1 day
**Status:** ✅ Complete (27 Feb 2026)
**Summary:** AgentSelector now shows win-rate bars and W/L stats. BettingDuelPanel shows H2H record when both agents selected. RecentBattlesFeed shows UPSET badge when a lower-ELO agent wins (50+ ELO gap). Matchup preview includes H2H, ELO-based odds, and challenge type. Challenge-first flow achieved via Phase 2.2.

| # | Task | Status | Files | Complexity | Dependencies |
|---|------|--------|-------|------------|--------------|
| 3.1 | Agent form guide — win rate bar + W/L stats in agent selector | ✅ | src/components/ui/AgentSelector.tsx | S | None |
| 3.2 | Head-to-head record (fetches from match history) | ✅ | src/components/arena/BettingDuelPanel.tsx | S | None |
| 3.3 | Upset alerts — UPSET badge on feed when low-ELO beats high-ELO (50+ gap) | ✅ | src/components/arena/RecentBattlesFeed.tsx, /api/battles/history | S | None |
| 3.4 | Matchup preview with implied odds + H2H before betting | ✅ | src/components/arena/BettingDuelPanel.tsx | M | 3.2 |
| 3.5 | Challenge-first flow — challenge category grid shown before agents | ✅ | Achieved via task 2.2 | M | 2.2 |

---

### PHASE 4: UX/UI FIXES & POLISH
**Goal:** Fix all frontend bugs, error states, and rough edges before launch.
**Estimated effort:** 2–3 days
**Status:** ⬜ Not started — requires audit

| # | Task | Status | Priority | Notes |
|---|------|--------|----------|-------|
| 4.1 | Full frontend bug audit (console errors, broken flows, dead links) | ⬜ | CRITICAL | Must do before launch |
| 4.2 | Error handling on all API calls (loading states, retry, user feedback) | ⬜ | CRITICAL | Currently some calls fail silently |
| 4.3 | Wallet disconnection handling (graceful fallback) | ⬜ | HIGH | |
| 4.4 | Mobile responsiveness pass | ⬜ | HIGH | |
| 4.5 | Battle Royale UI — test full join → fight → results flow | ⬜ | HIGH | Never tested with real users |
| 4.6 | Landing page polish | ⬜ | MEDIUM | Currently minimal |
| 4.7 | Leaderboard accuracy (verify ELO calculations match display) | ⬜ | MEDIUM | |
| 4.8 | Loading skeletons on all data-fetching pages | ⬜ | LOW | |

---

### PHASE 5: LAUNCH PREP
**Goal:** Everything needed to go live publicly.
**Estimated effort:** 1–2 days
**Status:** ⬜ Not started

| # | Task | Status | Priority | Notes |
|---|------|--------|----------|-------|
| 5.1 | Security audit — RLS policies, API auth, treasury wallet access | ⬜ | CRITICAL | |
| 5.2 | Groq rate limit plan (paid tier if needed) | ⬜ | HIGH | Free tier = ~30 req/min |
| 5.3 | Vercel timeout mitigation (add retry logic, consider background jobs) | ⬜ | HIGH | Current 50s avg, 60s limit |
| 5.4 | Seed arena with 50+ historical battles for credibility | ⬜ | HIGH | Auto-trigger can help |
| 5.5 | Treasury wallet funded with enough SOL for payouts | ⬜ | CRITICAL | |
| 5.6 | Monitoring/alerting (failed battles, failed payouts, Groq errors) | ⬜ | HIGH | Currently no monitoring |
| 5.7 | Domain/DNS/SSL final check | ⬜ | LOW | |

---

### POST-LAUNCH V2: STREAMING COMBAT DISPLAY
**Goal:** Phase-based combat updates + typewriter reveal. "Watch the battle unfold."
**Estimated effort:** 3 days
**Status:** ⬜ Planned for post-launch

| # | Task | Status | Files | Complexity |
|---|------|--------|-------|------------|
| V2.1 | Backend: write status updates to match record during execution (generating_a → generating_b → judging → completed) | ⬜ | engine.ts | M |
| V2.2 | Supabase Realtime subscription on match status changes | ⬜ | battleRoyale.ts | M |
| V2.3 | Frontend: live phase display during battle (animated states) | ⬜ | Components | L |
| V2.4 | Typewriter reveal of agent responses after completion | ⬜ | Components | M |
| V2.5 | Battle replay — re-watch completed battles with animation | ⬜ | Components | M |

---

### POST-LAUNCH V3: DYNAMIC BETTING (evaluate based on traction)
**Goal:** Multi-bettor pools with live odds. Only worth building with consistent daily users.
**Estimated effort:** 1–2 weeks
**Status:** ⬜ Conditional — depends on post-launch metrics

| # | Task | Status | Complexity | Notes |
|---|------|--------|------------|-------|
| V3.1 | New match lifecycle: announced → betting_open (60s) → closed → in_progress → completed | ⬜ | XL | Architecture change |
| V3.2 | Separate bets table (multi-bettor per match) | ⬜ | L | DB redesign |
| V3.3 | Pari-mutuel payout calculation | ⬜ | M | |
| V3.4 | Supabase Realtime for live bet count / odds | ⬜ | M | |
| V3.5 | Countdown timer (server-authoritative) | ⬜ | M | Clock sync needed |
| V3.6 | Async settlement queue (10+ Solana txs exceed 60s timeout) | ⬜ | L | |
| V3.7 | Treasury as market maker for low-liquidity pools | ⬜ | L | |

---

## SUMMARY TABLE

| Phase | Name | Tasks | Est. Days | Status | Launch Dependency |
|-------|------|-------|-----------|--------|-------------------|
| 1 | Multi-Judge Panel | 9 | 2 | ✅ Complete | YES — required |
| 2 | Challenge Categories | 5 | 1 | ✅ Complete | YES — required |
| 3 | Quick Wins | 5 | 1 | ✅ Complete | YES — required |
| 4 | UX/UI Fixes | 8 | 2–3 | ⬜ | YES — required |
| 5 | Launch Prep | 7 | 1–2 | ⬜ | YES — required |
| V2 | Streaming Combat | 5 | 3 | ⬜ | NO — post-launch |
| V3 | Dynamic Betting | 7 | 7–14 | ⬜ | NO — conditional |
| | **TOTAL PRE-LAUNCH** | **34** | **7–9 days** | | |

---

## HOW TO USE THIS DOCUMENT

1. **After each coding session**, update the Status column of completed tasks (⬜ → ✅)
2. **After each phase**, write a 2-line summary of what changed under the phase header
3. **If a new bug or task is discovered**, add it to the appropriate phase
4. **If a decision is made**, record it in the Decisions table with date and rationale
5. **This is the single source of truth** — if it's not here, it doesn't exist in the plan
