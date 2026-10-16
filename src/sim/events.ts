import type { Rng } from "./rng";
import type { PendingDecision, SimEvent, World } from "./types";
import { entityById } from "./worldGen";

const MAX_EVENTS = 100;
let eventSeq = 0;

export function pushEvent(
  world: World,
  event: Omit<SimEvent, "id">,
): SimEvent {
  const full: SimEvent = { ...event, id: `evt-${eventSeq++}` };
  world.events.push(full);
  if (world.events.length > MAX_EVENTS) {
    world.events.splice(0, world.events.length - MAX_EVENTS);
  }
  return full;
}

export function pushDecision(world: World, d: PendingDecision): void {
  if (world.decisions.some((x) => x.id === d.id)) return;
  world.decisions.push(d);
  pushEvent(world, {
    day: world.day,
    category: "governance",
    title: d.title,
    body: d.body,
    entityIds: d.entityIds,
    pactIds: d.pactId ? [d.pactId] : [],
    severity: "decision",
  });
}

const EVENT_TEMPLATES: Array<{
  category: SimEvent["category"];
  title: string;
  body: string;
}> = [
  {
    category: "cooperation",
    title: "Scholars exchange visit",
    body: "Member cities hosted a quiet knowledge exchange.",
  },
  {
    category: "migration",
    title: "Seasonal relocation",
    body: "Families followed opportunity along open corridors.",
  },
  {
    category: "governance",
    title: "Council session",
    body: "Local leaders reviewed mandates and civic priorities.",
  },
  {
    category: "economy",
    title: "Market adjustment",
    body: "Traders recalibrated prices after a busy week.",
  },
  {
    category: "invention",
    title: "Workshop showcase",
    body: "Inventors demonstrated a refined civic tool.",
  },
  {
    category: "conflict",
    title: "Border briefing",
    body: "Diplomats noted rising rhetoric between blocs.",
  },
  {
    category: "cooperation",
    title: "Mutual aid drill",
    body: "Pact members rehearsed shared relief logistics.",
  },
  {
    category: "migration",
    title: "Housing initiative",
    body: "A city opened temporary quarters for newcomers.",
  },
  {
    category: "governance",
    title: "Policy review",
    body: "Communities compared local rules with regional guidance.",
  },
  {
    category: "economy",
    title: "Harbor tally",
    body: "Port clerks logged steady inbound shipments.",
  },
  {
    category: "invention",
    title: "Archive donation",
    body: "A city library received annotated trade maps.",
  },
  {
    category: "conflict",
    title: "Tension watch",
    body: "Observers reported sharper trade disputes at the frontier.",
  },
];

export function tickEvents(world: World, rng: Rng): void {
  if (world.day % 4 !== 0) return;
  const template = rng.pick(EVENT_TEMPLATES);
  const cities = world.entities.filter((e) => e.kind === "city");
  const city = rng.pick(cities);
  pushEvent(world, {
    day: world.day,
    category: template.category,
    title: template.title,
    body: template.body,
    entityIds: city ? [city.id] : [],
    pactIds: [],
    severity: "info",
  });
}

export function maybePushShortageEvent(world: World, cityId: string): void {
  const econ = world.economies.find((e) => e.cityId === cityId);
  const city = entityById(world, cityId);
  if (!econ || !city) return;
  const lowFood = econ.stock.food < econ.capacity.food * 0.15;
  if (!lowFood) return;
  const recent = world.events.slice(-8).some(
    (e) =>
      e.category === "economy" &&
      e.entityIds.includes(cityId) &&
      e.title.includes("shortage"),
  );
  if (recent) return;
  pushEvent(world, {
    day: world.day,
    category: "economy",
    title: "Food shortage reported",
    body: `${city.name} markets tightened as reserves ran low.`,
    entityIds: [cityId],
    pactIds: [],
    severity: "warning",
  });
}
