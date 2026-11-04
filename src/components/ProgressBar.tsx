import { motion } from "framer-motion";

const FILL = {
  gold: "from-gold-300 to-gold-500",
  elixir: "from-elixir-400 to-elixir-500",
  dark: "from-dark-300 to-dark-500",
  maxed: "from-emerald-300 to-emerald-500",
} as const;

export function ProgressBar({ value, tone = "elixir" }: { value: number; tone?: keyof typeof FILL }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
      {/* scaleX instead of width: transform-only animation, no layout per frame. */}
      <motion.div
        className={`h-full origin-left rounded-full bg-gradient-to-r ${FILL[tone]}`}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: v }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      />
    </div>
  );
}
