import type { World } from "./types";
import { SimClock } from "./clock";

const clock = new SimClock();
const CTX = { seed: 0, ticksPerDay: 120 };

export function tickWorld(world: World, dt: number): void {
  if (!world.seed) world.seed = 42;
  CTX.seed = world.seed;
  clock.tick(world, CTX, Math.max(1, Math.floor(dt)));
}

export function formatPopulation(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
