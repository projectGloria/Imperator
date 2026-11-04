import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useNow } from "../hooks/useNow";
import { ago } from "../lib/format";

/**
 * Page header with the freshness label + Refresh. Lives in its own component so the
 * 1s `useNow` tick re-renders only this header, not the whole page of cards.
 */
export function RefreshBar({
  title,
  subtitle,
  fetchedAt,
  fromCache,
  refreshing,
  onRefresh,
}: {
  title: string;
  subtitle?: React.ReactNode;
  fetchedAt?: number;
  fromCache?: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const now = useNow(1000);
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-white/55">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-3">
        {fetchedAt != null && (
          <span className="text-xs text-white/45 tabular-nums">
            {fromCache ? "cached" : "live"} · {ago(fetchedAt, now)}
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="glass flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gold-200 transition hover:text-gold-300 disabled:opacity-60"
        >
          <motion.span
            animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={refreshing ? { repeat: Infinity, duration: 0.9, ease: "linear" } : { duration: 0 }}
            className="inline-flex"
          >
            <RefreshCw size={15} />
          </motion.span>
          Refresh
        </button>
      </div>
    </div>
  );
}
