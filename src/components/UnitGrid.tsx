import { motion } from "framer-motion";
import type { UnitView } from "../lib/units";
import { completion } from "../lib/units";
import { pct } from "../lib/format";
import { UnitCard } from "./UnitCard";

// Parent variants: `staggerChildren` delays each child's `show` by 40ms → cascade entrance.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

export function UnitGrid({ title, units }: { title: string; units: UnitView[] }) {
  if (units.length === 0) return null;
  // Derived on render — cheap (≤ ~40 units), no need to memo or store.
  const c = completion(units);
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold tracking-wide">{title}</h2>
        <span className="text-xs text-white/50 tabular-nums">
          {c.maxed}/{c.total} maxed · {pct(c.ratio)}
        </span>
      </div>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4"
      >
        {units.map((u) => (
          // name is unique within a category; the API never returns duplicates per village.
          <UnitCard key={u.name} unit={u} />
        ))}
      </motion.div>
    </section>
  );
}
