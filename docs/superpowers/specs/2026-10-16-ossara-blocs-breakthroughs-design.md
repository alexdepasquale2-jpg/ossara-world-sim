# Ossara: Blocs & Breakthroughs — Design Spec

**Date:** 2026-10-16  
**Status:** Implemented (in progress) — see `docs/superpowers/plans/2026-10-16-ossara-blocs-breakthroughs.md`  
**Base:** Ossara v1 (Vite, TypeScript, Three.js 2D, GitHub Pages)

## 1. Vision & scope

### Player fantasy

The player is a **patron of one pact/bloc** on the continent. They shape **cooperation** (trade stance, joint festivals, research compacts, mutual aid) and resolve **policy override** proposals when upper governance conflicts with member cities. The experience is inspired by **Mafia City–style function** (timers, alerts, joint actions, progression urgency) applied to **cooperation, events, politics, and governance** — **civic/neutral theme**, not crime.

### In scope (v2)

| Pillar | Deliverable |
|--------|-------------|
| Trade & economy | 3 goods, city stocks, prices, trade routes, merchant visuals |
| Migration | Daily population drift; border/pact rules |
| Governance | Geography + voluntary pacts; local policies; state/nation overrides |
| Cooperation | Bloc stances, cooperation budget, joint events, alliances |
| Inventions | Emergent city breakthroughs + event-driven; spread via trade/bloc |
| Events & politics | Feed, map pings, pending decisions |
| Conflict | Abstract bloc vs bloc when tension high |
| Visuals | Pact outlines, routes, invention pulses, biome tint, day/night, mobile tabs |

### Out of scope (v2)

Multiplayer, backend/saves, crime/rackets skin, full tech-tree eras, unit marches, 3D, authentication.

### Success criteria

On GitHub Pages/mobile, a new player can: pick a bloc; survive **10 sim-days**; see **trade + migration + one invention spread**; resolve **one policy override**; follow the story in the **event feed** without a long tutorial.

## 2. Simulation architecture

### SimClock phases (ordered per tick)

1. **GovernancePhase** — pact timers, stances, override queue  
2. **EconomyPhase** — production, consumption, prices, trade orders  
3. **MigrationPhase** — pressure, daily batch moves  
4. **InventionPhase** — emergent rolls, spread  
5. **EventPhase** — scheduled + reactive → `SimEvent`  
6. **ConflictPhase** — abstract bloc clash if tension threshold  
7. **AgentPhase** — residents; merchants on routes  
8. **RollupPhase** — city → continent stats  

### Modules

| File | Role |
|------|------|
| `sim/clock.ts` | Orchestrator |
| `sim/governance.ts` | Pacts, policies, conflicts, decisions |
| `sim/economy.ts` | Goods, prices, routes |
| `sim/migration.ts` | Population drift |
| `sim/inventions.ts` | Discovery and spread |
| `sim/events.ts` | Templates and feed |
| `sim/conflict.ts` | Tension and abstract resolution |
| `sim/agents.ts` | Movement (from existing engine) |
| `sim/rollup.ts` | Aggregates |

### Tick granularity

~60 logical ticks per sim-day at speed 1. Heavy systems (migration, invention spread checks) run every N ticks.

### Determinism

Single `seed` for world gen and RNG. Same seed + same player choices → same timeline.

### Renderer coupling

Sim exposes overlay snapshot: pact colors, routes, migration arrows (optional), invention pulses, event pings. UI reads `events[]` and `decisions[]`, not internal phase state.

## 3. Governance, pacts & overrides

### Local policies (per city)

- **Trade openness:** Closed / Balanced / Open  
- **Culture investment:** Low / Medium / High  
- **Labor focus:** Industry / Services / Arts  

### Pacts

- Cities join **at most one** pact (2–8 members target).  
- Fields: name, color, stances, cooperation budget, member city ids.  
- **Stances (patron-nudged, cooldown ~3 sim-days):** prefer member trade, open internal borders, joint research, mutual aid events.  

### Player (bloc patron)

- Choose or found pact at start.  
- Nudge stances; fund joint events from budget; vote on relevant override proposals.  

### Override flow

1. City local policy vs state/nation mandate → conflict.  
2. Unresolved in X days → override proposal.  
3. `PendingDecision` for player when bloc affected.  
4. Approve (upper wins, Y days), Deny (local wins, +tension), Defer (bloc AI econ-weighted vote).  

## 4. Economy, trade & migration

### Goods

**Food**, **Goods**, **Culture** — per city: stock, capacity, production, consumption.

### Prices

Continent reference price per good; local price = reference × tariff(openness). Shortages hurt happiness.

### Trade routes

Auto between complementary cities when trade allowed. Cap ~40 active routes. Merchants visualize progress. Bloc “prefer members” prioritizes intra-pact routes.

### Migration

Daily batch: 0.1–0.5% pop shift along pressure gradient within state/region; cross-border needs open rules. Visual: optional top-3 corridor arrows.

## 5. Inventions

### Model

`Invention`: id, name, kind (Production | Trade | Culture | Governance), originCityId, discoveredDay, spreadLevel (0–3), perks (numeric multipliers).

### Emergent (B)

Eligibility roll every ~5 sim-days when city thresholds met (econ, art, pop + policies).

### Event-driven (C)

Templates: research summit, crisis recovery, artist residency, etc.

### Spread

- Trade exposure → neighbor (level 1)  
- Joint research stance → pact (level 2)  
- Rare continent-known (level 3)  

Same kind: best perk wins; weaker marked obsolete in feed.

## 6. Events, feed & conflict

### SimEvent

id, day, category, title, body, entityIds, pactIds, severity, optional expiry.

Categories: Economy, Migration, Governance, Invention, Cooperation, Conflict.

### Feed UX

Scrollable feed; tap → pan/zoom + highlight. Decision-required rows pin until resolved.

### Abstract conflict

Pact pair tension 0–100. At ≥70 → clash pending → power score (econ, pop, inventions, budget, stances). Outcome: influence on contested cities or trade embargo — **no border geometry changes**. Patron: Escalate / Seek treaty / Defer before auto-resolve.

## 7. Visuals & UI

### Map layers

Pacts (outline), trade (routes), migration (optional), inventions, event pings, governance badges.

### Desktop

Panel tabs: Overview | Feed | Bloc | Layers.

### Mobile

Bottom sheet tabs: Stats | Feed | Bloc | Layers; decision card above peek; 44px+ targets.

### Start flow

Choose pact → brief stance primer → sim runs.

### Polish

Subtle biome tint by region; day/night overlay; inventions visually distinct from art sites.

## 8. Data model, phasing & tests

### New world fields

`pacts`, `routes`, `inventions`, `events`, `decisions`, `playerPactId`.

### Implementation slices

0. SimClock + types  
1. Pacts + patron UI  
2. Economy + routes  
3. Migration  
4. Inventions  
5. Events + decisions  
6. Governance conflicts + abstract clash  
7. Visual polish  

Each slice keeps build green and Pages deployable.

### Tests

Unit: prices, migration pressure, spread rules, override escalation (seeded).  
Smoke: 100 ticks no throw.  
Manual: mobile decision + feed tap-to-pan checklist.

### Frozen limits (anti-creep)

3 goods, 3 local policies, 4 stances, ~12 event templates, ~8 invention name templates.

## Approvals

| Section | Status |
|---------|--------|
| §1 Vision | Approved |
| §2 Architecture | Approved |
| §3 Governance | Approved |
| §4 Economy | Approved |
| §5 Inventions | Approved |
| §6 Events | Approved |
| §7 UI | Approved |
| §8 Phasing | Approved |
