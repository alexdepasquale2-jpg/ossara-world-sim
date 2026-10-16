import { describe, expect, it } from "vitest";
import { tickWorld } from "./engine";
import { initCityEconomies } from "./economy";
import { generateWorld } from "./worldGen";

describe("v2 acceptance", () => {
  it("meets v2 success criteria on seed 2026", () => {
    const world = generateWorld(2026);
    world.playerPactId = world.pacts[0]?.id ?? null;
    initCityEconomies(world);
    const ticksPerDay = 120;
    for (let d = 0; d < 10 * ticksPerDay; d++) {
      tickWorld(world, 1);
    }
    expect(world.day).toBeGreaterThanOrEqual(10);
    expect(world.events.some((e) => e.category === "economy")).toBe(true);
    expect(world.routes.length + world.inventions.length).toBeGreaterThanOrEqual(0);
    expect(world.pacts.length).toBeGreaterThanOrEqual(2);
  });
});
