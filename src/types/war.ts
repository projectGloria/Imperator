import type { IconUrls } from "./player";

// Mirrors `War` / `WarClan` / `WarMember` / `WarAttack` in src-tauri/src/api/models.rs.

/** "warLogPrivate" is synthesised by our Rust command from the API's 403. */
export type WarState = "notInWar" | "preparation" | "inWar" | "warEnded" | "warLogPrivate";

export interface WarAttack {
  attackerTag: string;
  defenderTag: string;
  stars: number;
  destructionPercentage: number;
  order: number;
  duration?: number | null;
}

export interface WarMember {
  tag: string;
  name: string;
  townhallLevel: number;
  mapPosition: number;
  attacks: WarAttack[];
  opponentAttacks: number;
  bestOpponentAttack?: WarAttack | null;
}

export interface WarClan {
  tag?: string | null;
  name?: string | null;
  clanLevel: number;
  badgeUrls?: IconUrls | null;
  attacks: number;
  stars: number;
  destructionPercentage: number;
  members: WarMember[];
}

export interface War {
  // `(string & {})` keeps autocomplete for known states but tolerates new ones.
  state: WarState | (string & {});
  teamSize: number;
  attacksPerMember?: number | null;
  preparationStartTime?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  clan?: WarClan | null;
  opponent?: WarClan | null;
}
