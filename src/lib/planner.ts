// Planner = (village snapshot × game-data caps at your TH). Pure functions only; the
// page memoises `buildPlan` once per (snapshot, gameData) and never stores rows in state.
import type { Category, GameData } from "../types/gameData";
import type { VillageExport, VillageItem } from "../types/village";
import { capAt } from "./units";
import { groupByType, makeLookup, type LevelCount, type Named } from "./village";

const TOWN_HALL = 1000001;

export interface PlanRow extends Named {
  key: string;
  category: string;
  /** Instances present in the snapshot, highest level first. */
  levels: LevelCount[];
  built: number;
  /** Max level at your TH. */
  cap: number;
  /** Level-ups left across all built instances (an in-progress upgrade still counts). */
  stepsLeft: number;
  /** Allowed at your TH minus built; 0 when game-data has no count for it. */
  missing: number;
  upgrading: number;
  /** Lab unit listed for your TH but absent from the export: unlocks via barracks, not the lab. */
  locked: boolean;
  /** You're above the cap game-data claims → that cap is wrong. */
  capBelowLevel: boolean;
  done: boolean;
}

export interface CategoryPlan {
  id: string;
  label: string;
  rows: PlanRow[];
  stepsLeft: number;
  missing: number;
}

export interface Plan {
  th: number;
  categories: Map<string, CategoryPlan>;
  /** In the snapshot, but no cap for your TH in game-data → not counted anywhere. */
  noCap: Named[];
}

/** Town Hall level straight from the snapshot, so the plan matches the export, not the API. */
export function snapshotTh(exp: VillageExport): number {
  return exp.buildings.find((b) => b.data === TOWN_HALL)?.lvl ?? 0;
}

function row(
  named: Named,
  key: string,
  category: string,
  levels: LevelCount[],
  cap: number,
  allowed: number | undefined,
  upgrading: number,
): PlanRow {
  const built = levels.reduce((n, l) => n + l.cnt, 0);
  const stepsLeft = levels.reduce((n, l) => n + Math.max(0, cap - l.lvl) * l.cnt, 0);
  const missing = allowed != null ? Math.max(0, allowed - built) : 0;
  return {
    ...named,
    key,
    category,
    levels,
    built,
    cap,
    stepsLeft,
    missing,
    upgrading,
    locked: false,
    capBelowLevel: levels.some((l) => l.lvl > cap),
    done: stepsLeft === 0 && missing === 0,
  };
}

// Lab lists in the export → (game-data caps map, planner category).
const LAB: [keyof VillageExport & ("units" | "spells" | "siege_machines" | "heroes"), Category, string][] = [
  ["heroes", "heroes", "heroes"],
  ["units", "troops", "lab"],
  ["spells", "spells", "lab"],
  ["siege_machines", "siegeMachines", "lab"],
];

export function buildPlan(exp: VillageExport, gd: GameData): Plan {
  const th = snapshotTh(exp);
  const lookup = makeLookup(gd);
  const rows: PlanRow[] = [];
  const noCap: Named[] = [];

  // --- Buildings + traps (keyed by export ID) ---
  const seen = new Set<string>();
  for (const g of groupByType([...exp.buildings, ...exp.traps], lookup)) {
    if (g.id === TOWN_HALL) continue; // the TH upgrade is a new TH, not a level-up within it
    const id = String(g.id);
    seen.add(id);
    const entry = gd.buildings[id];
    const cap = capAt(entry, th);
    // Never treat missing data as cap 0 (would read as "maxed"): park it in noCap instead.
    if (!entry || cap == null || cap <= 0) {
      noCap.push(g);
      continue;
    }
    rows.push(row(g, `b-${id}`, entry.category, g.levels, cap, capAt(entry.counts ? { caps: entry.counts } : undefined, th), g.upgrading));
  }
  // Buildings your TH allows that the export doesn't contain at all → "not built".
  for (const [id, entry] of Object.entries(gd.buildings)) {
    if (seen.has(id)) continue;
    const cap = capAt(entry, th);
    const allowed = entry.counts ? capAt({ caps: entry.counts }, th) : undefined;
    if (cap == null || cap <= 0 || !allowed) continue;
    rows.push(row(lookup(Number(id)), `b-${id}`, entry.category, [], cap, allowed, 0));
  }

  // --- Heroes + lab (matched by name: export ID → ids.names → caps.<category>) ---
  for (const [list, capsKey, category] of LAB) {
    const capsMap = gd.caps[capsKey];
    const present = new Set<string>();
    exp[list].forEach((it: VillageItem) => {
      const named = lookup(it.data);
      const cap = named.known ? capAt(capsMap[named.name], th) : undefined;
      if (cap == null || cap <= 0) {
        noCap.push(named);
        return;
      }
      present.add(named.name);
      rows.push(row(named, `${list}-${it.data}`, category, [{ lvl: it.lvl, cnt: 1 }], cap, undefined, it.timer != null ? 1 : 0));
    });
    // Listed for your TH but not in the export → not unlocked yet. Shown, never counted:
    // unlocking happens in the barracks/hall, so they're not lab level-ups yet.
    for (const [name, entry] of Object.entries(capsMap)) {
      const cap = capAt(entry, th);
      if (present.has(name) || cap == null || cap <= 0) continue;
      rows.push({
        name, known: true, unverified: false, key: `${list}-locked-${name}`, category, levels: [], built: 0, cap,
        stepsLeft: 0, missing: 0, upgrading: 0, locked: true, capBelowLevel: false, done: false,
      });
    }
  }

  // --- Group into categories ---
  const categories = new Map<string, CategoryPlan>();
  for (const c of gd.planner.categories) categories.set(c.id, { id: c.id, label: c.label, rows: [], stepsLeft: 0, missing: 0 });
  for (const r of rows) {
    let c = categories.get(r.category);
    // A category used in `buildings` but not declared in `planner.categories` still shows up.
    if (!c) categories.set(r.category, (c = { id: r.category, label: r.category, rows: [], stepsLeft: 0, missing: 0 }));
    c.rows.push(r);
    c.stepsLeft += r.stepsLeft;
    c.missing += r.missing;
  }
  // Most work first; locked units after real work, finished items last.
  const rank = (r: PlanRow) => (r.done ? 2 : r.locked ? 1 : 0);
  for (const c of categories.values()) {
    c.rows.sort((a, b) => rank(a) - rank(b) || b.stepsLeft + b.missing - (a.stepsLeft + a.missing) || a.name.localeCompare(b.name));
  }
  return { th, categories, noCap };
}

/**
 * Effective category order: the saved order first (dropping ids that no longer exist),
 * then anything new from defaultOrder / the plan, so a category added to game-data.json
 * later never silently disappears from the planner.
 */
export function resolveOrder(saved: readonly string[] | undefined, defaults: readonly string[], present: Iterable<string>): string[] {
  const valid = new Set(present);
  const out: string[] = [];
  for (const id of [...(saved ?? []), ...defaults, ...valid]) {
    if (valid.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}
