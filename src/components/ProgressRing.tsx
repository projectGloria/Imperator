import { useEffect, useId } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

type Tone = "gold" | "elixir" | "dark" | "maxed";

const STOPS: Record<Tone, [string, string]> = {
  gold: ["#ffe08a", "#d99a1e"],
  elixir: ["#f0abfc", "#c04cff"],
  dark: ["#b39ddb", "#6d4c8f"],
  maxed: ["#6ee7b7", "#10b981"],
};

interface Props {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  tone?: Tone;
  label?: string;
  /** Override the centre text (defaults to the animated percentage). */
  children?: React.ReactNode;
}

/**
 * SVG ring: stroke-dasharray = circumference, dashoffset animates from full to (1-value).
 * The number is driven by a MotionValue → text updates bypass React renders entirely
 * (Framer writes textContent directly), so 60fps counting costs zero reconciliations.
 */
export function ProgressRing({ value, size = 120, stroke = 10, tone = "gold", label, children }: Props) {
  // Unique gradient id per ring (several rings share one document). React 19 ids contain
  // chars like «» that are awkward inside url(#…), so strip to [A-Za-z0-9_-].
  const id = `ring${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));

  const progress = useMotionValue(0);
  const offset = useTransform(progress, (p) => c * (1 - p));
  const text = useTransform(progress, (p) => `${Math.round(p * 100)}%`);

  useEffect(() => {
    const controls = animate(progress, clamped, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [clamped, progress]);

  const [a, b] = STOPS[tone];
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={a} />
            <stop offset="100%" stopColor={b} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ strokeDashoffset: offset, filter: `drop-shadow(0 0 6px ${b}88)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          {children ?? <motion.div className="font-display text-xl font-bold tabular-nums">{text}</motion.div>}
          {label && <div className="mt-0.5 text-[10px] uppercase tracking-widest text-white/50">{label}</div>}
        </div>
      </div>
    </div>
  );
}
