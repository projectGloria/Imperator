// Mirrors src-tauri/src/api/models.rs. Kept in sync by hand (small surface, not worth codegen yet).

// `& {}` keeps editor autocomplete for the known literals while still accepting future values.
export type Village = "home" | "builderBase" | (string & {});

export interface Unit {
  name: string;
  level: number;
  maxLevel: number; // global max from the API, NOT the cap for your TH
  village: Village;
  superTroopIsActive?: boolean | null;
}

export interface ClanSummary {
  tag: string;
  name: string;
  clanLevel: number;
}

export interface Named {
  id: number;
  name: string;
}

export interface Player {
  tag: string;
  name: string;
  townHallLevel: number;
  townHallWeaponLevel?: number | null;
  expLevel: number;
  trophies: number;
  bestTrophies: number;
  warStars: number;
  attackWins: number;
  defenseWins: number;
  builderHallLevel?: number | null;
  builderBaseTrophies?: number | null;
  role?: string | null;
  warPreference?: string | null;
  donations: number;
  donationsReceived: number;
  clanCapitalContributions?: number | null;
  clan?: ClanSummary | null;
  league?: Named | null;
  leagueTier?: Named | null;
  troops: Unit[];
  heroes: Unit[];
  spells: Unit[];
}

export interface Cached<T> {
  data: T;
  fetchedAt: number; // epoch ms
  fromCache: boolean;
}
