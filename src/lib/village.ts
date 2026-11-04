// Pure derivations over a village snapshot. Everything here is a function of
// (snapshot, gameData) so pages memo it once per import instead of storing copies in state.
import type { GameData } from "../types/gameData";
import type { VillageExport, VillageItem } from "../types/village";

export type VillageSide = "home" | "builder";

export interface Named {
  name: string;
  /** false → no entry in game-data.json `ids.names`. */
  known: boolean;
  /** true → listed in `ids.unverified` (a guess to check in-game). */
  unverified: boolean;
}

export type Lookup = (id: number) => Named;

/** Build the ID→name resolver once per game-data load. */
export function makeLookup(gd: GameData | null): Lookup {
  const names = gd?.ids?.names ?? {};
  const unverified = new Set(gd?.ids?.unverified ?? []);
  return (id) => {
    const key = String(id);
    const name = names[key];
    return name
      ? { name, known: true, unverified: unverified.has(key) }
      : { name: `Unknown #${id}`, known: false, unverified: false };
  };
}

// ---------------------------------------------------------------------------------
// Upgrades

export type UpgradeSource = "Builder" | "Laboratory" | "Star Laboratory" | "Pet House";

export interface Upgrade extends Named {
  key: string;
  id: number;
  /** Level before the upgrade finishes; 0 = new construction. */
  from: number;
  /** Absolute end time in ms — the export's `timer` is relative to its `timestamp`. */
  endsAt: number;
  source: UpgradeSource;
  side: VillageSide;
}

type ListKey = keyof Pick<
  VillageExport,
  "buildings" | "traps" | "heroes" | "units" | "spells" | "siege_machines" | "pets" | "buildings2" | "traps2" | "heroes2" | "units2"
>;

// Which upgrade slot each list occupies. Heroes are upgraded by builders in-game.
const SOURCES: [ListKey, UpgradeSource, VillageSide][] = [
  ["buildings", "Builder", "home"],
  ["traps", "Builder", "home"],
  ["heroes", "Builder", "home"],
  ["units", "Laboratory", "home"],
  ["spells", "Laboratory", "home"],
  ["siege_machines", "Laboratory", "home"],
  ["pets", "Pet House", "home"],
  ["buildings2", "Builder", "builder"],
  ["traps2", "Builder", "builder"],
  ["heroes2", "Builder", "builder"],
  ["units2", "Star Laboratory", "builder"],
];

/** Every running timer in the export, soonest first. */
export function upgrades(exp: VillageExport, lookup: Lookup): Upgrade[] {
  const base = exp.timestamp * 1000;
  const out: Upgrade[] = [];
  for (const [list, source, side] of SOURCES) {
    exp[list].forEach((it, i) => {
      if (it.timer == null) return;
      out.push({
        ...lookup(it.data),
        key: `${list}-${it.data}-${i}`, // index disambiguates two X-Bows upgrading at once
        id: it.data,
        from: it.lvl,
        endsAt: base + it.timer * 1000,
        source,
        side,
      });
    });
  }
  return out.sort((a, b) => a.endsAt - b.endsAt);
}

// ---------------------------------------------------------------------------------
// Buildings by level

export interface LevelCount {
  lvl: number;
  cnt: number;
}

export interface Group extends Named {
  id: number;
  total: number;
  /** Highest level first. */
  levels: LevelCount[];
  upgrading: number;
}

// Pinned to the top: the hall defines everything else on the base.
const PINNED = new Set([1000001, 1000034]);
const collator = new Intl.Collator(undefined, { sensitivity: "base" });

/**
 * Collapse the export's rows (one per level, plus one per upgrading instance) into
 * one card per building type with a count per level.
 */
export function groupByType(items: readonly VillageItem[], lookup: Lookup): Group[] {
  const map = new Map<number, { levels: Map<number, number>; upgrading: number }>();
  for (const it of items) {
    // Rust defaults `cnt` to 1, but a missing count shouldn't be able to turn totals into NaN.
    const cnt = it.cnt ?? 1;
    let g = map.get(it.data);
    if (!g) map.set(it.data, (g = { levels: new Map(), upgrading: 0 }));
    g.levels.set(it.lvl, (g.levels.get(it.lvl) ?? 0) + cnt);
    if (it.timer != null) g.upgrading += cnt;
  }

  const groups: Group[] = [...map].map(([id, g]) => {
    const levels = [...g.levels].map(([lvl, cnt]) => ({ lvl, cnt })).sort((a, b) => b.lvl - a.lvl);
    return { ...lookup(id), id, levels, total: levels.reduce((n, l) => n + l.cnt, 0), upgrading: g.upgrading };
  });

  return groups.sort(
    (a, b) =>
      Number(PINNED.has(b.id)) - Number(PINNED.has(a.id)) ||
      Number(b.known) - Number(a.known) || // unknown IDs sink to the bottom
      collator.compare(a.name, b.name) ||
      a.id - b.id,
  );
}

/** Normalise "#abc" / "abc" for comparing the export tag with the configured player. */
export const sameTag = (a: string, b: string) =>
  a.replace(/^#/, "").toUpperCase() === b.replace(/^#/, "").toUpperCase();
