import { describe, expect, it } from "vitest";
import { generateWorld } from "./worldGen";
import { initCityEconomies, tickEconomy } from "./economy";

describe("economy", () => {
  it("raises reference food price when continent is in deficit", () => {
    const world = generateWorld(1);
    initCityEconomies(world);
    world.referencePrices.food = 1;
    for (const econ of world.economies) econ.stock.food = 0;
    tickEconomy(world);
    expect(world.referencePrices.food).toBeGreaterThan(1);
  });
});
