// Pure derivations (Player, GameData) → view models. No React in here: pages recompute
// these from props with useMemo instead of mirroring them into useState.
import type { Category, GameData, UnitCaps } from "../types/gameData";
import type { Player, Unit } from "../types/player";

export interface UnitView {
  name: string;
  category: Category;
  level: number;
  /** Cap used for the bar: TH cap from game-data, or the API's global max as fallback. */
  cap: number;
  apiMax: number;
  /** false → no game-data entry for this unit at this TH; `cap` is the API global max. */
  capKnown: boolean;
  /** Data inconsistency: you're above the cap game-data claims → stale/wrong JSON value. */
  capBelowLevel: boolean;
  /** Listed in game-data for your TH but not returned by the API → not unlocked yet. */
  locked: boolean;
  progress: number; // 0..1
  maxed: boolean;
  todo?: string;
}

/** Step-map lookup: value at the largest TH key ≤ th. */
export function capAt(entry: UnitCaps | undefined, th: number): number | undefined {
  if (!entry) return undefined;
  let best: number | undefined;
  let bestTh = -1;
  for (const [k, v] of Object.entries(entry.caps)) {
    const t = Number(k);
    if (t <= th && t > bestTh) {
      bestTh = t;
      best = v;
    }
  }
  return best;
}

function view(u: Unit, category: Category, th: number, gd: GameData | null): UnitView {
  const entry = gd?.caps[category][u.name];
  const dataCap = capAt(entry, th);
  // Missing / zero cap must never be treated as 0 (reads as "maxed", or divides by zero):
  // fall back to the API's global max and flag it.
  const capKnown = dataCap != null && dataCap > 0;
  // The API max bounds every TH, so a typo'd data value gets clamped to it.
  const rawCap = capKnown ? Math.min(dataCap, u.maxLevel) : u.maxLevel;
  const capBelowLevel = capKnown && u.level > rawCap;
  const cap = Math.max(rawCap, 1);
  return {
    name: u.name,
    category,
    level: u.level,
    cap,
    apiMax: u.maxLevel,
    capKnown,
    capBelowLevel,
    locked: false,
    progress: Math.min(u.level / cap, 1),
    maxed: u.level >= cap,
    todo: entry?._todo,
  };
}

export interface Roster {
  heroes: UnitView[];
  troops: UnitView[];
  spells: UnitView[];
  siegeMachines: UnitView[];
  /** Kept for a future section; not displayed and excluded from completion. */
  builderBase: { heroes: Unit[]; troops: Unit[] };
}

export const CATEGORIES = ["heroes", "troops", "spells", "siegeMachines"] as const satisfies readonly Category[];

export function buildRoster(p: Player, gd: GameData | null): Roster {
  const th = p.townHallLevel;
  const siege = new Set(gd?.categories.siegeMachines ?? []);
  const pets = new Set(gd?.categories.pets ?? []);
  const supers = new Set(gd?.categories.superTroops ?? []);

  const home = (u: Unit) => u.village === "home";
  const homeTroops = p.troops.filter(home);

  const roster: Roster = {
    heroes: p.heroes.filter(home).map((u) => view(u, "heroes", th, gd)),
    // Super troops mirror their base troop's level; pets weren't requested → both excluded.
    troops: homeTroops
      .filter((u) => !siege.has(u.name) && !pets.has(u.name) && !supers.has(u.name))
      .map((u) => view(u, "troops", th, gd)),
    spells: p.spells.filter(home).map((u) => view(u, "spells", th, gd)),
    siegeMachines: homeTroops.filter((u) => siege.has(u.name)).map((u) => view(u, "siegeMachines", th, gd)),
    builderBase: {
      heroes: p.heroes.filter((u) => u.village === "builderBase"),
      troops: p.troops.filter((u) => u.village === "builderBase"),
    },
  };

  // The API omits units you haven't unlocked. If game-data says one is available at
  // your TH, add it at level 0 so completion reflects what's actually left.
  if (gd) {
    for (const cat of CATEGORIES) {
      const have = new Set(roster[cat].map((u) => u.name));
      for (const [name, entry] of Object.entries(gd.caps[cat])) {
        const cap = capAt(entry, th);
        if (!cap || have.has(name)) continue;
        roster[cat].push({
          name, category: cat, level: 0, cap, apiMax: cap, capKnown: true,
          capBelowLevel: false, locked: true, progress: 0, maxed: false, todo: entry._todo,
        });
      }
    }
  }
  return roster;
}

export interface Completion {
  ratio: number;
  levels: number;
  caps: number;
  maxed: number;
  total: number;
}

/** Σ min(level, cap) / Σ cap — weighted by level count, so a 100-level hero outweighs a 5-level spell. */
export function completion(units: UnitView[]): Completion {
  let levels = 0, caps = 0, maxed = 0;
  for (const u of units) {
    levels += Math.min(u.level, u.cap);
    caps += u.cap;
    if (u.maxed) maxed++;
  }
  return { ratio: caps ? levels / caps : 0, levels, caps, maxed, total: units.length };
}

export const CATEGORY_LABEL: Record<Category, string> = {
  heroes: "Heroes",
  troops: "Troops",
  spells: "Spells",
  siegeMachines: "Siege Machines",
};
