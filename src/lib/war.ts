// Pure helpers for the War page. No React here, so the derivations are testable
// and the page component stays declarative.
import type { War, WarClan, WarMember } from "../types/war";

/**
 * Supercell timestamps are compact ISO-8601 ("20250114T183012.000Z"), which
 * `Date.parse` doesn't accept. Re-insert the separators; return null on anything odd
 * instead of an Invalid Date that would render as "NaN:NaN".
 */
export function parseApiTime(s?: string | null): number | null {
  const m = s?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.(\d+))?Z$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, se, ms = "0"] = m;
  const t = Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${se}.${ms.padEnd(3, "0").slice(0, 3)}Z`);
  return Number.isNaN(t) ? null : t;
}

export const PHASE_LABEL: Record<string, string> = {
  preparation: "Preparation day",
  inWar: "Battle day",
  warEnded: "War ended",
};

export type Outcome = "win" | "lose" | "draw";

/** In-game rule: stars first, destruction % breaks ties. */
export function outcome(us: WarClan, them: WarClan): Outcome {
  if (us.stars !== them.stars) return us.stars > them.stars ? "win" : "lose";
  // Compare at 2 dp: the API sends floats like 66.66666 and the game rounds for display.
  const a = Math.round(us.destructionPercentage * 100);
  const b = Math.round(them.destructionPercentage * 100);
  return a === b ? "draw" : a > b ? "win" : "lose";
}

export interface Side {
  clan: WarClan;
  /** Members by map position (1 = top base). The API's array order isn't guaranteed. */
  lineup: WarMember[];
  attacksUsed: number;
  attacksTotal: number;
}

export function side(war: War, clan: WarClan): Side {
  const perMember = war.attacksPerMember ?? 2;
  return {
    clan,
    lineup: clan.members.toSorted((a, b) => a.mapPosition - b.mapPosition),
    // Prefer the clan-level counter; fall back to summing members if it's missing.
    attacksUsed: clan.attacks || clan.members.reduce((n, m) => n + m.attacks.length, 0),
    attacksTotal: (war.teamSize || clan.members.length) * perMember,
  };
}
