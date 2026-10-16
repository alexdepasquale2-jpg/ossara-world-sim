import { describe, expect, it } from "vitest";
import { initCityEconomies } from "./economy";
import { tickMigration } from "./migration";
import { generateWorld } from "./worldGen";

describe("migration", () => {
  it("moves population from unhappy to happy city in same state", () => {
    const world = generateWorld(7);
    initCityEconomies(world);
    const cities = world.entities.filter((e) => e.kind === "city");
    const a = cities[0]!;
    const b = cities.find((c) => c.parentId === a.parentId && c.id !== a.id);
    if (!b) return;
    a.stats.happiness = 0.2;
    b.stats.happiness = 0.9;
    a.stats.population = 5000;
    b.stats.population = 1000;
    tickMigration(world);
    expect(a.stats.population).toBeLessThan(5000);
  });
});
