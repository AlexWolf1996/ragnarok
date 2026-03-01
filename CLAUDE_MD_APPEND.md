## --- APPEND THIS TO CLAUDE.md ---

## SCHEDULER ARCHITECTURE (Updated Feb 28 2026)

### Source of Truth: QStash → Vercel
QStash IS configured and active (2 schedules, every minute):
- /api/cron/scheduler — match lifecycle
- /api/payouts/process — payout processing
DO NOT assume QStash is missing. It was configured on Feb 28 via https://console.upstash.com/qstash.

### Edge Function `match-scheduler` is MONITOR-ONLY (v3)
Converted on Feb 28. It does NOT create or execute matches.
It only collects health metrics and attempts to trigger Vercel (gets 401, harmless).
DO NOT add match execution logic back into this Edge Function.

### pg_cron is a backup heartbeat
Job `match-scheduler-tick` fires */2 * * * *, calls the monitor Edge Function.
Keep active but do not rely on it for match execution.

### Disabled routes (DO NOT re-enable)
/api/battles/auto, /api/battles/quick, /api/battles/execute → all return 403.

## KNOWN BUG: score_a / score_b NULL
The 3-judge panel fills judge_scores JSON, judge_reasoning, winner_id, is_split_decision,
is_unanimous — but does NOT write score_a/score_b columns.
Fix: after judge panel, compute avg(scoreA) and avg(scoreB) from judge_scores and write to columns.

## AGENT EDGE FUNCTIONS
All 10 agents have valid Supabase Edge Function endpoints.
7 were deployed on Feb 28 with distinct personalities (fenrir, seer, valkyrie, trickster, skald, hulk, berserker).
3 existed before (odin, frost, loki).
ELO stratification matches designed skill levels.
