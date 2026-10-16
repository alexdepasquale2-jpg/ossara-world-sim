import { maxTensionForPlayerPact, pactById } from "./governance";
import type { GoodKind, World } from "./types";
import { pct } from "./engine";

export interface WorldSignals {
  day: number;
  population: number;
  happiness: number;
  economy: number;
  artIndex: number;
  tension: number;
  routeCount: number;
  inventionCount: number;
  decisionCount: number;
  foodStress: number;
  playerPactName: string;
  playerPactColor: string;
  prices: Record<GoodKind, number>;
  priceTrend: Record<GoodKind, "up" | "down" | "flat">;
}

let lastPrices: Record<GoodKind, number> | null = null;

export function computeWorldSignals(world: World): WorldSignals {
  const c = world.continent.stats;
  const playerPact = world.playerPactId
    ? pactById(world, world.playerPactId)
    : undefined;

  let foodStress = 0;
  let cities = 0;
  for (const econ of world.economies) {
    cities++;
    const ratio = econ.stock.food / Math.max(1, econ.capacity.food);
    if (ratio < 0.35) foodStress++;
  }
  foodStress = cities > 0 ? foodStress / cities : 0;

  const trend = (good: GoodKind): "up" | "down" | "flat" => {
    if (!lastPrices) return "flat";
    const d = world.referencePrices[good] - lastPrices[good];
    if (d > 0.02) return "up";
    if (d < -0.02) return "down";
    return "flat";
  };

  const signals: WorldSignals = {
    day: world.day,
    population: c.population,
    happiness: c.happiness,
    economy: c.economy,
    artIndex: c.artIndex,
    tension: world.playerPactId
      ? maxTensionForPlayerPact(world, world.playerPactId)
      : 0,
    routeCount: world.routes.length,
    inventionCount: world.inventions.filter((i) => !i.obsolete).length,
    decisionCount: world.decisions.length,
    foodStress,
    playerPactName: playerPact?.name ?? "Unaligned",
    playerPactColor: playerPact
      ? `#${playerPact.color.toString(16).padStart(6, "0")}`
      : "#6ee7b7",
    prices: { ...world.referencePrices },
    priceTrend: {
      food: trend("food"),
      goods: trend("goods"),
      culture: trend("culture"),
    },
  };

  lastPrices = { ...world.referencePrices };
  return signals;
}

export function citySupplyRatio(
  world: World,
  cityId: string,
  good: GoodKind,
): number {
  const econ = world.economies.find((e) => e.cityId === cityId);
  if (!econ) return 0.5;
  return Math.min(1, econ.stock[good] / Math.max(1, econ.capacity[good]));
}

export function formatPct(v: number): string {
  return pct(v);
}
