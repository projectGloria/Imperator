import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, FlaskConical, Hammer, PawPrint, Sparkles, type LucideIcon } from "lucide-react";
import type { Upgrade, UpgradeSource } from "../lib/village";
import { useNow } from "../hooks/useNow";
import { fmtCountdown } from "../lib/format";

const SOURCE_ICON: Record<UpgradeSource, LucideIcon> = {
  Builder: Hammer,
  Laboratory: FlaskConical,
  "Star Laboratory": Sparkles,
  "Pet House": PawPrint,
};

/**
 * Live countdowns. One `useNow` for the whole list (one interval, one render per tick)
 * rather than a timer per row. Rows are memo-free on purpose: ≤ ~15 rows of text.
 */
export function UpgradeList({ items, limit }: { items: Upgrade[]; limit?: number }) {
  const now = useNow(1000);
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <ul className="divide-y divide-white/[0.05]">
      <AnimatePresence initial={false}>
        {shown.map((u, i) => {
          const left = u.endsAt - now;
          const done = left <= 0;
          const Icon = SOURCE_ICON[u.source];
          return (
            <motion.li
              key={u.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
              className="flex items-center gap-3 py-2.5"
            >
              <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${u.source === "Builder" ? "bg-gold-400/10 text-gold-300" : "bg-elixir-500/10 text-elixir-300"}`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm font-medium ${u.known ? "" : "text-white/50"}`}>
                  {u.name}
                  {u.unverified && <Unverified />}
                </div>
                <div className="text-xs text-white/45">
                  {u.from === 0 ? "New build" : `Lv ${u.from} → ${u.from + 1}`} · {u.source}
                </div>
              </div>
              {done ? (
                // The snapshot can't know you collected it; "ready" is all we can claim.
                <span className="flex items-center gap-1 text-sm font-semibold text-maxed-400">
                  <CircleCheck size={15} /> Ready
                </span>
              ) : (
                <span className="font-display text-sm font-semibold tabular-nums text-gold-200">{fmtCountdown(left)}</span>
              )}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

/** Marks a name that's a guess in game-data.json → ids.unverified. */
export function Unverified() {
  return (
    <span
      title="Name not verified — check in-game and remove this ID from ids.unverified in data/game-data.json"
      className="ml-1.5 rounded bg-amber-400/15 px-1 text-[10px] font-semibold text-amber-300"
    >
      ?
    </span>
  );
}
