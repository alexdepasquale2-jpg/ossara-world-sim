import { initCityEconomies } from "./economy";
import { generatePacts } from "./governance";
import { Rng } from "./rng";
import type {
  ArtPiece,
  Bounds,
  GeoEntity,
  Resident,
  SimStats,
  World,
} from "./types";

const FIRST = [
  "Ava",
  "Leo",
  "Mira",
  "Noah",
  "Zara",
  "Kai",
  "Elena",
  "Omar",
  "Luna",
  "Felix",
];
const LAST = [
  "Chen",
  "Okonkwo",
  "Santos",
  "Berg",
  "Patel",
  "Kim",
  "Rossi",
  "Ali",
  "Nguyen",
  "Ford",
];

const NATION_NAMES = ["Auroria", "Meridia", "Valenreach"];
const REGION_SUFFIX = ["Coast", "Highlands", "Basin", "Frontier"];
const STATE_SUFFIX = ["Province", "Territory", "District"];
const CITY_PREFIX = ["North", "South", "East", "West", "New", "Old", "Port"];
const CITY_SUFFIX = ["haven", "ford", "vale", "burg", "ton", "field"];

const ART_TITLES = [
  "Sunrise Over the Harbor",
  "Echoes in Bronze",
  "The People's Mosaic",
  "Continental Dream",
  "Market Day Colors",
  "River of Light",
];

function emptyStats(): SimStats {
  return { population: 0, happiness: 0.55, economy: 0.45, artIndex: 0.2 };
}

function makeGeo(
  id: string,
  kind: GeoEntity["kind"],
  name: string,
  parentId: string | null,
  bounds: GeoEntity["bounds"],
  color: number,
): GeoEntity {
  return { id, kind, name, parentId, bounds, color, stats: emptyStats() };
}

function centerIn(parent: Bounds, w: number, h: number, rng: Rng): Bounds {
  const margin = 8;
  const maxX = parent.x + parent.w - w - margin;
  const maxY = parent.y + parent.h - h - margin;
  return {
    x: rng.range(parent.x + margin, Math.max(parent.x + margin, maxX)),
    y: rng.range(parent.y + margin, Math.max(parent.y + margin, maxY)),
    w,
    h,
  };
}

function splitGrid(
  parent: Bounds,
  cols: number,
  rows: number,
  gap: number,
): Bounds[] {
  const cellW = (parent.w - gap * (cols + 1)) / cols;
  const cellH = (parent.h - gap * (rows + 1)) / rows;
  const out: Bounds[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({
        x: parent.x + gap + c * (cellW + gap),
        y: parent.y + gap + r * (cellH + gap),
        w: cellW,
        h: cellH,
      });
    }
  }
  return out;
}

function rollUpStats(entity: GeoEntity, children: GeoEntity[]): void {
  if (children.length === 0) return;
  let pop = 0;
  let happy = 0;
  let econ = 0;
  let art = 0;
  for (const c of children) {
    pop += c.stats.population;
    happy += c.stats.happiness;
    econ += c.stats.economy;
    art += c.stats.artIndex;
  }
  const n = children.length;
  entity.stats.population = pop;
  entity.stats.happiness = happy / n;
  entity.stats.economy = econ / n;
  entity.stats.artIndex = art / n;
}

export function generateWorld(seed = 42): World {
  const rng = new Rng(seed);
  const continentBounds = { x: -900, y: -650, w: 1800, h: 1300 };
  const continent = makeGeo(
    "continent-0",
    "continent",
    "Ossara",
    null,
    continentBounds,
    0x1a2332,
  );

  const entities: GeoEntity[] = [continent];
  const nationSlots = splitGrid(continentBounds, 3, 1, 24);
  const nationColors = [0x3d5a80, 0x5c7a4a, 0x8b5a6b];

  const cities: GeoEntity[] = [];

  nationSlots.forEach((slot, ni) => {
    const nation = makeGeo(
      `nation-${ni}`,
      "nation",
      NATION_NAMES[ni] ?? `Nation ${ni + 1}`,
      continent.id,
      slot,
      nationColors[ni] ?? 0x444444,
    );
    entities.push(nation);

    const regionSlots = splitGrid(slot, 1, 2, 16);
    regionSlots.forEach((rSlot, ri) => {
      const region = makeGeo(
        `region-${ni}-${ri}`,
        "region",
        `${nation.name} ${REGION_SUFFIX[ri % REGION_SUFFIX.length]}`,
        nation.id,
        rSlot,
        nationColors[ni]! + 0x111111 * (ri + 1),
      );
      entities.push(region);

      const stateSlots = splitGrid(rSlot, 2, 1, 12);
      stateSlots.forEach((sSlot, si) => {
        const state = makeGeo(
          `state-${ni}-${ri}-${si}`,
          "state",
          `${region.name.split(" ")[0]} ${STATE_SUFFIX[si % STATE_SUFFIX.length]}`,
          region.id,
          sSlot,
          nationColors[ni]! + 0x080808 * (si + 2),
        );
        entities.push(state);

        const citySlots = splitGrid(sSlot, 2, 2, 8);
        citySlots.forEach((cSlot, ci) => {
          if (rng.next() < 0.15) return;
          const cityName = `${rng.pick(CITY_PREFIX)}${rng.pick(CITY_SUFFIX)}`;
          const city = makeGeo(
            `city-${ni}-${ri}-${si}-${ci}`,
            "city",
            cityName,
            state.id,
            centerIn(cSlot, cSlot.w * 0.85, cSlot.h * 0.85, rng),
            0xc9b896 + rng.int(0, 0x151515),
          );
          city.stats.population = rng.int(800, 4200);
          city.stats.happiness = rng.range(0.45, 0.85);
          city.stats.economy = rng.range(0.35, 0.9);
          city.stats.artIndex = rng.range(0.1, 0.55);
          entities.push(city);
          cities.push(city);
        });
        const stateCities = entities.filter(
          (e) => e.parentId === state.id && e.kind === "city",
        );
        rollUpStats(state, stateCities);
      });
      const regionStates = entities.filter((e) => e.parentId === region.id);
      rollUpStats(region, regionStates);
    });
    const nationRegions = entities.filter((e) => e.parentId === nation.id);
    rollUpStats(nation, nationRegions);
  });

  const residents: Resident[] = [];
  const art: ArtPiece[] = [];
  let rid = 0;
  let aid = 0;

  for (const city of cities) {
    const count = Math.min(45, Math.floor(city.stats.population / 80));
    for (let i = 0; i < count; i++) {
      const roles: Resident["role"][] = [
        "citizen",
        "worker",
        "merchant",
        "artist",
      ];
      const role = rng.pick(roles);
      const x = rng.range(city.bounds.x + 6, city.bounds.x + city.bounds.w - 6);
      const y = rng.range(city.bounds.y + 6, city.bounds.y + city.bounds.h - 6);
      residents.push({
        id: `res-${rid++}`,
        name: `${rng.pick(FIRST)} ${rng.pick(LAST)}`,
        cityId: city.id,
        nationId: findAncestor(entities, city.id, "nation")?.id ?? "",
        role,
        x,
        y,
        targetX: x,
        targetY: y,
        mood: rng.range(0.4, 0.95),
      });
    }

    const artCount = rng.int(1, 4);
    const kinds: ArtPiece["kind"][] = [
      "mural",
      "sculpture",
      "gallery",
      "monument",
    ];
    for (let a = 0; a < artCount; a++) {
      art.push({
        id: `art-${aid++}`,
        kind: rng.pick(kinds),
        title: rng.pick(ART_TITLES),
        cityId: city.id,
        x: rng.range(city.bounds.x + 10, city.bounds.x + city.bounds.w - 10),
        y: rng.range(city.bounds.y + 10, city.bounds.y + city.bounds.h - 10),
        influence: rng.range(0.3, 1),
        hue: rng.range(0, 1),
      });
    }
  }

  const world: World = {
    continent,
    entities,
    residents,
    art,
    tick: 0,
    day: 1,
    seed,
    economies: [],
    pacts: [],
    routes: [],
    inventions: [],
    events: [],
    decisions: [],
    playerPactId: null,
    referencePrices: { food: 1, goods: 1, culture: 1 },
  };

  world.pacts = generatePacts(world, rng);
  initCityEconomies(world);
  return world;
}

function findAncestor(
  entities: GeoEntity[],
  startId: string,
  kind: GeoEntity["kind"],
): GeoEntity | undefined {
  let current = entities.find((e) => e.id === startId);
  while (current) {
    if (current.kind === kind) return current;
    if (!current.parentId) break;
    current = entities.find((e) => e.id === current!.parentId);
  }
  return undefined;
}

export function entityById(world: World, id: string): GeoEntity | undefined {
  return world.entities.find((e) => e.id === id);
}

export function childrenOf(world: World, parentId: string): GeoEntity[] {
  return world.entities.filter((e) => e.parentId === parentId);
}

export function breadcrumb(world: World, entityId: string): GeoEntity[] {
  const chain: GeoEntity[] = [];
  let current = entityById(world, entityId);
  while (current) {
    chain.unshift(current);
    if (!current.parentId) break;
    current = entityById(world, current.parentId);
  }
  return chain;
}
