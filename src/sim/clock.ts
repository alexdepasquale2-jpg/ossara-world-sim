import type { World } from "./types";
import { tickAgents } from "./agents";
import { tickEconomy } from "./economy";
import { tickMigration } from "./migration";
import { tickEvents } from "./events";
import { tickGovernance } from "./governance";
import { tickConflict } from "./conflict";
import { tickInventions, simRng } from "./inventions";
import { rollupHierarchy } from "./rollup";

export interface SimContext {
  seed: number;
  ticksPerDay: number;
}

export class SimClock {
  tick(world: World, ctx: SimContext, steps: number): void {
    for (let s = 0; s < steps; s++) {
      world.tick++;
      if (world.tick % ctx.ticksPerDay === 0) {
        world.day++;
        const dayRng = simRng(world, world.day);
        tickGovernance(world, dayRng);
        tickMigration(world);
        tickInventions(world, simRng(world, 4));
        tickEvents(world, dayRng);
        tickConflict(world, dayRng);
      }
      tickEconomy(world);
      tickAgents(world);
      rollupHierarchy(world);
    }
  }
}
