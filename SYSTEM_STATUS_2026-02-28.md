# RAGNARÖK SYSTEM STATUS — Feb 28, 2026 21:30 CET

## ⚠️ READ THIS BEFORE MAKING CHANGES

This document summarizes work done in a parallel Claude.ai session (not Claude Code).
It reflects the CURRENT state of the system. Some assumptions in previous Claude Code
sessions may be outdated.

---

## ARCHITECTURE — SINGLE SOURCE OF TRUTH

### Match Execution: QStash → Vercel (ONLY executor)

QStash is configured and active on https://console.upstash.com/qstash
Two schedules firing every minute:
- `theragnarok.fun/api/cron/scheduler` — match lifecycle (create, execute, settle)
- `theragnarok.fun/api/payouts/process` — payout processing

**The Vercel scheduler is the ONLY match executor.** It uses the 3-judge Groq panel
(ODIN/llama-3.3-70b, THOR/qwen3-32b, FREYA/llama-3.1-8b) with rich reasoning.
This is confirmed by recent match data: all matches since ~19:35 UTC have
judge_scores, is_split_decision, is_unanimous, and judge_reasoning (1300-2300 chars).

### Supabase Edge Function `match-scheduler` — Monitor ONLY (v3)

The Edge Function was converted to MONITOR-ONLY on Feb 28 ~20:20 UTC.
It does NOT create or execute matches anymore. It only:
1. Triggers the Vercel scheduler via HTTP GET (currently gets 401 — expected, no QStash signature)
2. Triggers the Vercel payouts processor (same 401)
3. Collects read-only health metrics
4. Detects stuck states for alerting

**DO NOT add match creation or execution logic back into this Edge Function.**
This was the source of the "two schedulers" problem — the Edge Function had a
simplified scoring system (deterministic, 20-20 draws) that produced lower-quality
matches than the Vercel 3-judge panel.

### pg_cron — Backup layer (active, harmless)

```sql
-- Job: match-scheduler-tick (jobid 2)
-- Schedule: */2 * * * *
-- Calls: match-scheduler Edge Function (which is now monitor-only)
```

pg_cron fires every 2 minutes, calls the monitor Edge Function. The Edge Function
tries to trigger Vercel but gets 401 (no QStash signature). This is harmless and
serves as a health-check heartbeat. Keep it active as backup.

### Self-healing — Third layer

User visits trigger stale match detection in `/api/matches/current`.
If a match is stuck, it kicks the scheduler.

### Summary: 3-layer reliability
1. **QStash → Vercel** (primary, 1x/min) ← SOURCE OF TRUTH
2. **pg_cron → Edge Function monitor** (backup, 2x/min, read-only)
3. **Self-healing** (on user visit)

---

## KNOWN BUG: score_a / score_b ARE NULL

**This is NOT a scheduler conflict issue.** The Vercel 3-judge panel fills:
- `judge_scores` (JSON array with individual judge votes) ✅
- `judge_reasoning` (text, 1300-2300 chars) ✅
- `is_split_decision` / `is_unanimous` ✅
- `winner_id` ✅

But it does NOT aggregate scores into `score_a` / `score_b` columns.
The data exists in `judge_scores` — for example:
```json
[{"scoreA": 85, "scoreB": 92}, {"scoreA": 95, "scoreB": 85}, {"scoreA": 82, "scoreB": 88}]
```

**Fix needed:** After the judge panel vote, compute average scores and write to
`score_a` / `score_b`. Something like:
```typescript
const avgScoreA = Math.round(judgeResults.reduce((s, j) => s + j.scoreA, 0) / judgeResults.length);
const avgScoreB = Math.round(judgeResults.reduce((s, j) => s + j.scoreB, 0) / judgeResults.length);
// Update match with score_a: avgScoreA, score_b: avgScoreB
```

Check if the frontend displays these columns. If it does, scores will show as empty/null.

---

## DISABLED ROUTES (P2 — DO NOT RE-ENABLE)

These routes were disabled to prevent competing match execution:
- `/api/battles/auto` → 403
- `/api/battles/quick` → 403
- `/api/battles/execute` → 403

The Edge Function `match-scheduler` was the same type of problem — now resolved
by converting it to monitor-only (v3).

---

## AGENT EDGE FUNCTIONS — ALL 10 ACTIVE

All deployed to: `https://svhzqzuhybkclszwyfoz.supabase.co/functions/v1/agent-{name}`

| Slug | ELO | Win Rate | Personality |
|------|-----|----------|-------------|
| agent-loki | 1219 | 59.2% | Strategist, calculated precision |
| agent-frost | 1202 | 46.9% | Methodical, thorough analysis |
| agent-odin | 1142 | 35.7% | Wise, comprehensive answers |
| agent-seer | 1101 | 64.7% | Oracle, Fibonacci detection |
| agent-valkyrie | 1074 | 65.2% | Disciplined warrior, balanced |
| agent-fenrir | 1053 | 64.7% | Predator, pattern recognition |
| agent-trickster | 1035 | 43.5% | Deceiver, 60% correct |
| agent-hulk | 921 | 8.3% | Brute force, always wrong |
| agent-skald | 920 | 19% | Poet, bad heuristics |
| agent-berserker | 891 | 7.7% | 15% genius, 85% chaos |

7 agents (fenrir, seer, valkyrie, trickster, skald, hulk, berserker) were deployed
on Feb 28 with distinct personalities. Their ELO stratification matches the designed
skill levels perfectly.

---

## SUPABASE EXTENSIONS ACTIVE

- `pg_cron` (pg_catalog schema) — job scheduler
- `pg_net` (extensions schema) — async HTTP for pg_cron
- `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `pg_graphql`, `supabase_vault`, `plpgsql`

---

## MATCH CYCLE TIMING

- Betting window: 10 minutes
- Match execution: ~10 seconds (agent calls + judge panel)
- Cooldown: 5 minutes
- Total cycle: ~15-20 minutes
- Daily throughput: ~72-96 matches/day

---

## SYSTEM HEALTH (as of 20:30 UTC Feb 28)

- Active agents: 10/10 ✅
- QStash schedules: 2 active, firing every minute ✅
- Completed matches today: 34+ ✅
- Failures since fixes: 0 (after 18:22 UTC) ✅
- Stuck bets: 0 ✅
- pg_cron: active (backup) ✅
- Edge Function match-scheduler: v3 (monitor-only) ✅
