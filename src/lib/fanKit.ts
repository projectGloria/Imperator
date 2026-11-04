// Pure name mapping for art files (no Vite APIs here, so it's testable in plain Node).

/** "Barbarian King" → "barbarian-king", "P.E.K.K.A" → "pekka", "Builder's Hut" → "builders-hut". */
export function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Fan Kit spell file names use short words that differ from the in-game names.
const SPELL_ALIAS: Record<string, string> = { heal: "healing", ice_block: "ice-block" };

/**
 * Map a Fan Kit file name to the app's keys, with a priority (higher wins on collisions).
 * Returns [] for files that aren't icons we understand (renders, banners, …).
 *   Icon_HV_Hog_Rider               → hog-rider
 *   Icon_HV_Hero_Barbarian_King     → barbarian-king
 *   Icon_HV_Siege_Machine_Log_Launcher → log-launcher
 *   Icon_HV_Spell_Lightning_new     → lightning-spell   (_new beats _old)
 *   Icon_HV_Dark_Spell_Bat          → bat-spell
 *   Building_HV_Cannon_level_12     → cannon-12, and cannon (highest level wins)
 *   Icon_BB_Baby_Dragon             → baby-dragon       (only if no home-village file)
 */
export function fanKitKeys(stem: string): [key: string, priority: number][] {
  const s = stem.toLowerCase().trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^icon_hv_(?:dark_)?spell_(.+?)(_new|_old)?$/))) {
    const word = SPELL_ALIAS[m[1]!] ?? m[1]!;
    return [[`${slug(word)}-spell`, m[2] === "_old" ? 20 : 30]];
  }
  // Category words the Fan Kit inserts before the unit name: Icon_HV_Hero_X, Icon_HV_Siege_Machine_X.
  if ((m = s.match(/^icon_hv_(?:hero_|siege_machine_)(.+)$/))) return [[slug(m[1]!), 30]];
  if ((m = s.match(/^icon_hv_(.+?)(_new|_old)?$/))) return [[slug(m[1]!), m[2] === "_old" ? 20 : 30]];
  if ((m = s.match(/^icon_bb_(?:hero_)?(.+)$/))) return [[slug(m[1]!), 10]];
  // Buildings/traps. Real Fan Kit variants seen:
  //   Building_HV_Cannon_level_9, Building_HV_Army_Camp_level_05, Building_HV_Builder_Hut_Level_1,
  //   Building_HV_Wall_level_10_1 (variant), Building_HV_Giant_Bomb_level_3&4 (one image, two levels;
  //   saved as level_3-4 because "&" would break Vite's ?url import).
  if ((m = s.match(/^(?:building|traps?)_hv_(.+?)_level\s*_?\s*(\d+)(?:[&-](\d+))?(?:_(\d+))?$/))) {
    const lo = Number(m[2]);
    const hi = m[3] ? Number(m[3]) : lo;
    // Variant suffixes (_1, _2: weapon stages of a TH) — the first variant is the plain one.
    return levelKeys(m[1]!, lo, hi, Number(m[4] ?? 1));
  }
  if ((m = s.match(/^(?:building_hv_)?([a-z_]+?)_lvl_?(\d+)$/))) return levelKeys(m[1]!, Number(m[2]), Number(m[2]), 1); // hero_hall_lvl_02
  if ((m = s.match(/^building_hv_([a-z_]+)$/))) return [[buildingSlug(m[1]!), 4]]; // no level: Building_HV_Helper_Hut
  return [];
}

// Where the Fan Kit's building name differs from the in-game one.
const BUILDING_ALIAS: Record<string, string> = { "builder-hut": "builders-hut" };
const buildingSlug = (raw: string) => {
  const s = slug(raw);
  return BUILDING_ALIAS[s] ?? s;
};

function levelKeys(raw: string, lo: number, hi: number, variant: number): [string, number][] {
  const base = buildingSlug(raw);
  const out: [string, number][] = [];
  // A shared image (level_3&4) ranks below a dedicated one for the same level.
  const shared = hi > lo ? 1 : 0;
  for (let l = lo; l <= hi; l++) out.push([`${base}-${l}`, 30 - variant - shared]);
  // Generic fallback for levels without a file: prefer the highest level.
  out.push([base, Math.min(hi, 99) / 100 + 5]);
  return out;
}

