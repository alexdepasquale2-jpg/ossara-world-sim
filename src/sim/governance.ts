import { Rng } from "./rng";
import type { Pact, World } from "./types";

const PACT_COLORS = [
  0x4a90d9,
  0xd94a4a,
  0x4ad97a,
  0xd9a84a,
  0x9b4ad9,
  0x4ad9d9,
];

const PACT_PREFIX = [
  "Iron",
  "Silver",
  "Golden",
  "Crimson",
  "Azure",
  "Verdant",
  "Obsidian",
  "Solar",
];

const PACT_SUFFIX = ["Covenant", "Compact", "League", "Concord", "Axis", "Pact"];

function defaultStances(): Pact["stances"] {
  return {
    preferMemberTrade: true,
    openInternalBorders: true,
    jointResearch: false,
    mutualAid: false,
  };
}

export function generatePacts(world: World, rng: Rng): Pact[] {
  const cityIds = world.entities
    .filter((e) => e.kind === "city")
    .map((e) => e.id);
  if (cityIds.length === 0) return [];

  const pactCount = Math.min(rng.int(3, 4), Math.floor(cityIds.length / 2));
  const count = Math.max(2, pactCount);

  const shuffled = rng.shuffle(cityIds);
  const colorPool = rng.shuffle([...PACT_COLORS]);
  const pacts: Pact[] = [];
  let cursor = 0;

  for (let p = 0; p < count; p++) {
    const remaining = shuffled.length - cursor;
    const pactsLeft = count - p;
    if (remaining < 2) break;

    const maxForThis = Math.min(5, remaining - (pactsLeft - 1) * 2);
    const minForThis = 2;
    const size =
      p === count - 1
        ? Math.min(5, remaining)
        : rng.int(minForThis, Math.max(minForThis, maxForThis));

    const memberCityIds = shuffled.slice(cursor, cursor + size);
    cursor += memberCityIds.length;

    const name = `${rng.pick(PACT_PREFIX)} ${rng.pick(PACT_SUFFIX)}`;
    pacts.push({
      id: `pact-${p}`,
      name,
      color: colorPool[p % colorPool.length]!,
      memberCityIds,
      stances: defaultStances(),
      cooperationBudget: rng.int(40, 120),
      stanceCooldownUntilDay: 0,
    });
  }

  return pacts;
}

export function cityPactId(world: World, cityId: string): string | null {
  for (const pact of world.pacts) {
    if (pact.memberCityIds.includes(cityId)) return pact.id;
  }
  return null;
}

export function pactById(world: World, pactId: string): Pact | undefined {
  return world.pacts.find((p) => p.id === pactId);
}
