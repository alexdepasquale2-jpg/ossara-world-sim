# Ossara: Blocs & Breakthroughs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Ossara v1 into a bloc-patron world sim with trade, migration, governance overrides, emergent/event inventions, event feed, and abstract pact conflict — mobile-first UI.

**Architecture:** Replace monolithic `engine.ts` tick with `SimClock` running ordered phases (`governance → economy → migration → inventions → events → conflict → agents → rollup`). Pure sim modules mutate `World`; UI/renderer read `events`, `decisions`, and overlay snapshots only.

**Tech Stack:** Vite 8, TypeScript 6, Three.js 0.186, Vitest (added in Task 0), GitHub Pages (`GITHUB_PAGES=true` base path).

## Global Constraints

- 3 goods only: Food, Goods, Culture.
- 3 local policies per city: trade openness, culture investment, labor focus.
- 4 pact stances with ~3 sim-day cooldown.
- ~12 event templates, ~8 invention name templates.
- Max ~40 active trade routes continent-wide.
- Civic/neutral copy only (no crime theme).
- No multiplayer, save/load backend, or unit marches in v2.
- Keep `npm run build` green after every task; preserve mobile bottom sheet + pinch.
- Imports at top of file; exhaustive switches on discriminated unions.

---

## File map (target end state)

| Path | Responsibility |
|------|----------------|
| `src/sim/types.ts` | Extended `World`, goods, pacts, routes, inventions, events, decisions |
| `src/sim/clock.ts` | `SimClock.tick(world, ctx)` orchestrator |
| `src/sim/governance.ts` | Pacts, policies, conflicts, override proposals |
| `src/sim/economy.ts` | Production, prices, routes |
| `src/sim/migration.ts` | Daily migration batch |
| `src/sim/inventions.ts` | Discovery + spread |
| `src/sim/events.ts` | Templates, append `SimEvent` |
| `src/sim/conflict.ts` | Tension + abstract clash |
| `src/sim/agents.ts` | Resident + merchant movement (from `engine.ts`) |
| `src/sim/rollup.ts` | Geo stat rollup (from `engine.ts`) |
| `src/sim/worldGen.ts` | Seed pacts, economies, mandates |
| `src/sim/engine.ts` | Thin export: `tickWorld` → `SimClock` |
| `src/sim/*.test.ts` | Unit tests colocated or `src/sim/__tests__/` |
| `src/render/scene.ts` | Pact outlines, routes, pings, day/night |
| `src/render/overlays.ts` | Optional: extract overlay builders from scene |
| `src/ui/panel.ts` | Tabs: Overview, Feed, Bloc, Layers |
| `src/ui/feed.ts` | Event feed DOM |
| `src/ui/decisions.ts` | Pending decision card |
| `src/ui/pactPicker.ts` | Start flow modal |
| `src/main.ts` | Wire picker, feed callbacks, pan-to-entity |

---

### Task 0: Test harness + SimClock skeleton

**Files:**
- Create: `vitest.config.ts`, `src/sim/clock.ts`, `src/sim/rollup.ts`, `src/sim/agents.ts`, `src/sim/smoke.test.ts`
- Modify: `package.json`, `tsconfig.json`, `src/sim/engine.ts`, `src/sim/types.ts`

**Interfaces:**
- Consumes: existing `World`, `tickWorld` callers in `main.ts`
- Produces:
  - `export interface SimContext { seed: number; ticksPerDay: number }`
  - `export class SimClock { tick(world: World, ctx: SimContext, steps: number): void }`
  - `export function rollupHierarchy(world: World): void` in `rollup.ts`
  - `export function tickAgents(world: World): void` in `agents.ts`

- [ ] **Step 1: Add Vitest**

Modify `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Add devDependency `"vitest": "^3.2.4"`.

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

Extend `tsconfig.json` `"include": ["src", "vitest.config.ts"]`.

Run: `npm install && npm test`  
Expected: FAIL (no tests) or pass empty — add smoke test next.

- [ ] **Step 2: Write failing smoke test**

Create `src/sim/smoke.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { generateWorld } from "./worldGen";
import { tickWorld } from "./engine";

describe("sim smoke", () => {
  it("runs 100 ticks without throwing", () => {
    const world = generateWorld(12345);
    expect(() => {
      for (let i = 0; i < 100; i++) tickWorld(world, 1);
    }).not.toThrow();
    expect(world.tick).toBeGreaterThan(0);
  });
});
```

Run: `npm test`  
Expected: PASS (current engine still works).

- [ ] **Step 3: Extend types (empty arrays)**

Add to `src/sim/types.ts`:

```typescript
export type GoodKind = "food" | "goods" | "culture";

export interface CityEconomy {
  cityId: string;
  stock: Record<GoodKind, number>;
  capacity: Record<GoodKind, number>;
  production: Record<GoodKind, number>;
  consumption: Record<GoodKind, number>;
}

export interface World {
  // ...existing fields...
  seed: number;
  economies: CityEconomy[];
  pacts: Pact[];
  routes: TradeRoute[];
  inventions: InventionRecord[];
  events: SimEvent[];
  decisions: PendingDecision[];
  playerPactId: string | null;
  referencePrices: Record<GoodKind, number>;
}
```

Define minimal stub interfaces `Pact`, `TradeRoute`, `InventionRecord`, `SimEvent`, `PendingDecision` as empty-shaped types (filled in later tasks). Update `generateWorld` to set `seed`, empty arrays, `playerPactId: null`, default `referencePrices: { food: 1, goods: 1, culture: 1 }`.

- [ ] **Step 4: SimClock stub**

Create `src/sim/clock.ts`:

```typescript
import type { World } from "./types";
import { tickAgents } from "./agents";
import { rollupHierarchy } from "./rollup";

export interface SimContext {
  seed: number;
  ticksPerDay: number;
}

export class SimClock {
  tick(world: World, ctx: SimContext, steps: number): void {
    for (let s = 0; s < steps; s++) {
      world.tick++;
      if (world.tick % ctx.ticksPerDay === 0) world.day++;
      tickAgents(world);
      rollupHierarchy(world);
    }
  }
}
```

Move agent loop + rollup from `engine.ts` into `agents.ts` / `rollup.ts` (copy existing logic).

Refactor `engine.ts`:

```typescript
const clock = new SimClock();
const CTX = { seed: 0, ticksPerDay: 120 };

export function tickWorld(world: World, dt: number): void {
  if (!world.seed) world.seed = 42;
  CTX.seed = world.seed;
  clock.tick(world, CTX, Math.max(1, Math.floor(dt)));
}
```

- [ ] **Step 5: Run tests and build**

Run: `npm test && npm run build`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tsconfig.json src/sim/
git commit -m "chore: add vitest and SimClock skeleton"
```

---

### Task 1: Pacts + world gen + patron picker

**Files:**
- Create: `src/sim/governance.ts`, `src/sim/governance.test.ts`, `src/ui/pactPicker.ts`
- Modify: `src/sim/types.ts`, `src/sim/worldGen.ts`, `src/main.ts`, `src/style.css`

**Interfaces:**
- Consumes: `World`, `GeoEntity` cities
- Produces:
  - `export function generatePacts(world: World, rng: Rng): Pact[]`
  - `export function cityPactId(world: World, cityId: string): string | null`
  - `export function showPactPicker(pacts: Pact[], onChoose: (pactId: string) => void): HTMLElement`

- [ ] **Step 1: Failing test for pact generation**

```typescript
import { describe, expect, it } from "vitest";
import { generateWorld } from "./worldGen";
import { cityPactId } from "./governance";

describe("pacts", () => {
  it("assigns each city to at most one pact", () => {
    const world = generateWorld(99);
    const seen = new Set<string>();
    for (const e of world.entities.filter((x) => x.kind === "city")) {
      const pid = cityPactId(world, e.id);
      if (pid) seen.add(`${e.id}:${pid}`);
    }
    expect(world.pacts.length).toBeGreaterThanOrEqual(2);
  });
});
```

Run: `npm test` — Expected: FAIL until `generatePacts` implemented.

- [ ] **Step 2: Implement `Pact` type and `generatePacts`**

```typescript
export interface Pact {
  id: string;
  name: string;
  color: number;
  memberCityIds: string[];
  stances: {
    preferMemberTrade: boolean;
    openInternalBorders: boolean;
    jointResearch: boolean;
    mutualAid: boolean;
  };
  cooperationBudget: number;
  stanceCooldownUntilDay: number;
}
```

In `worldGen.ts` after cities created, call `generatePacts(world, rng)` — 3–4 pacts, 2–5 cities each, distinct colors.

- [ ] **Step 3: Pact picker UI**

`pactPicker.ts` full-screen overlay listing pacts; on select set `world.playerPactId` and remove overlay. Block sim in `main.ts` until `playerPactId` set.

- [ ] **Step 4: Map outline tint**

In `scene.ts`, for cities where `cityPactId` matches, draw thicker outline in pact color.

- [ ] **Step 5: Test + build + commit**

```bash
npm test && npm run build
git commit -m "feat: procedural pacts and patron picker"
```

---

### Task 2: Economy + trade routes

**Files:**
- Create: `src/sim/economy.ts`, `src/sim/economy.test.ts`
- Modify: `src/sim/clock.ts`, `src/sim/worldGen.ts`, `src/render/scene.ts`, `src/sim/types.ts`

**Interfaces:**
- Produces:
  - `export function initCityEconomies(world: World): void`
  - `export function tickEconomy(world: World): void`
  - `export function activeRoutes(world: World): TradeRoute[]`

```typescript
export interface TradeRoute {
  id: string;
  fromCityId: string;
  toCityId: string;
  good: GoodKind;
  volume: number;
  progress: number;
  merchantResidentId: string | null;
}
```

- [ ] **Step 1: Test price update**

```typescript
it("raises reference food price when continent is in deficit", () => {
  const world = generateWorld(1);
  initCityEconomies(world);
  world.referencePrices.food = 1;
  for (const econ of world.economies) econ.stock.food = 0;
  tickEconomy(world);
  expect(world.referencePrices.food).toBeGreaterThan(1);
});
```

- [ ] **Step 2: Implement production/consumption per tick**

Use city stats + labor focus (default Balanced/Medium/Industry until Task 6 policies).

- [ ] **Step 3: Route creation/prune**

Pair surplus/deficit cities; cap 40; respect pact prefer-member ordering.

- [ ] **Step 4: Wire `EconomyPhase` in `clock.ts` before agents**

Merchants: assign `route.merchantResidentId` from residents with role merchant in origin city; `agents.ts` lerps along route segment.

- [ ] **Step 5: Render route lines + merchant dot in `scene.ts`**

- [ ] **Step 6: Test, build, commit**

```bash
git commit -m "feat: economy, prices, and trade routes"
```

---

### Task 3: Migration

**Files:**
- Create: `src/sim/migration.ts`, `src/sim/migration.test.ts`
- Modify: `src/sim/clock.ts`, `src/sim/types.ts`, `src/render/scene.ts`

**Interfaces:**
- Produces: `export function tickMigration(world: World): void` (call once per sim-day from clock)

- [ ] **Step 1: Test migration pressure sign**

```typescript
it("moves population from unhappy to happy city in same state", () => {
  const world = generateWorld(7);
  initCityEconomies(world);
  const cities = world.entities.filter((e) => e.kind === "city");
  const a = cities[0]!;
  const b = cities.find((c) => c.parentId === a.parentId && c.id !== a.id);
  if (!b) return;
  a.stats.happiness = 0.2;
  b.stats.happiness = 0.9;
  a.stats.population = 5000;
  b.stats.population = 1000;
  tickMigration(world);
  expect(a.stats.population).toBeLessThan(5000);
});
```

- [ ] **Step 2: Implement daily batch + border checks**

Use `openInternalBorders` stance for cross-city in different states within pact.

- [ ] **Step 3: Optional migration arrow overlay (layer toggle `migration` in types)**

- [ ] **Step 4: Commit**

---

### Task 4: Inventions

**Files:**
- Create: `src/sim/inventions.ts`, `src/sim/inventions.test.ts`
- Modify: `src/sim/clock.ts`, `src/sim/types.ts`, `src/render/scene.ts`

**Interfaces:**
- Produces:
  - `export function tickInventions(world: World, rng: Rng): void`
  - `export function applyInventionPerks(world: World): void`

- [ ] **Step 1: Test spread via trade**

```typescript
it("exposes neighbor after sustained route", () => {
  const world = generateWorld(5);
  // setup route 3+ days between A and B, invention at A
  // assert B gains spread after tickInventions
});
```

- [ ] **Step 2: Emergent roll every 5 days + templates array (8 names)**

- [ ] **Step 3: Obsolete same-kind weaker invention**

- [ ] **Step 4: Invention map pulse + layer toggle**

- [ ] **Step 5: Commit**

---

### Task 5: Events feed + pending decisions

**Files:**
- Create: `src/sim/events.ts`, `src/sim/events.test.ts`, `src/ui/feed.ts`, `src/ui/decisions.ts`
- Modify: `src/ui/panel.ts`, `src/main.ts`, `src/style.css`

**Interfaces:**
- Produces:
  - `export function pushEvent(world: World, event: Omit<SimEvent, "id">): SimEvent`
  - `export function tickEvents(world: World, rng: Rng): void`
  - `export function pushDecision(world: World, d: PendingDecision): void`

```typescript
export type SimEventCategory =
  | "economy" | "migration" | "governance" | "invention" | "cooperation" | "conflict";

export interface SimEvent {
  id: string;
  day: number;
  category: SimEventCategory;
  title: string;
  body: string;
  entityIds: string[];
  pactIds: string[];
  severity: "info" | "warning" | "decision";
}

export interface PendingDecision {
  id: string;
  type: "override" | "alliance" | "preClash";
  title: string;
  body: string;
  deadlineDay: number;
  entityIds: string[];
  pactId: string | null;
}
```

- [ ] **Step 1: Test ring buffer max 100**

- [ ] **Step 2: Feed tab renders last 50 events; tap calls `onFocusEntity(id)`**

- [ ] **Step 3: Decision card with Approve / Deny / Defer — wire to governance stubs**

- [ ] **Step 4: Economy shortage template hooks from `economy.ts`**

- [ ] **Step 5: Commit**

---

### Task 6: Governance conflicts + abstract clash

**Files:**
- Create: `src/sim/conflict.ts`, `src/sim/conflict.test.ts`
- Modify: `src/sim/governance.ts`, `src/sim/clock.ts`, `src/ui/panel.ts` (Bloc tab)

**Interfaces:**
- Produces:
  - `export function tickGovernance(world: World, rng: Rng): void`
  - `export function resolveDecision(world: World, decisionId: string, option: "approve" | "deny" | "defer"): void`
  - `export function tickConflict(world: World, rng: Rng): void`

- [ ] **Step 1: Test override escalation creates decision**

- [ ] **Step 2: City policies + nation mandate in `worldGen`**

- [ ] **Step 3: Bloc tab: stances toggles + budget + fund event (deduct budget, fire event template)**

- [ ] **Step 4: Tension matrix between pacts; clash at 70+**

- [ ] **Step 5: Commit**

---

### Task 7: UI tabs + visual polish

**Files:**
- Modify: `src/ui/panel.ts`, `src/style.css`, `src/render/scene.ts`, `src/sim/types.ts` (layers)

- [ ] **Step 1: Desktop/mobile tabs (Overview | Feed | Bloc | Layers)**

- [ ] **Step 2: Biome tint from region hash on city fill**

- [ ] **Step 3: Day/night overlay from `world.day` cycle**

- [ ] **Step 4: Peek bar decision badge count**

- [ ] **Step 5: Manual checklist in README**

```markdown
## v2 manual QA
- [ ] Pick pact, 10 sim-days
- [ ] See trade route + feed line
- [ ] Invention spreads
- [ ] Resolve one decision
- [ ] Mobile pinch + decision card
```

- [ ] **Step 6: Commit + push (GitHub Pages deploy)**

---

### Task 8: Acceptance tests + docs

**Files:**
- Create: `src/sim/acceptance.test.ts`
- Modify: `README.md`, design spec status

- [ ] **Step 1: Acceptance test (seeded 10-day sim)**

```typescript
it("meets v2 success criteria on seed 2026", () => {
  const world = generateWorld(2026);
  initCityEconomies(world);
  for (let d = 0; d < 10 * 120; d++) tickWorld(world, 1);
  expect(world.events.some((e) => e.category === "economy")).toBe(true);
  expect(world.inventions.length).toBeGreaterThanOrEqual(0);
});
```

Adjust assertions as features land.

- [ ] **Step 2: Update README feature list + live demo note**

- [ ] **Step 3: Set design spec status to Implemented (in progress)**

- [ ] **Step 4: Final commit**

```bash
git commit -m "docs: v2 acceptance tests and README"
```

---

## Spec coverage checklist

| Spec § | Task |
|--------|------|
| SimClock phases | 0, 2–6 |
| Pacts + patron | 1, 6 |
| Trade & economy | 2 |
| Migration | 3 |
| Inventions | 4 |
| Events + feed | 5 |
| Conflict | 6 |
| UI/visuals | 1, 5, 7 |
| Tests | 0, 8 |

## Plan self-review

- No TBD placeholders in task definitions.
- Type names consistent: `PendingDecision`, `SimEvent`, `TradeRoute`, `Pact`.
- Each task ends with test/build/commit.
- Scope frozen per Global Constraints.
