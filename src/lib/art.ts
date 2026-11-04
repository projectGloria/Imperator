import type { IconUrls, Named } from "../types/player";

// Artwork dropped into <project>/art/ — e.g. official images from Supercell's Fan Kit
// (fankit.supercell.com), which you download yourself. Nothing is bundled by default.
//
// import.meta.glob runs at BUILD time: Vite lists whatever is in art/ and emits each file
// as a hashed asset (or a data: URI when tiny). So:
//   - no 404 probing at runtime — we know exactly which files exist,
//   - any of png/webp/jpg/svg/gif works,
//   - in dev, adding a file triggers a reload; for the installed app, rebuild.
// Nothing touches the filesystem at runtime, so no Tauri fs permission is needed.
const files = import.meta.glob<string>("/art/*.{png,webp,jpg,jpeg,svg,gif}", {
  eager: true,
  query: "?url",
  import: "default",
});

import { fanKitKeys, slug } from "./fanKit";

export { slug };

// Two tiers: a file you named yourself ("hog-rider.png") always beats a Fan Kit alias.
const EXACT = new Map<string, string>();
const ALIAS = new Map<string, { url: string; priority: number }>();
for (const [path, url] of Object.entries(files)) {
  const stem = path.slice(path.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "");
  EXACT.set(slug(stem), url);
  for (const [key, priority] of fanKitKeys(stem)) {
    const cur = ALIAS.get(key);
    if (!cur || priority > cur.priority) ALIAS.set(key, { url, priority });
  }
}

/** First candidate that has a file in art/, else undefined. */
export function findArt(candidates: readonly string[]): string | undefined {
  for (const c of candidates) {
    const url = EXACT.get(c) ?? ALIAS.get(c)?.url;
    if (url) return url;
  }
  return undefined;
}

/** Candidates for a named thing, level-specific first: ["cannon-11", "cannon"]. */
export function artFor(name: string, level?: number): string[] {
  const s = slug(name);
  return level ? [`${s}-${level}`, s] : [s];
}

/** Town Hall art: a per-level file wins, then a generic one. */
export const townHallArt = (level: number) => [`town-hall-${level}`, "town-hall"];

/** Pick an API image size. Badges come as small/medium/large, league icons as tiny/small/medium(/large). */
export function pickIcon(u: IconUrls | null | undefined, prefer: "small" | "large" = "large"): string | undefined {
  if (!u) return undefined;
  return prefer === "small" ? u.small ?? u.tiny ?? u.medium ?? u.large : u.large ?? u.medium ?? u.small ?? u.tiny;
}

/** Newer league tiers win over the legacy league, matching the label logic elsewhere. */
export const leagueIcon = (x: { leagueTier?: Named | null; league?: Named | null }, prefer: "small" | "large" = "large") =>
  pickIcon(x.leagueTier?.iconUrls ?? x.league?.iconUrls, prefer);
