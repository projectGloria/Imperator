import { useState } from "react";
import { Image as ImageIcon, type LucideIcon } from "lucide-react";
import { artFor, findArt } from "../lib/art";

const TONE = {
  gold: "from-gold-400/25 to-gold-500/5 ring-gold-400/25 text-gold-300",
  elixir: "from-elixir-500/30 to-elixir-700/5 ring-elixir-500/25 text-elixir-300",
  dark: "from-dark-500/40 to-dark-700/10 ring-dark-500/30 text-dark-300",
  neutral: "from-white/10 to-white/[0.02] ring-white/10 text-white/60",
} as const;
export type SlotTone = keyof typeof TONE;

/**
 * Picture for a unit / building / clan. Resolution order:
 *   1. your file in art/ (by `art` candidates, else the slug of `name`) — a local override wins,
 *   2. `src`: an official image URL from the API (badges, league icons),
 *   3. a styled tile with a line icon (`icon`, else a generic image glyph). No emoji.
 * The tile's tooltip names the file to add, so the fallback is still a marked drop-in slot.
 */
export function ImageSlot({
  name,
  level,
  art,
  src,
  icon: Icon = ImageIcon,
  alt,
  size = 48,
  tone = "neutral",
  className = "",
}: {
  /** Display name; drives the art file name lookup. */
  name?: string;
  /** Building level: tries "<name>-<level>" (Fan Kit per-level art) before "<name>". */
  level?: number;
  /** Explicit file-name candidates (without extension), tried in order. */
  art?: readonly string[];
  /** Official API image URL (api-assets.clashofclans.com only — enforced by Rust and the CSP). */
  src?: string | null;
  icon?: LucideIcon;
  alt?: string;
  size?: number;
  tone?: SlotTone;
  className?: string;
}) {
  const candidates = art ?? (name ? artFor(name, level) : []);
  // Remember which URL failed (offline, 404) rather than a boolean: when `src` changes the
  // comparison is false again, so a new URL gets its chance without an effect to reset state.
  const [failed, setFailed] = useState<string | null>(null);
  const local = findArt(candidates);
  const remote = src && src !== failed ? src : undefined;
  const url = local ?? remote;
  const label = alt ?? name ?? "";

  if (url) {
    return (
      <img
        src={url}
        alt={label}
        width={size}
        height={size}
        draggable={false}
        loading="lazy"
        // Don't tell Supercell's CDN which page asked; there's nothing useful in it for them.
        referrerPolicy="no-referrer"
        onError={url === remote ? () => setFailed(remote) : undefined}
        // contain, not cover: unit art is usually a cut-out on transparency; cropping it looks wrong.
        className={`shrink-0 object-contain drop-shadow-[0_4px_10px_rgb(0_0_0/0.45)] ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const hint = candidates[0] ? `Add art/${candidates[0]}.png to use your own image` : undefined;
  return (
    <div
      role="img"
      aria-label={label}
      title={hint}
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br ring-1 ${TONE[tone]} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Top sheen: a cheap highlight that makes the tile read as an object, not a hole. */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
      <Icon size={size * 0.5} className="relative" />
    </div>
  );
}
