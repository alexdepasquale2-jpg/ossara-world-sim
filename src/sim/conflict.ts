import { pushDecision, pushEvent } from "./events";
import {
  adjustPactTension,
  getPactTension,
  pactById,
} from "./governance";
import { Rng } from "./rng";
import type { World } from "./types";
import { entityById } from "./worldGen";

const CLASH_THRESHOLD = 70;

function pactPowerScore(world: World, pactId: string): number {
  const pact = pactById(world, pactId);
  if (!pact) return 0;
  let pop = 0;
  let econ = 0;
  let inventions = 0;
  for (const cityId of pact.memberCityIds) {
    const city = entityById(world, cityId);
    if (!city) continue;
    pop += city.stats.population;
    econ += city.stats.economy;
  }
  inventions = world.inventions.filter(
    (inv) =>
      !inv.obsolete && pact.memberCityIds.includes(inv.originCityId),
  ).length;
  const stanceBoost =
    (pact.stances.mutualAid ? 0.08 : 0) +
    (pact.stances.jointResearch ? 0.06 : 0);
  return (
    pop / 8000 +
    econ * 0.4 +
    inventions * 0.12 +
    pact.cooperationBudget / 200 +
    stanceBoost
  );
}

export function tickConflict(world: World, rng: Rng): void {
  for (let i = 0; i < world.pacts.length; i++) {
    for (let j = i + 1; j < world.pacts.length; j++) {
      const a = world.pacts[i]!;
      const b = world.pacts[j]!;
      const tension = getPactTension(world, a.id, b.id);
      if (tension < CLASH_THRESHOLD) continue;

      const decisionId = `clash-${a.id}-${b.id}`;
      if (world.decisions.some((d) => d.id === decisionId)) continue;

      const playerInvolved =
        world.playerPactId === a.id || world.playerPactId === b.id;
      if (playerInvolved) {
        pushDecision(world, {
          id: decisionId,
          type: "preClash",
          title: "Bloc tension rising",
          body: `${a.name} and ${b.name} stand at the brink of an abstract clash. Choose how your patron responds.`,
          deadlineDay: world.day + 3,
          entityIds: [],
          pactId: world.playerPactId,
        });
        continue;
      }

      resolveAbstractClash(world, a.id, b.id, rng);
    }
  }
}

export function resolveAbstractClash(
  world: World,
  pactAId: string,
  pactBId: string,
  rng: Rng,
): void {
  const scoreA = pactPowerScore(world, pactAId);
  const scoreB = pactPowerScore(world, pactBId);
  const winnerId = scoreA >= scoreB ? pactAId : pactBId;
  const loserId = winnerId === pactAId ? pactBId : pactAId;
  const winner = pactById(world, winnerId);
  const loser = pactById(world, loserId);
  if (!winner || !loser) return;

  const contested = loser.memberCityIds.filter(() => rng.next() < 0.25);
  for (const cityId of contested) {
    const city = entityById(world, cityId);
    if (city) {
      city.stats.happiness = Math.max(0.2, city.stats.happiness - 0.05);
    }
  }

  adjustPactTension(world, pactAId, pactBId, -25);
  pushEvent(world, {
    day: world.day,
    category: "conflict",
    title: "Abstract clash resolved",
    body: `${winner.name} gained influence after a diplomatic standoff with ${loser.name}.`,
    entityIds: contested,
    pactIds: [winnerId, loserId],
    severity: "warning",
  });
}
