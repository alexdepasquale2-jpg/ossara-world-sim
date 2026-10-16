import type { World } from "./types";
import { tickAgents } from "./agents";
import { rollupHierarchy } from "./rollup";

export interface SimContext {
  seed: number;
  ticksPerDay: number;
}

export class SimClock {
  tick(world: World, ctx: SimContext, steps: number): void {
    for (let s = 0; s < steps; s++) {
      world.tick++;
      if (world.tick % ctx.ticksPerDay === 0) world.day++;
      tickAgents(world);
      rollupHierarchy(world);
    }
  }
}
