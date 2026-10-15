export type EntityKind =
  | "continent"
  | "nation"
  | "region"
  | "state"
  | "city"
  | "resident"
  | "art";

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SimStats {
  population: number;
  happiness: number;
  economy: number;
  artIndex: number;
}

export interface GeoEntity {
  id: string;
  kind: Exclude<EntityKind, "resident" | "art">;
  name: string;
  parentId: string | null;
  bounds: Bounds;
  color: number;
  stats: SimStats;
}

export type ResidentRole = "artist" | "worker" | "merchant" | "citizen";

export interface Resident {
  id: string;
  name: string;
  cityId: string;
  nationId: string;
  role: ResidentRole;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  mood: number;
}

export type ArtKind = "mural" | "sculpture" | "gallery" | "monument";

export interface ArtPiece {
  id: string;
  kind: ArtKind;
  title: string;
  cityId: string;
  x: number;
  y: number;
  influence: number;
  hue: number;
}

export interface World {
  continent: GeoEntity;
  entities: GeoEntity[];
  residents: Resident[];
  art: ArtPiece[];
  tick: number;
  day: number;
}

export type LayerVisibility = Record<EntityKind, boolean>;

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
  selectedId: string | null;
  layers: LayerVisibility;
  paused: boolean;
  speed: number;
}

export const DEFAULT_LAYERS: LayerVisibility = {
  continent: true,
  nation: true,
  region: true,
  state: true,
  city: true,
  resident: true,
  art: true,
};
