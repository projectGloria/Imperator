import { motion } from "framer-motion";
import { Crown, FlaskConical, Hammer, Lock, Swords, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Category } from "../types/gameData";
import type { UnitView } from "../lib/units";
import { GlassCard } from "./GlassCard";
import { ImageSlot } from "./ImageSlot";
import { ProgressBar } from "./ProgressBar";

// Placeholder icon per category. Swap for ImageSlot `src` once you have your own art.
const ICON: Record<Category, LucideIcon> = {
  heroes: Crown,
  troops: Swords,
  spells: FlaskConical,
  siegeMachines: Hammer,
};
const TONE: Record<Category, "gold" | "elixir" | "dark"> = {
  heroes: "dark",
  troops: "elixir",
  spells: "elixir",
  siegeMachines: "gold",
};
const TINT: Record<Category, string> = {
  heroes: "text-dark-300",
  troops: "text-elixir-300",
  spells: "text-elixir-400",
  siegeMachines: "text-gold-300",
};

export function UnitCard({ unit }: { unit: UnitView }) {
  const tone = unit.maxed ? "maxed" : TONE[unit.category];
  return (
    <GlassCard glow={unit.maxed ? "maxed" : tone} className={`p-4 ${unit.locked ? "opacity-55" : ""}`}>
      {unit.maxed && (
        // Soft emerald halo behind maxed cards; pointer-events off so it never eats hovers.
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-emerald-400/40 shadow-[inset_0_0_30px_-10px_rgb(52_211_153/0.5)]" />
      )}
      <div className="flex items-start gap-3">
        <ImageSlot icon={unit.locked ? Lock : ICON[unit.category]} alt={unit.name} tint={TINT[unit.category]} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold" title={unit.name}>{unit.name}</div>
          <div className="mt-0.5 flex items-baseline gap-1 tabular-nums">
            <span className={`font-display text-xl font-bold ${unit.maxed ? "text-emerald-300" : "text-white"}`}>
              {unit.locked ? "—" : unit.level}
            </span>
            <span className="text-xs text-white/45">/ {unit.cap}</span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar value={unit.progress} tone={tone} />
      </div>

      <div className="mt-2 flex min-h-4 items-center gap-1.5 text-[10px] uppercase tracking-wider">
        {unit.locked && <span className="text-white/50">Not unlocked</span>}
        {unit.maxed && !unit.capBelowLevel && <span className="text-emerald-300">Maxed for TH</span>}
        {!unit.capKnown && (
          <Flag title="No entry in data/game-data.json for this unit at your TH. Bar uses the API's global max.">
            unknown cap
          </Flag>
        )}
        {unit.capBelowLevel && (
          <Flag title="Your level is above the cap in game-data.json — that value is probably wrong.">
            check cap data
          </Flag>
        )}
      </div>
    </GlassCard>
  );
}

function Flag({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.span
      title={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="inline-flex items-center gap-1 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-amber-300"
    >
      <TriangleAlert size={10} />
      {children}
    </motion.span>
  );
}
