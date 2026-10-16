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

export type GoodKind = "food" | "goods" | "culture";

export interface CityEconomy {
  cityId: string;
  stock: Record<GoodKind, number>;
  capacity: Record<GoodKind, number>;
  production: Record<GoodKind, number>;
  consumption: Record<GoodKind, number>;
  localPrices: Record<GoodKind, number>;
}

export interface Pact {
  id: string;
  name: string;
  color: number;
  memberCityIds: string[];
  stances: {
    preferMemberTrade: boolean;
    openInternalBorders: boolean;
    jointResearch: boolean;
    mutualAid: boolean;
  };
  cooperationBudget: number;
  stanceCooldownUntilDay: number;
}

export interface TradeRoute {
  id: string;
  fromCityId: string;
  toCityId: string;
  good: GoodKind;
  volume: number;
  progress: number;
  merchantResidentId: string | null;
  daysActive: number;
}

export type InventionKind = "production" | "trade" | "culture" | "governance";

export interface InventionPerks {
  productionMult: number;
  tradeMult: number;
  cultureMult: number;
  governanceMult: number;
}

export interface InventionRecord {
  id: string;
  name: string;
  kind: InventionKind;
  originCityId: string;
  discoveredDay: number;
  spreadLevel: 0 | 1 | 2 | 3;
  spreadCityIds: string[];
  perks: InventionPerks;
  power: number;
  obsolete: boolean;
}

export type SimEventCategory =
  | "economy"
  | "migration"
  | "governance"
  | "invention"
  | "cooperation"
  | "conflict";

export interface SimEvent {
  id: string;
  day: number;
  category: SimEventCategory;
  title: string;
  body: string;
  entityIds: string[];
  pactIds: string[];
  severity: "info" | "warning" | "decision";
}

export type PendingDecisionType = "override" | "alliance" | "preClash";

export interface PendingDecision {
  id: string;
  type: PendingDecisionType;
  title: string;
  body: string;
  deadlineDay: number;
  entityIds: string[];
  pactId: string | null;
}

export type TradeOpenness = "closed" | "balanced" | "open";
export type CultureInvestment = "low" | "medium" | "high";
export type LaborFocus = "industry" | "services" | "arts";

export interface CityPolicy {
  cityId: string;
  tradeOpenness: TradeOpenness;
  cultureInvestment: CultureInvestment;
  laborFocus: LaborFocus;
  mandateConflictDays: number;
}

export interface NationMandate {
  nationId: string;
  tradeOpenness: TradeOpenness;
  cultureInvestment: CultureInvestment;
  laborFocus: LaborFocus;
}

export interface PactTension {
  pactAId: string;
  pactBId: string;
  value: number;
}

export interface World {
  continent: GeoEntity;
  entities: GeoEntity[];
  residents: Resident[];
  art: ArtPiece[];
  tick: number;
  day: number;
  seed: number;
  economies: CityEconomy[];
  pacts: Pact[];
  routes: TradeRoute[];
  inventions: InventionRecord[];
  events: SimEvent[];
  decisions: PendingDecision[];
  playerPactId: string | null;
  referencePrices: Record<GoodKind, number>;
  cityPolicies: CityPolicy[];
  nationMandates: NationMandate[];
  pactTensions: PactTension[];
}

export type OverlayLayer = "migration" | "inventions";

export type LayerVisibility = Record<EntityKind | OverlayLayer, boolean>;

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
  migration: false,
  inventions: false,
};
