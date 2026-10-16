import { cityPactId, pactById } from "./governance";
import { Rng } from "./rng";
import type {
  GoodKind,
  InventionKind,
  InventionPerks,
  InventionRecord,
  World,
} from "./types";
import { entityById } from "./worldGen";
import { pushEvent } from "./events";

export const INVENTION_NAME_TEMPLATES = [
  "Canal Registry",
  "Shared Ledger",
  "Harvest Calendar",
  "Guild Charter",
  "River Gauge",
  "Market Beacon",
  "Civic Forum",
  "Archive Index",
] as const;

const KINDS: InventionKind[] = ["production", "trade", "culture", "governance"];

let inventionSeq = 0;

function defaultPerks(kind: InventionKind, power: number): InventionPerks {
  const bump = 1 + power * 0.08;
  return {
    productionMult: kind === "production" ? bump : 1,
    tradeMult: kind === "trade" ? bump : 1,
    cultureMult: kind === "culture" ? bump : 1,
    governanceMult: kind === "governance" ? bump : 1,
  };
}

export function cityKnowsInvention(
  inv: InventionRecord,
  cityId: string,
): boolean {
  return (
    inv.originCityId === cityId || inv.spreadCityIds.includes(cityId)
  );
}

export function activeInventionsForCity(
  world: World,
  cityId: string,
): InventionRecord[] {
  return world.inventions.filter(
    (inv) => !inv.obsolete && cityKnowsInvention(inv, cityId),
  );
}

export function inventionMultipliersForCity(
  world: World,
  cityId: string,
): Record<GoodKind, number> {
  const mult = { food: 1, goods: 1, culture: 1 };
  for (const inv of activeInventionsForCity(world, cityId)) {
    mult.food *= inv.perks.productionMult;
    mult.goods *= inv.perks.tradeMult;
    mult.culture *= inv.perks.cultureMult;
  }
  return mult;
}

function obsoleteWeakerSameKind(world: World, newInv: InventionRecord): void {
  for (const inv of world.inventions) {
    if (inv.id === newInv.id || inv.obsolete || inv.kind !== newInv.kind) {
      continue;
    }
    if (inv.power < newInv.power) {
      inv.obsolete = true;
      pushEvent(world, {
        day: world.day,
        category: "invention",
        title: `${inv.name} superseded`,
        body: `${newInv.name} replaces an older ${inv.kind} breakthrough.`,
        entityIds: [inv.originCityId, newInv.originCityId],
        pactIds: [],
        severity: "info",
      });
    } else if (inv.power > newInv.power) {
      newInv.obsolete = true;
      return;
    }
  }
}

export function discoverInvention(
  world: World,
  rng: Rng,
  originCityId: string,
  kind?: InventionKind,
): InventionRecord {
  const pickedKind = kind ?? rng.pick(KINDS);
  const power = rng.range(0.35, 1);
  const name = rng.pick([...INVENTION_NAME_TEMPLATES]);
  const inv: InventionRecord = {
    id: `inv-${inventionSeq++}`,
    name,
    kind: pickedKind,
    originCityId,
    discoveredDay: world.day,
    spreadLevel: 0,
    spreadCityIds: [],
    perks: defaultPerks(pickedKind, power),
    power,
    obsolete: false,
  };
  world.inventions.push(inv);
  obsoleteWeakerSameKind(world, inv);
  if (!inv.obsolete) {
    pushEvent(world, {
      day: world.day,
      category: "invention",
      title: `Breakthrough: ${name}`,
      body: `Researchers in ${entityById(world, originCityId)?.name ?? "a member city"} shared a new ${pickedKind} method.`,
      entityIds: [originCityId],
      pactIds: [],
      severity: "info",
    });
  }
  return inv;
}

function cityEligibleForEmergent(world: World, cityId: string): boolean {
  const city = entityById(world, cityId);
  if (!city || city.kind !== "city") return false;
  return (
    city.stats.economy >= 0.42 &&
    city.stats.artIndex >= 0.18 &&
    city.stats.population >= 1200
  );
}

function rollEmergent(world: World, rng: Rng): void {
  const cities = world.entities.filter((e) => e.kind === "city");
  for (const city of cities) {
    if (!cityEligibleForEmergent(world, city.id)) continue;
    if (rng.next() > 0.22) continue;
    discoverInvention(world, rng, city.id);
  }
}

function spreadAlongTrade(world: World, _rng: Rng): void {
  for (const route of world.routes) {
    route.daysActive += 1;
    if (route.daysActive < 3) continue;

    const fromInvs = world.inventions.filter(
      (inv) => !inv.obsolete && inv.originCityId === route.fromCityId,
    );
    for (const inv of fromInvs) {
      if (inv.spreadCityIds.includes(route.toCityId)) continue;
      inv.spreadCityIds.push(route.toCityId);
      if (inv.spreadLevel < 1) inv.spreadLevel = 1;
    }

    const toInvs = world.inventions.filter(
      (inv) => !inv.obsolete && inv.originCityId === route.toCityId,
    );
    for (const inv of toInvs) {
      if (inv.spreadCityIds.includes(route.fromCityId)) continue;
      inv.spreadCityIds.push(route.fromCityId);
      if (inv.spreadLevel < 1) inv.spreadLevel = 1;
    }
  }
}

function spreadViaJointResearch(world: World): void {
  for (const inv of world.inventions) {
    if (inv.obsolete || inv.spreadLevel >= 2) continue;
    const originPact = cityPactId(world, inv.originCityId);
    if (!originPact) continue;
    const pact = pactById(world, originPact);
    if (!pact?.stances.jointResearch) continue;

    for (const cityId of pact.memberCityIds) {
      if (cityId === inv.originCityId) continue;
      if (!inv.spreadCityIds.includes(cityId)) {
        inv.spreadCityIds.push(cityId);
      }
    }
    inv.spreadLevel = 2;
  }
}

function spreadContinentRare(world: World, rng: Rng): void {
  for (const inv of world.inventions) {
    if (inv.obsolete || inv.spreadLevel >= 3) continue;
    if (inv.spreadLevel < 2 || rng.next() > 0.04) continue;
    const cities = world.entities.filter((e) => e.kind === "city");
    for (const city of cities) {
      if (!inv.spreadCityIds.includes(city.id)) {
        inv.spreadCityIds.push(city.id);
      }
    }
    inv.spreadLevel = 3;
    pushEvent(world, {
      day: world.day,
      category: "invention",
      title: `${inv.name} widely known`,
      body: "Scholars across the continent adopted the method.",
      entityIds: [inv.originCityId],
      pactIds: [],
      severity: "info",
    });
  }
}

export function applyInventionPerks(world: World): void {
  for (const econ of world.economies) {
    const mult = inventionMultipliersForCity(world, econ.cityId);
    for (const good of ["food", "goods", "culture"] as const) {
      econ.production[good] *= mult[good];
    }
  }
}

export function tickInventions(world: World, rng: Rng): void {
  spreadAlongTrade(world, rng);
  spreadViaJointResearch(world);
  spreadContinentRare(world, rng);

  if (world.day % 5 === 0) {
    rollEmergent(world, rng);
  }
}

export function simRng(world: World, salt = 0): Rng {
  return new Rng((world.seed + world.day * 997 + salt) >>> 0);
}
