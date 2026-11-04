import type { LucideIcon } from "lucide-react";

/**
 * PLACEHOLDER for your own artwork. No Supercell assets are used anywhere.
 *
 * To drop in an image later: put files under `public/art/<category>/<slug>.png` and
 * pass `src="/art/heroes/barbarian-king.png"`. `img-src 'self'` in the CSP already
 * allows local files; remote URLs are blocked on purpose.
 */
export function ImageSlot({
  icon: Icon,
  emoji,
  src,
  alt,
  size = 48,
  tint = "text-gold-300",
}: {
  icon?: LucideIcon;
  emoji?: string;
  src?: string;
  alt: string;
  size?: number;
  tint?: string;
}) {
  if (src) {
    return <img src={src} alt={alt} width={size} height={size} className="rounded-xl object-cover" draggable={false} />;
  }
  return (
    <div
      title={`Placeholder — add your own image for "${alt}"`}
      className={`grid shrink-0 place-items-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] ${tint}`}
      style={{ width: size, height: size }}
    >
      {emoji ? <span style={{ fontSize: size * 0.5 }}>{emoji}</span> : Icon ? <Icon size={size * 0.5} /> : null}
    </div>
  );
}
