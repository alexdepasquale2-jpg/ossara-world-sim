import { cityPactId } from "./governance";
import { inventionMultipliersForCity } from "./inventions";
import { maybePushShortageEvent } from "./events";
import { entityById } from "./worldGen";
import type { CityEconomy, GeoEntity, GoodKind, TradeRoute, World } from "./types";

const GOODS: GoodKind[] = ["food", "goods", "culture"];
const MAX_ROUTES = 40;
const ROUTE_TRAVEL_PER_TICK = 0.012;
const SURPLUS_RATIO = 0.62;
const DEFICIT_RATIO = 0.38;

let routeSeq = 0;

function goodRecord(
  food: number,
  goods: number,
  culture: number,
): Record<GoodKind, number> {
  return { food, goods, culture };
}

function cityForEconomy(world: World, econ: CityEconomy): GeoEntity | undefined {
  return entityById(world, econ.cityId);
}

function computeFlows(world: World, econ: CityEconomy): void {
  const city = cityForEconomy(world, econ);
  if (!city) return;

  const pop = city.stats.population;
  const econStat = city.stats.economy;
  const art = city.stats.artIndex;
  const scale = pop / 2500;

  const policy = world.cityPolicies.find((p) => p.cityId === econ.cityId);
  let prodFood = scale * econStat * 0.55;
  let prodGoods = scale * econStat * 0.48;
  let prodCulture = scale * art * 0.35 + 0.08;
  switch (policy?.laborFocus) {
    case "industry":
      prodGoods *= 1.18;
      prodCulture *= 0.92;
      break;
    case "arts":
      prodCulture *= 1.22;
      prodFood *= 0.95;
      break;
    case "services":
      prodFood *= 1.08;
      prodGoods *= 1.05;
      break;
    default:
      break;
  }
  econ.production = goodRecord(prodFood, prodGoods, prodCulture);
  econ.consumption = goodRecord(
    scale * 0.42,
    scale * 0.32,
    scale * 0.12 + art * 0.05,
  );
}

function clampStock(econ: CityEconomy): void {
  for (const good of GOODS) {
    econ.stock[good] = Math.max(
      0,
      Math.min(econ.capacity[good], econ.stock[good]),
    );
  }
}

function adjustReferencePrices(world: World): void {
  for (const good of GOODS) {
    let totalStock = 0;
    let totalNeed = 0;
    for (const econ of world.economies) {
      totalStock += econ.stock[good];
      totalNeed += econ.capacity[good] * 0.45;
    }
    const price = world.referencePrices[good];
    if (totalNeed > 0 && totalStock < totalNeed * 0.3) {
      world.referencePrices[good] = price * 1.04;
    } else if (totalNeed > 0 && totalStock > totalNeed * 1.4) {
      world.referencePrices[good] = price * 0.985;
    }
    world.referencePrices[good] = Math.max(0.4, Math.min(6, world.referencePrices[good]));
  }
}

function pactTradeBoost(world: World, fromCityId: string, toCityId: string): number {
  const pactId = cityPactId(world, fromCityId);
  if (!pactId || pactId !== cityPactId(world, toCityId)) return 1;
  const pact = world.pacts.find((p) => p.id === pactId);
  if (!pact?.stances.preferMemberTrade) return 1;
  return 2.5;
}

interface RouteCandidate {
  fromCityId: string;
  toCityId: string;
  good: GoodKind;
  volume: number;
  score: number;
}

function routeKey(from: string, to: string, good: GoodKind): string {
  return `${from}->${to}:${good}`;
}

function buildRouteCandidates(world: World): RouteCandidate[] {
  const existing = new Set(
    world.routes.map((r) => routeKey(r.fromCityId, r.toCityId, r.good)),
  );
  const out: RouteCandidate[] = [];

  for (const good of GOODS) {
    const surplus = world.economies.filter(
      (e) => e.stock[good] > e.capacity[good] * SURPLUS_RATIO,
    );
    const deficit = world.economies.filter(
      (e) => e.stock[good] < e.capacity[good] * DEFICIT_RATIO,
    );

    for (const from of surplus) {
      for (const to of deficit) {
        if (from.cityId === to.cityId) continue;
        const key = routeKey(from.cityId, to.cityId, good);
        if (existing.has(key)) continue;

        const spare = from.stock[good] - from.capacity[good] * SURPLUS_RATIO;
        const need = to.capacity[good] * DEFICIT_RATIO - to.stock[good];
        const volume = Math.min(18, Math.max(2, Math.min(spare, need)));
        if (volume <= 0.5) continue;

        const score =
          volume * pactTradeBoost(world, from.cityId, to.cityId);
        out.push({
          fromCityId: from.cityId,
          toCityId: to.cityId,
          good,
          volume,
          score,
        });
      }
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}

function createRoutes(world: World): void {
  const slots = MAX_ROUTES - world.routes.length;
  if (slots <= 0) return;

  const candidates = buildRouteCandidates(world);
  for (const c of candidates.slice(0, slots)) {
    world.routes.push({
      id: `route-${routeSeq++}`,
      fromCityId: c.fromCityId,
      toCityId: c.toCityId,
      good: c.good,
      volume: c.volume,
      progress: 0,
      merchantResidentId: null,
      daysActive: 0,
    });
    const fromEcon = world.economies.find((e) => e.cityId === c.fromCityId);
    if (fromEcon) {
      fromEcon.stock[c.good] = Math.max(0, fromEcon.stock[c.good] - c.volume * 0.25);
    }
  }
}

function completeRoute(world: World, route: TradeRoute): void {
  const toEcon = world.economies.find((e) => e.cityId === route.toCityId);
  const fromEcon = world.economies.find((e) => e.cityId === route.fromCityId);
  if (fromEcon) {
    fromEcon.stock[route.good] = Math.max(0, fromEcon.stock[route.good] - route.volume);
  }
  if (toEcon) {
    toEcon.stock[route.good] = Math.min(
      toEcon.capacity[route.good],
      toEcon.stock[route.good] + route.volume,
    );
  }
}

function advanceRoutes(world: World): void {
  const finished: TradeRoute[] = [];
  for (const route of world.routes) {
    route.progress += ROUTE_TRAVEL_PER_TICK;
    if (route.progress >= 1) {
      route.progress = 1;
      completeRoute(world, route);
      finished.push(route);
    }
  }
  if (finished.length > 0) {
    const doneIds = new Set(finished.map((r) => r.id));
    world.routes = world.routes.filter((r) => !doneIds.has(r.id));
  }
}

function assignMerchants(world: World): void {
  const busy = new Set(
    world.routes
      .map((r) => r.merchantResidentId)
      .filter((id): id is string => id !== null),
  );

  for (const route of world.routes) {
    if (route.merchantResidentId) continue;
    const merchant = world.residents.find(
      (r) =>
        r.cityId === route.fromCityId &&
        r.role === "merchant" &&
        !busy.has(r.id),
    );
    if (!merchant) continue;
    route.merchantResidentId = merchant.id;
    busy.add(merchant.id);
  }
}

export function initCityEconomies(world: World): void {
  const cities = world.entities.filter((e) => e.kind === "city");
  world.economies = cities.map((city) => {
    const scale = Math.max(0.6, city.stats.population / 2200);
    const econ = city.stats.economy;
    const art = city.stats.artIndex;
    return {
      cityId: city.id,
      stock: goodRecord(
        35 * scale * econ,
        22 * scale * econ,
        10 * scale * (0.4 + art),
      ),
      capacity: goodRecord(110 * scale, 85 * scale, 45 * scale),
      production: goodRecord(0, 0, 0),
      consumption: goodRecord(0, 0, 0),
    };
  });
}

export function activeRoutes(world: World): TradeRoute[] {
  return world.routes;
}

export function tickEconomy(world: World): void {
  if (world.economies.length === 0) return;

  for (const econ of world.economies) {
    computeFlows(world, econ);
    const invMult = inventionMultipliersForCity(world, econ.cityId);
    for (const good of GOODS) {
      econ.production[good] *= invMult[good];
      econ.stock[good] += econ.production[good] - econ.consumption[good];
    }
    clampStock(econ);
    maybePushShortageEvent(world, econ.cityId);
  }

  adjustReferencePrices(world);
  advanceRoutes(world);
  createRoutes(world);
  assignMerchants(world);
}

export function cityCenter(city: GeoEntity): { x: number; y: number } {
  return {
    x: city.bounds.x + city.bounds.w / 2,
    y: city.bounds.y + city.bounds.h / 2,
  };
}

export function positionAlongRoute(
  world: World,
  route: TradeRoute,
  t: number,
): { x: number; y: number } | null {
  const from = entityById(world, route.fromCityId);
  const to = entityById(world, route.toCityId);
  if (!from || !to) return null;
  const a = cityCenter(from);
  const b = cityCenter(to);
  const p = Math.max(0, Math.min(1, t));
  return {
    x: a.x + (b.x - a.x) * p,
    y: a.y + (b.y - a.y) * p,
  };
}
