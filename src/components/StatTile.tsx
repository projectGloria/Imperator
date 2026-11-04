import type { LucideIcon } from "lucide-react";
import { GlassCard } from "./GlassCard";

const TONE = {
  gold: { text: "text-gold-300", bg: "bg-gold-400/10", glow: "gold" },
  elixir: { text: "text-elixir-300", bg: "bg-elixir-500/10", glow: "elixir" },
  dark: { text: "text-dark-300", bg: "bg-dark-500/15", glow: "dark" },
} as const;

export function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  tone = "gold",
  media,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: keyof typeof TONE;
  /** Replaces the icon box, e.g. with an official league icon or clan badge. */
  media?: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <GlassCard glow={t.glow} className="flex items-center gap-4 p-5">
      {media ?? (
        <div className={`grid size-12 shrink-0 place-items-center rounded-xl ${t.bg} ${t.text}`}>
          <Icon size={22} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-widest text-white/50">{label}</div>
        <div className="font-display text-2xl font-bold tabular-nums">{value}</div>
        {sub && <div className="truncate text-xs text-white/45">{sub}</div>}
      </div>
    </GlassCard>
  );
}
