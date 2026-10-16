import { pushDecision, pushEvent } from "./events";
import { Rng } from "./rng";
import type {
  CityPolicy,
  GeoEntity,
  LaborFocus,
  NationMandate,
  Pact,
  TradeOpenness,
  World,
} from "./types";
import { entityById } from "./worldGen";

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

const OPENNESS: TradeOpenness[] = ["closed", "balanced", "open"];
const LABOR: LaborFocus[] = ["industry", "services", "arts"];

export function initGovernanceData(world: World, rng: Rng): void {
  const nations = world.entities.filter((e) => e.kind === "nation");
  world.nationMandates = nations.map((n) => ({
    nationId: n.id,
    tradeOpenness: rng.pick(OPENNESS),
    cultureInvestment: rng.pick(["low", "medium", "high"] as const),
    laborFocus: rng.pick(LABOR),
  }));

  const cities = world.entities.filter((e) => e.kind === "city");
  world.cityPolicies = cities.map((city) => {
    const nation = findNationForCity(world, city.id);
    const mandate = world.nationMandates.find((m) => m.nationId === nation?.id);
    const conflict =
      mandate &&
      (rng.next() < 0.35
        ? { tradeOpenness: rng.pick(OPENNESS) }
        : null);
    return {
      cityId: city.id,
      tradeOpenness: conflict?.tradeOpenness ?? mandate?.tradeOpenness ?? "balanced",
      cultureInvestment: mandate?.cultureInvestment ?? "medium",
      laborFocus: mandate?.laborFocus ?? "services",
      mandateConflictDays: conflict ? 1 : 0,
    };
  });
}

function findNationForCity(world: World, cityId: string): GeoEntity | undefined {
  let current = entityById(world, cityId);
  while (current) {
    if (current.kind === "nation") return current;
    if (!current.parentId) break;
    current = entityById(world, current.parentId);
  }
  return undefined;
}

function policyConflictsWithMandate(
  policy: CityPolicy,
  mandate: NationMandate,
): boolean {
  return policy.tradeOpenness !== mandate.tradeOpenness;
}

function tensionKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function getPactTension(
  world: World,
  pactAId: string,
  pactBId: string,
): number {
  const key = tensionKey(pactAId, pactBId);
  const row = world.pactTensions.find(
    (t) => tensionKey(t.pactAId, t.pactBId) === key,
  );
  return row?.value ?? 0;
}

export function adjustPactTension(
  world: World,
  pactAId: string,
  pactBId: string,
  delta: number,
): void {
  const key = tensionKey(pactAId, pactBId);
  let row = world.pactTensions.find(
    (t) => tensionKey(t.pactAId, t.pactBId) === key,
  );
  if (!row) {
    row = { pactAId, pactBId, value: 0 };
    world.pactTensions.push(row);
  }
  row.value = Math.max(0, Math.min(100, row.value + delta));
}

const OVERRIDE_ESCALATION_DAYS = 4;
const STANCE_COOLDOWN_DAYS = 3;

export function tickGovernance(world: World, rng: Rng): void {
  for (const policy of world.cityPolicies) {
    const nation = findNationForCity(world, policy.cityId);
    if (!nation) continue;
    const mandate = world.nationMandates.find((m) => m.nationId === nation.id);
    if (!mandate) continue;

    if (policyConflictsWithMandate(policy, mandate)) {
      policy.mandateConflictDays += 1;
      if (policy.mandateConflictDays >= OVERRIDE_ESCALATION_DAYS) {
        const city = entityById(world, policy.cityId);
        const pactId = cityPactId(world, policy.cityId);
        const decisionId = `override-${policy.cityId}-${world.day}`;
        if (!world.decisions.some((d) => d.id === decisionId)) {
          pushDecision(world, {
            id: decisionId,
            type: "override",
            title: "Override proposal",
            body: `${city?.name ?? "A member city"} asks whether regional trade rules should prevail over local policy.`,
            deadlineDay: world.day + 5,
            entityIds: [policy.cityId],
            pactId,
          });
        }
      }
    } else {
      policy.mandateConflictDays = 0;
    }
  }

  if (world.day % 7 === 0 && world.pacts.length >= 2) {
    const a = rng.pick(world.pacts);
    const b = rng.pick(world.pacts.filter((p) => p.id !== a.id));
    if (b) adjustPactTension(world, a.id, b.id, rng.range(2, 8));
  }
}

export function resolveDecision(
  world: World,
  decisionId: string,
  option: "approve" | "deny" | "defer",
): void {
  const idx = world.decisions.findIndex((d) => d.id === decisionId);
  if (idx < 0) return;
  const decision = world.decisions[idx]!;
  world.decisions.splice(idx, 1);

  const cityId = decision.entityIds[0];
  const policy = world.cityPolicies.find((p) => p.cityId === cityId);
  const nation = cityId ? findNationForCity(world, cityId) : undefined;
  const mandate = world.nationMandates.find((m) => m.nationId === nation?.id);

  if (decision.type === "override" && policy && mandate) {
    if (option === "approve") {
      policy.tradeOpenness = mandate.tradeOpenness;
      policy.mandateConflictDays = 0;
    } else if (option === "deny") {
      const pactId = cityPactId(world, policy.cityId);
      if (pactId) {
        for (const other of world.pacts) {
          if (other.id !== pactId) adjustPactTension(world, pactId, other.id, 4);
        }
      }
    } else {
      policy.tradeOpenness = mandate.tradeOpenness;
    }
  }

  if (decision.type === "preClash" && decision.pactId) {
    const enemy = world.pacts.find((p) => p.id !== decision.pactId);
    if (enemy) {
      if (option === "approve") {
        adjustPactTension(world, decision.pactId, enemy.id, 12);
      } else {
        adjustPactTension(world, decision.pactId, enemy.id, -10);
      }
    }
  }

  pushEvent(world, {
    day: world.day,
    category: "governance",
    title: `Decision ${option}`,
    body: decision.title,
    entityIds: decision.entityIds,
    pactIds: decision.pactId ? [decision.pactId] : [],
    severity: "info",
  });
}

export function togglePactStance(
  world: World,
  pactId: string,
  key: keyof Pact["stances"],
): boolean {
  const pact = pactById(world, pactId);
  if (!pact) return false;
  if (world.day < pact.stanceCooldownUntilDay) return false;
  pact.stances[key] = !pact.stances[key];
  pact.stanceCooldownUntilDay = world.day + STANCE_COOLDOWN_DAYS;
  pushEvent(world, {
    day: world.day,
    category: "governance",
    title: `${pact.name} updated stance`,
    body: `Patrons adjusted ${key.replace(/([A-Z])/g, " $1").toLowerCase()}.`,
    entityIds: [],
    pactIds: [pactId],
    severity: "info",
  });
  return true;
}

export function fundCooperationEvent(world: World, pactId: string): boolean {
  const pact = pactById(world, pactId);
  if (!pact || pact.cooperationBudget < 15) return false;
  pact.cooperationBudget -= 15;
  pushEvent(world, {
    day: world.day,
    category: "cooperation",
    title: `${pact.name} funded exchange`,
    body: "Member cities pooled resources for a joint civic program.",
    entityIds: pact.memberCityIds.slice(0, 2),
    pactIds: [pactId],
    severity: "info",
  });
  return true;
}
