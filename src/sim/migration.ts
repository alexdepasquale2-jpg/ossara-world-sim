import { cityPactId, pactById } from "./governance";
import { entityById } from "./worldGen";
import type { GeoEntity, World } from "./types";

export interface MigrationFlow {
  fromCityId: string;
  toCityId: string;
  amount: number;
}

const MIN_HAPPINESS_GRADIENT = 0.08;
const MIN_OUTFLOW_RATE = 0.001;
const MAX_OUTFLOW_RATE = 0.005;
const MAX_DAILY_OUTFLOW_FRACTION = 0.005;

let recentFlows: MigrationFlow[] = [];

export function activeMigrationFlows(): MigrationFlow[] {
  return recentFlows;
}

function regionId(world: World, city: GeoEntity): string | null {
  const state = city.parentId ? entityById(world, city.parentId) : undefined;
  return state?.parentId ?? null;
}

export function canMigrateBetween(
  world: World,
  from: GeoEntity,
  to: GeoEntity,
): boolean {
  if (from.kind !== "city" || to.kind !== "city") return false;
  if (from.id === to.id) return false;
  if (from.parentId === to.parentId) return true;

  const fromRegion = regionId(world, from);
  const toRegion = regionId(world, to);
  if (!fromRegion || fromRegion !== toRegion) return false;

  const pactA = cityPactId(world, from.id);
  const pactB = cityPactId(world, to.id);
  if (!pactA || pactA !== pactB) return false;
  const pact = pactById(world, pactA);
  return pact?.stances.openInternalBorders === true;
}

function migrationRate(happinessDelta: number): number {
  const rate =
    MIN_OUTFLOW_RATE +
    Math.min(
      MAX_OUTFLOW_RATE - MIN_OUTFLOW_RATE,
      happinessDelta * 0.006,
    );
  return Math.min(MAX_OUTFLOW_RATE, rate);
}

export function tickMigration(world: World): void {
  const cities = world.entities.filter((e) => e.kind === "city");
  const flows: MigrationFlow[] = [];

  for (const from of cities) {
    const startPop = from.stats.population;
    if (startPop < 50) continue;

    const maxOut = startPop * MAX_DAILY_OUTFLOW_FRACTION;
    let moved = 0;

    const destinations = cities
      .filter((to) => to.id !== from.id)
      .map((to) => ({
        to,
        delta: to.stats.happiness - from.stats.happiness,
      }))
      .filter(
        (d) =>
          d.delta >= MIN_HAPPINESS_GRADIENT &&
          canMigrateBetween(world, from, d.to),
      )
      .sort((a, b) => b.delta - a.delta);

    for (const { to, delta } of destinations) {
      if (moved >= maxOut) break;
      const remaining = from.stats.population;
      if (remaining < 50) break;

      const rate = migrationRate(delta);
      let amount = Math.floor(remaining * rate);
      amount = Math.min(amount, Math.floor(maxOut - moved));
      if (amount < 1) continue;

      from.stats.population -= amount;
      to.stats.population += amount;
      moved += amount;
      flows.push({ fromCityId: from.id, toCityId: to.id, amount });
    }
  }

  recentFlows = flows.sort((a, b) => b.amount - a.amount).slice(0, 3);
}
