import type { GeoEntity, World } from "./types";

export function rollupHierarchy(world: World): void {
  const kinds: GeoEntity["kind"][] = ["state", "region", "nation", "continent"];
  for (const kind of kinds) {
    for (const entity of world.entities.filter((e) => e.kind === kind)) {
      const kids = world.entities.filter((e) => e.parentId === entity.id);
      if (kids.length === 0) continue;
      let pop = 0;
      let h = 0;
      let e = 0;
      let a = 0;
      for (const k of kids) {
        pop += k.stats.population;
        h += k.stats.happiness;
        e += k.stats.economy;
        a += k.stats.artIndex;
      }
      const n = kids.length;
      entity.stats.population = pop;
      entity.stats.happiness = h / n;
      entity.stats.economy = e / n;
      entity.stats.artIndex = a / n;
    }
  }
}
