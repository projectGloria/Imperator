// Mirrors `Clan` / `ClanMember` in src-tauri/src/api/models.rs.
import type { IconUrls, Named } from "./player";

export type ClanRole = "leader" | "coLeader" | "admin" | "member";

export interface ClanMember {
  tag: string;
  name: string;
  role: ClanRole;
  townHallLevel?: number | null;
  expLevel: number;
  league?: Named | null;
  leagueTier?: Named | null;
  trophies: number;
  builderBaseTrophies?: number | null;
  clanRank: number;
  previousClanRank: number;
  donations: number;
  donationsReceived: number;
}

export interface Clan {
  tag: string;
  name: string;
  type: "open" | "inviteOnly" | "closed" | (string & {});
  description: string;
  location?: Named | null;
  chatLanguage?: Named | null;
  clanLevel: number;
  clanPoints: number;
  clanCapitalPoints?: number | null;
  requiredTrophies: number;
  requiredTownhallLevel?: number | null;
  warFrequency?: string | null;
  warWinStreak: number;
  warWins: number;
  warTies?: number | null;
  warLosses?: number | null;
  isWarLogPublic: boolean;
  warLeague?: Named | null;
  capitalLeague?: Named | null;
  badgeUrls?: IconUrls | null;
  members: number;
  memberList: ClanMember[];
}
