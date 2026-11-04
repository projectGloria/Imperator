import { motion, type HTMLMotionProps } from "framer-motion";

type Glow = "gold" | "elixir" | "dark" | "maxed" | "none";

const GLOW: Record<Glow, string> = {
  gold: "hover:shadow-[0_18px_40px_-16px_rgb(245_197_66/0.45)]",
  elixir: "hover:shadow-[0_18px_40px_-16px_rgb(192_76_255/0.5)]",
  dark: "hover:shadow-[0_18px_40px_-16px_rgb(109_76_143/0.6)]",
  maxed: "hover:shadow-[0_18px_40px_-16px_rgb(52_211_153/0.45)]",
  none: "",
};

/** Parent grids drive entrance via variants; cards only declare their hidden/shown states. */
export const cardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 24 } },
};

interface Props extends HTMLMotionProps<"div"> {
  glow?: Glow;
  lift?: boolean;
}

export function GlassCard({ glow = "none", lift = true, className = "", children, ...rest }: Props) {
  return (
    <motion.div
      variants={cardVariants}
      // whileHover runs on the compositor (transform) — no layout thrash, unlike changing `top`.
      whileHover={lift ? { y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`glass rounded-2xl transition-shadow duration-300 ${GLOW[glow]} ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
