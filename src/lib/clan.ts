// Pure sort/filter helpers for the member list. Kept out of the component so the
// comparator is created once, not per render, and is trivially testable.
import type { ClanMember, ClanRole } from "../types/clan";

export type SortKey = "rank" | "name" | "role" | "townHall" | "trophies" | "donations" | "received";
export type SortDir = 1 | -1;
export interface Sort {
  key: SortKey;
  dir: SortDir;
}

const ROLE_ORDER: Record<ClanRole, number> = { leader: 0, coLeader: 1, admin: 2, member: 3 };
const roleRank = (r: string) => ROLE_ORDER[r as ClanRole] ?? 4;

// Locale-aware, case-insensitive — clan names mix scripts and emoji.
const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

const VALUE: Record<SortKey, (m: ClanMember) => number | string> = {
  rank: (m) => m.clanRank,
  name: (m) => m.name,
  role: (m) => roleRank(m.role),
  townHall: (m) => m.townHallLevel ?? 0,
  trophies: (m) => m.trophies,
  donations: (m) => m.donations,
  received: (m) => m.donationsReceived,
};

/** First click on a column: numbers high→low, rank/name/role in natural (ascending) order. */
export const DEFAULT_DIR: Record<SortKey, SortDir> = {
  rank: 1, name: 1, role: 1, townHall: -1, trophies: -1, donations: -1, received: -1,
};

export function sortMembers(list: readonly ClanMember[], { key, dir }: Sort): ClanMember[] {
  const get = VALUE[key];
  // toSorted (ES2023) → never mutates the array we got from the resource cache.
  return list.toSorted((a, b) => {
    const va = get(a), vb = get(b);
    const c = typeof va === "string" ? collator.compare(va, vb as string) : va - (vb as number);
    // Tie-break on clan rank so the order is stable and meaningful.
    return c !== 0 ? c * dir : a.clanRank - b.clanRank;
  });
}

export function filterMembers(list: readonly ClanMember[], query: string): readonly ClanMember[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  // Match name or tag; strip a leading # so "2pp" and "#2pp" both work.
  const tagQ = q.replace(/^#/, "");
  return list.filter((m) => m.name.toLowerCase().includes(q) || m.tag.toLowerCase().includes(tagQ));
}

export const CLAN_TYPE_LABEL: Record<string, string> = {
  open: "Anyone can join",
  inviteOnly: "Invite only",
  closed: "Closed",
};
