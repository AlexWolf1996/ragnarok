# SPECS — MVP Launch Sprint (March 1, 2026)

> Execute tasks in order. Each task is self-contained.
> After completing each task, run `npm run build` to verify no regressions.
> Commit after each task with the specified commit message.

---

## PHASE 1: CRITICAL BUG FIXES

### B01 — Fix `times_used` operator precedence bug
**File:** `src/app/api/cron/scheduler/route.ts` line ~170
**Bug:** `|| 0 + 1` evaluates as `|| (0 + 1)` due to JS operator precedence, so `times_used` is always 1.
**Fix:**
```ts
// BEFORE (broken):
.update({ times_used: (picked as { times_used?: number }).times_used || 0 + 1 })

// AFTER (correct):
.update({ times_used: ((picked as { times_used?: number }).times_used ?? 0) + 1 })
```
**Verify:** `npm run build` passes. Search codebase for other `|| 0 +` patterns.
**Commit:** `fix: times_used operator precedence — ?? instead of ||`

---

### B02 — Increase match interval to reduce Groq rate limit failures
**File:** `src/app/api/cron/scheduler/route.ts` lines ~25-26
**Problem:** 30-min interval + 100k tokens/day Groq limit = ~17% match failure rate (38/224 matches failed).
**Fix:**
```ts
// BEFORE:
const BETTING_WINDOW_MS = 10 * 60 * 1000;  // 10 min
const MATCH_INTERVAL_MS = 30 * 60 * 1000;  // 30 min

// AFTER:
const BETTING_WINDOW_MS = 15 * 60 * 1000;  // 15 min betting window
const MATCH_INTERVAL_MS = 60 * 60 * 1000;  // 60 min between matches (~14 battles/day)
```
**Why:** 5 Groq calls/battle × ~2k tokens each ≈ 10k tokens/battle. At 100k/day = ~10 battles safe. 60-min interval = ~14/day with margin. Also gives bettors more time to discover and place bets.
**Verify:** `npm run build` passes.
**Commit:** `fix: increase match interval to 60min — prevent Groq rate limit exhaustion`

---

## PHASE 2: FRONTEND POLISH

### F01 — Sharp corners migration (design consistency)
**Files:** All files in `src/components/` that use `rounded-lg` or `rounded-xl`
**Task:** Replace `rounded-lg` → `rounded-sm` and `rounded-xl` → `rounded-sm` across all components. The design system specifies sharp geometric angles (Norse-tech aesthetic). Do NOT change `rounded-full` (used for avatars/badges).
**Scope:**
- `src/components/ui/` — all files
- `src/components/arena/` — all files
- `src/components/leaderboard/` — all files
- `src/components/landing/` — all files
**Verify:** `npm run build` passes. Visual check: no jarring mismatches remain.
**Commit:** `refactor: migrate rounded-lg to rounded-sm — sharp Norse-tech aesthetic`

---

### F02 — Color palette unification
**Files:** All components using `amber-500`, `amber-400`, `amber-600` variants
**Task:** Audit and normalize gold accent colors. The canonical gold is `#c9a84c` (CSS custom property or Tailwind arbitrary value `text-[#c9a84c]`). Replace Tailwind `amber-*` classes with the canonical gold where they represent the brand accent:
- `text-amber-500` → `text-[#c9a84c]`
- `text-amber-400` → `text-[#D4A843]` (lighter variant for hover)
- `bg-amber-500/10` → `bg-[#c9a84c]/10`
- `border-amber-500` → `border-[#c9a84c]`
**Exception:** Keep `amber-*` if it's used for warning states (not branding).
**Verify:** `npm run build`. Grep for remaining `amber-` usages and confirm each is intentional.
**Commit:** `refactor: unify gold accent colors to #c9a84c — brand consistency`

---

### F03 — Landing page final polish
**Files:** `src/components/landing/Hero.tsx`, `src/app/page.tsx`
**Tasks:**
1. Verify countdown TARGET_DATE is correct: currently `2026-03-09T18:00:00Z`. Update if launch date has changed.
2. Ensure "ENTER ARENA" button is prominent and works (links to `/arena`)
3. Ensure "WHITEPAPER" button links to `/docs` and the page loads
4. Check that all images in `public/images/` referenced by landing components exist (temple.png, yggdrasil.png, logotextevf.png)
5. Test mobile responsiveness: Hero text sizing, button stacking, countdown layout
**Verify:** `npm run build`. Manual visual check on localhost at mobile (375px) and desktop (1440px).
**Commit:** `chore: landing page final polish and date verification`

---

### F04 — Arena page production readiness
**Files:** `src/app/arena/page.tsx`, `src/components/arena/MatchLiveView.tsx`
**Tasks:**
1. Verify the arena shows current match state correctly for each lifecycle status:
   - `betting_open` → shows agents, countdown, BetPanel enabled
   - `in_progress` → shows "Battle in progress" animation, BetPanel disabled
   - `judging` → shows "Judges deliberating" state
   - `completed` → shows result with scores, winner highlight, ELO changes
   - No active match → shows "Next battle in X minutes" message
2. Battle Royale mode toggle must show "Coming Soon" badge and be non-functional
3. Error states: network failure, wallet disconnected, match not found
**Verify:** `npm run build`. Check arena page loads without console errors.
**Commit:** `chore: arena production readiness verification`

---

### F05 — Leaderboard production readiness
**Files:** `src/app/leaderboard/page.tsx`, `src/components/leaderboard/BettorLeaderboard.tsx`
**Tasks:**
1. Verify agents display with: rank, name, ELO, W/L record, win rate
2. Verify sorting works (by ELO default, clickable headers)
3. Bettor leaderboard tab: verify it shows top bettors if data exists, empty state if not
4. Check that ELO values match what's in the database (no stale cache)
**Verify:** `npm run build`. Leaderboard page loads with current data.
**Commit:** `chore: leaderboard production readiness verification`

---

## PHASE 3: FINAL VALIDATION

### V01 — Full build and type check
**Command:** `npm run build && npm run lint`
**Expected:** Zero errors, zero warnings on lint. Build completes successfully.
**If errors:** Fix them. Do not suppress with `// @ts-ignore` or `eslint-disable`.
**Commit:** `chore: clean build — zero errors zero warnings`

---

### V02 — Verify environment variables documentation
**File:** `.env.example`
**Task:** Ensure ALL required env vars are listed with descriptions:
```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
CRON_SECRET=                          # MUST be set in production
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
NEXT_PUBLIC_SOLANA_RPC_URL=
TREASURY_WALLET_PRIVATE_KEY=
NEXT_PUBLIC_TREASURY_WALLET_ADDRESS=
```
**Verify:** Compare with all `process.env.*` usages in codebase: `grep -rn "process.env\." src/`
**Commit:** `chore: update .env.example with all required variables`

---

## DONE CRITERIA
All tasks B01-B02, F01-F05, V01-V02 complete. `npm run build` passes. No `rounded-lg` outside of `rounded-full`. No `amber-500` brand colors. `times_used` bug fixed. Match interval at 60min.
