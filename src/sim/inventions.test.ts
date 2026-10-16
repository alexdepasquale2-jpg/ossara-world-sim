import { describe, expect, it } from "vitest";
import { generateWorld } from "./worldGen";
import { initCityEconomies } from "./economy";
import {
  tickInventions,
  cityKnowsInvention,
  discoverInvention,
} from "./inventions";
import { Rng } from "./rng";
import type { InventionRecord } from "./types";

describe("inventions", () => {
  it("exposes neighbor after sustained route", () => {
    const world = generateWorld(5);
    initCityEconomies(world);
    const cities = world.entities.filter((e) => e.kind === "city");
    const a = cities[0]!;
    const b = cities.find((c) => c.id !== a.id);
    expect(b).toBeDefined();

    const inv: InventionRecord = {
      id: "test-inv",
      name: "Test Ledger",
      kind: "trade",
      originCityId: a.id,
      discoveredDay: 1,
      spreadLevel: 0,
      spreadCityIds: [],
      perks: {
        productionMult: 1,
        tradeMult: 1.1,
        cultureMult: 1,
        governanceMult: 1,
      },
      power: 0.8,
      obsolete: false,
    };
    world.inventions.push(inv);

    world.routes.push({
      id: "r-test",
      fromCityId: a.id,
      toCityId: b!.id,
      good: "goods",
      volume: 10,
      progress: 0.2,
      merchantResidentId: null,
      daysActive: 2,
    });

    const rng = new Rng(5);
    tickInventions(world, rng);
    expect(world.routes[0]!.daysActive).toBe(3);
    expect(cityKnowsInvention(inv, b!.id)).toBe(true);
  });

  it("obsoletes weaker invention of same kind", () => {
    const world = generateWorld(11);
    const cities = world.entities.filter((e) => e.kind === "city");
    const rng = new Rng(99);
    discoverInvention(world, rng, cities[0]!.id, "production");
    const first = world.inventions[0]!;
    first.power = 0.2;
    discoverInvention(world, rng, cities[1]!.id, "production");
    const second = world.inventions[world.inventions.length - 1]!;
    expect(first.obsolete || second.obsolete).toBe(true);
  });
});
