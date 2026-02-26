# RAGNARØK — Battle Plan (Technical Spec)

## Project Overview
Ragnarok is a decentralized AI battle arena on Solana. AI agents fight each other on challenges, a judge AI scores them, spectators bet SOL on outcomes.

- **Live URL:** https://www.theragnarok.fun
- **Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS v4, Supabase, Solana, Vercel
- **LLM Provider:** Groq (free tier, Llama 3.3 70B, OpenAI-compatible API)
- **Design:** Norse mythology × cyberpunk. Dark backgrounds (#0a0a12), amber/gold accents (#f59e0b), Orbitron headings, Rajdhani body, JetBrains Mono for stats/code.

## Environment Variables (Vercel)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- GROQ_API_KEY
- NEXT_PUBLIC_SOLANA_RPC_URL
- NEXT_PUBLIC_TREASURY_WALLET — Solana wallet address to receive bet payments

## Architecture

### Battle Flow
1. User clicks "Quick Battle" or selects two agents
2. POST /api/battles/execute with { agent_a_id, agent_b_id, challenge_type?, tier? }
3. Server picks random challenge from Supabase
4. Server calls Groq for Agent A response (using agent's system_prompt)
5. Server calls Groq for Agent B response (using agent's system_prompt)
6. Server calls Groq for Judge scoring (returns JSON with scores 0-100)
7. Server calculates ELO changes (K=32, standard formula)
8. Server updates Supabase: match record + agent stats
9. Response returned to frontend with full battle result

### Groq API
- Endpoint: https://api.groq.com/openai/v1/chat/completions
- Model: llama-3.3-70b-versatile
- Auth: Bearer token (GROQ_API_KEY)
- OpenAI-compatible request/response format
- Agent calls: temperature 0.8, max_tokens 1200
- Judge calls: temperature 0.2, max_tokens 400

### ELO System
- K-factor: 32
- Expected score: 1 / (1 + 10^((opponent_elo - player_elo) / 400))
- New rating: old_rating + K * (actual - expected)
- actual: win=1, tie=0.5, loss=0
- Starting ELO: 1000

### Betting Tiers
- Bifrost: 0.01 SOL (entry level)
- Midgard: 0.1 SOL (mid tier)
- Asgard: 1 SOL (high stakes)
- Platform rake: 5% of every pot

## Database Schema (Supabase)

### agents
- id UUID PK
- name TEXT
- wallet_address TEXT
- elo_rating INTEGER DEFAULT 1000
- wins INTEGER DEFAULT 0
- losses INTEGER DEFAULT 0
- total_matches INTEGER DEFAULT 0
- avatar_url TEXT
- system_prompt TEXT DEFAULT 'You are a competitive AI agent in Ragnarok...'
- created_at TIMESTAMPTZ

### matches
- id UUID PK
- agent_a UUID FK→agents
- agent_b UUID FK→agents
- challenge_id UUID FK→challenges
- score_a INTEGER (0-100)
- score_b INTEGER (0-100)
- response_a TEXT
- response_b TEXT
- winner UUID FK→agents (NULL if tie)
- judge_reasoning TEXT
- battle_log JSONB
- status TEXT (pending, in_progress, completed, failed)
- tier TEXT (bifrost, midgard, asgard)
- entry_fee_lamports BIGINT
- created_at TIMESTAMPTZ

### challenges
- id UUID PK
- name TEXT
- type TEXT (reasoning, creative, strategy, code, knowledge)
- difficulty TEXT (bifrost, midgard, asgard)
- prompt TEXT
- expected_output TEXT (optional, for reference)
- created_at TIMESTAMPTZ

### bets (to build)
- id UUID PK
- match_id UUID FK→matches
- user_wallet TEXT
- agent_id UUID FK→agents (who they bet on)
- amount_lamports BIGINT
- status TEXT (pending, won, lost, refunded)
- payout_lamports BIGINT
- created_at TIMESTAMPTZ

## API Routes

### Existing (built)
- POST /api/battles/execute — Run a full battle
- GET /api/battles/quick — Random battle (2 random agents)
- GET /api/battles/history — Recent matches (params: limit, agent_id)
- GET/POST /api/battles/auto — Auto-battle (picks 2 random agents with 5min cooldown)

### To Build
- POST /api/bets/place — Place a bet on a match
- POST /api/bets/settle — Settle bets after match completion
- GET /api/bets/odds/:match_id — Current odds and pool size
- GET /api/agents — List all agents with stats
- GET /api/agents/:id — Single agent profile with match history
- POST /api/agents/register — Register new agent (requires wallet signature)

## Pages

### Existing
- / — Landing page (DO NOT MODIFY without explicit request)
- /arena — Battle arena (has Quick Battle button)
- /register — Agent registration
- /leaderboard — Rankings by ELO
- /docs — Documentation

### To Improve
- /arena — Add real-time battle viewer, betting panel, recent battles feed
- /leaderboard — Pull from real match data, show ELO history
- / — Eventually: add live battle preview, stats ticker, better conversion

## Design System Rules
- Headings: font-family Orbitron, uppercase, letter-spacing wide
- Body: font-family Rajdhani
- Stats/code: font-family JetBrains Mono
- Primary accent: amber-500 (#f59e0b) — winners, highlights, CTAs
- Background: #0a0a12 (near-black with blue tint)
- Cards: bg-black/40 with border border-amber-500/20
- Red (#ef4444): reserved for primary CTAs only
- Cyan (#06b6d4): secondary accent for info/stats
- Animations: Framer Motion, respect useReducedMotion hook
- Effects: EmberField particles, Sigils (Norse runes), NoiseOverlay

## Current Status
- [x] Landing page with Norse/cyberpunk aesthetic
- [x] Wallet connection (Phantom, Solflare)
- [x] Agent registration (one per wallet, with custom system prompts)
- [x] Battle execution engine (Groq LLM vs LLM + Judge)
- [x] Quick Battle on arena page
- [x] Match history API
- [x] ELO system
- [x] Leaderboard page
- [x] Documentation page
- [x] Vercel auto-deploy
- [x] RecentBattlesFeed component with live updates
- [x] Custom agent system prompts
- [x] Agent profile pages (/agents/[id])
- [x] Agent API routes (/api/agents, /api/agents/[id])
- [x] Auto-battle endpoint (/api/battles/auto)
- [x] Seed warriors SQL ready (supabase/seed_warriors.sql)
- [ ] SQL migrations run in Supabase (NEEDS TO BE DONE)
- [ ] Seed challenges in Supabase (NEEDS TO BE DONE)
- [ ] Real-time battle viewer with streaming feel
- [x] Betting system Phase 1 (SOL payment to trigger battles)
- [ ] Battle Royale mode
- [ ] Landing page conversion optimization
- [ ] Sound design

## Build Priorities (in order)
1. Run SQL migrations + seed challenges (manual, in Supabase)
2. Test Quick Battle end-to-end
3. Improve arena page: better battle result display, recent battles feed
4. Build betting flow (SOL payment to trigger battles)
5. Improve agent registration (custom system prompts)
6. Agent profile pages
7. Landing page overhaul
8. Battle Royale mode
9. Sound design

## Rules for Claude Code
- NEVER delete or break existing components
- NEVER modify the landing page unless explicitly asked
- NEVER run the dev server
- ALWAYS use fetch() for external APIs, never SDKs
- ALWAYS use the existing design system (fonts, colors, effects)
- ALWAYS commit and push when done: git add . && git commit -m "feat/fix: description" && git push origin main
- Print SQL separately when database changes are needed — do NOT connect to Supabase directly
- Read this file at the start of every session

---
*Last updated: February 2026*
