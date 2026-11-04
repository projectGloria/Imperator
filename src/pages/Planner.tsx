import { useMemo, useState } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import {
  Bomb, BrickWall, Castle, Coins, Crown, FlaskConical, Shield, Swords, type LucideIcon,
  Check, ChevronDown, ChevronUp, CircleCheck, Construction, GripVertical, Hammer, HelpCircle, ListOrdered, Lock, TriangleAlert, TrendingUp,
} from "lucide-react";
import type { GameData } from "../types/gameData";
import type { VillageSnapshot } from "../types/village";
import { api, toAppError } from "../lib/api";
import { ago, fmtNum } from "../lib/format";
import { buildPlan, resolveOrder, type CategoryPlan, type PlanRow } from "../lib/planner";
import { useResource } from "../hooks/useResource";
import { GlassCard } from "../components/GlassCard";
import { ProgressBar } from "../components/ProgressBar";
import { StatTile } from "../components/StatTile";
import { Unverified } from "../components/UpgradeList";
import { Skeleton } from "../components/Skeleton";
import { ImageSlot, type SlotTone } from "../components/ImageSlot";

// Category → default tile colour, matching the Profile cards (heroes dark, lab elixir, buildings gold).
// Line-icon fallback per category, for anything without an official image.
const CATEGORY_ICON: Record<string, LucideIcon> = {
  heroes: Crown, lab: FlaskConical, defenses: Shield, army: Swords, traps: Bomb, resources: Coins, walls: BrickWall, other: Hammer,
};
const TONE: Record<string, SlotTone> = { heroes: "dark", lab: "elixir", traps: "neutral", walls: "neutral", other: "neutral" };

// Module-level → stable fetcher identity for useResource.
const fetchPrefs = () => api.getPlannerPrefs();

export function PlannerPage({
  snap, gameData, onOpenVillage,
}: {
  snap: VillageSnapshot | null;
  gameData: GameData | null;
  onOpenVillage: () => void;
}) {
  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Planner</h1>
        <div className="mt-1 text-sm text-white/55">
          {snap ? <SnapshotAge exportedAt={snap.export.timestamp * 1000} /> : "Computed from your village import."}
        </div>
      </div>
      {!snap ? (
        <div className="glass mx-auto mt-10 max-w-md rounded-3xl p-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/5 text-white/60">
            <ListOrdered size={26} />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">No village snapshot yet</h2>
          <p className="mt-1 text-sm text-white/60">The planner works from your village export.</p>
          <button type="button" onClick={onOpenVillage} className="mt-4 text-sm text-elixir-300 hover:underline">
            Go to Village
          </button>
        </div>
      ) : !gameData ? (
        <Skeleton className="h-96" />
      ) : (
        <PlannerView snap={snap} gameData={gameData} />
      )}
    </>
  );
}

function SnapshotAge({ exportedAt }: { exportedAt: number }) {
  // Rendered once per page view; no ticking needed for "3h ago" here.
  return <>Based on the snapshot exported {new Date(exportedAt).toLocaleString()} ({ago(exportedAt, Date.now())}).</>;
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

function PlannerView({ snap, gameData }: { snap: VillageSnapshot; gameData: GameData }) {
  const plan = useMemo(() => buildPlan(snap.export, gameData), [snap, gameData]);
  const prefs = useResource(fetchPrefs);

  // Derived-with-override: `draft` holds only what you changed this session; until then the
  // order comes from planner.json → defaultOrder. No effect copying prefs into state, so a
  // late-arriving prefs load can't clobber a reorder you've already made.
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const order = useMemo(
    () => resolveOrder(draft ?? prefs.data?.order, gameData.planner.defaultOrder, plan.categories.keys()),
    [draft, prefs.data, gameData.planner.defaultOrder, plan.categories],
  );

  const persist = (next: string[]) => {
    api.savePlannerPrefs(next).then(
      () => setSaveError(null),
      (e) => setSaveError(toAppError(e).message),
    );
  };
  const move = (id: string, delta: -1 | 1) => {
    const i = order.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= order.length) return;
    const next = order.slice();
    [next[i], next[j]] = [next[j]!, next[i]!];
    setDraft(next);
    persist(next);
  };

  const cats = order.map((id) => plan.categories.get(id)!).filter(Boolean);
  const totals = cats.reduce(
    (t, c) => ({
      steps: t.steps + c.stepsLeft,
      missing: t.missing + c.missing,
      done: t.done + c.rows.filter((r) => r.done).length,
      count: t.count + c.rows.filter((r) => !r.locked).length,
    }),
    { steps: 0, missing: 0, done: 0, count: 0 },
  );

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200">
        <TriangleAlert size={15} className="shrink-0" />
        Max levels and building counts come from data/game-data.json, which is unverified. Treat these numbers as a guide.
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatTile icon={Construction} label="Town Hall" value={`TH${plan.th}`} sub="from the snapshot" tone="gold" />
        <StatTile icon={TrendingUp} label="Level-ups left" value={fmtNum(totals.steps)} sub="across everything built" tone="elixir" />
        <StatTile icon={Hammer} label="Not built yet" value={fmtNum(totals.missing)} sub="allowed at your TH" tone="dark" />
        <StatTile icon={CircleCheck} label="Maxed for TH" value={`${totals.done}/${totals.count}`} sub="item types" tone="gold" />
      </div>

      <div className="grid grid-cols-[300px_minmax(0,1fr)] items-start gap-6">
        <GlassCard lift={false} className="sticky top-0 p-4">
          <h2 className="px-1 font-display text-lg font-semibold">Priority</h2>
          <p className="mb-3 px-1 text-xs text-white/45">Drag or use the arrows. Saved to data/planner.json.</p>
          {/* Reorder animates siblings out of the way via layout (FLIP), so dragging feels physical. */}
          <Reorder.Group axis="y" values={order} onReorder={setDraft} className="space-y-1.5">
            {order.map((id, i) => {
              const c = plan.categories.get(id);
              return (
                <PriorityItem
                  key={id}
                  id={id}
                  rank={i + 1}
                  label={c?.label ?? id}
                  left={(c?.stepsLeft ?? 0) + (c?.missing ?? 0)}
                  first={i === 0}
                  last={i === order.length - 1}
                  onMove={move}
                  // Framer reads handler props at event time, so this sees the post-drag order.
                  onDrop={() => persist(order)}
                />
              );
            })}
          </Reorder.Group>
          {saveError && <p className="mt-3 px-1 text-xs text-danger-400">Couldn't save: {saveError}</p>}
        </GlassCard>

        <div className="space-y-6">
          {cats.filter((c) => c.rows.length > 0).map((c, i) => (
            <CategorySection key={c.id} c={c} rank={i + 1} />
          ))}
          {plan.noCap.length > 0 && (
            <GlassCard lift={false} className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
                <HelpCircle size={15} /> No cap data for TH{plan.th}. These are not counted.
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {plan.noCap.map((n, i) => (
                  <span key={i} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/55 ring-1 ring-white/10">{n.name}</span>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PriorityItem({
  id, rank, label, left, first, last, onMove, onDrop,
}: {
  id: string;
  rank: number;
  label: string;
  left: number;
  first: boolean;
  last: boolean;
  onMove: (id: string, d: -1 | 1) => void;
  onDrop: () => void;
}) {
  // Drag only from the grip, so the arrow buttons stay clickable without starting a drag.
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      whileDrag={{ scale: 1.03, boxShadow: "0 12px 30px -10px rgb(245 197 66 / 0.45)" }}
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-800/80 px-2 py-2 text-sm"
    >
      <button
        type="button"
        aria-label={`Drag ${label}`}
        onPointerDown={(e) => controls.start(e)}
        className="cursor-grab touch-none text-white/35 hover:text-white/70 active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <span className="w-4 text-center text-xs tabular-nums text-gold-300">{rank}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <span className={`text-xs tabular-nums ${left ? "text-white/50" : "text-maxed-400"}`}>{left ? left : <Check size={13} />}</span>
      <div className="flex flex-col">
        <button type="button" aria-label={`Move ${label} up`} disabled={first} onClick={() => onMove(id, -1)} className="text-white/40 hover:text-white disabled:opacity-20">
          <ChevronUp size={14} />
        </button>
        <button type="button" aria-label={`Move ${label} down`} disabled={last} onClick={() => onMove(id, 1)} className="text-white/40 hover:text-white disabled:opacity-20">
          <ChevronDown size={14} />
        </button>
      </div>
    </Reorder.Item>
  );
}

function CategorySection({ c, rank }: { c: CategoryPlan; rank: number }) {
  const work = c.rows.filter((r) => !r.done && !r.locked);
  const locked = c.rows.filter((r) => r.locked);
  const done = c.rows.filter((r) => r.done);

  return (
    // `layout` lets whole sections slide into their new position when the priority changes.
    <motion.section layout transition={{ type: "spring", stiffness: 400, damping: 36 }}>
      <GlassCard lift={false} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
          <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold">
            <span className="grid size-6 place-items-center rounded-md bg-gold-400/15 text-xs text-gold-300">{rank}</span>
            {c.label}
          </h2>
          <span className="text-xs tabular-nums text-white/50">
            {c.stepsLeft} level-ups{c.missing ? ` · ${c.missing} to build` : ""}
          </span>
        </div>

        <AnimatePresence initial={false}>
          {work.map((r) => (
            <Row key={r.key} r={r} />
          ))}
        </AnimatePresence>
        {work.length === 0 && <p className="px-5 py-4 text-sm text-maxed-400">Everything here is maxed for your TH.</p>}

        {locked.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 px-5 py-3 text-xs text-white/45">
            <Lock size={12} /> Not unlocked yet:
            {locked.map((r) => (
              <span key={r.key} className="rounded-md bg-white/5 px-1.5 py-0.5 text-white/55 ring-1 ring-white/10">{r.name}</span>
            ))}
          </div>
        )}
        {done.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 px-5 py-3 text-xs text-white/45">
            <CircleCheck size={12} className="text-maxed-400" /> Maxed:
            {done.map((r) => (
              <span key={r.key} className="rounded-md bg-maxed-400/10 px-1.5 py-0.5 text-maxed-400/90 ring-1 ring-maxed-400/20">
                {r.name}
              </span>
            ))}
          </div>
        )}
      </GlassCard>
    </motion.section>
  );
}

function Row({ r }: { r: PlanRow }) {
  // Average level vs cap, so a 6-of-7-maxed group reads as nearly done.
  const levelSum = r.levels.reduce((n, l) => n + l.lvl * l.cnt, 0);
  const progress = r.built ? levelSum / (r.cap * r.built) : 0;
  const lowest = r.levels.at(-1)?.lvl;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-[40px_minmax(0,1.3fr)_minmax(0,1fr)_120px] items-center gap-4 border-b border-white/[0.04] px-5 py-3 text-sm last:border-b-0"
    >
      <ImageSlot name={r.known ? r.name : undefined} level={r.levels[0]?.lvl || undefined} icon={r.known ? CATEGORY_ICON[r.category] ?? Castle : HelpCircle} size={40} tone={TONE[r.category] ?? "gold"} />
      <div className="min-w-0">
        <div className={`truncate font-medium ${r.known ? "" : "text-white/50"}`}>
          {r.name}
          {r.unverified && <Unverified />}
          {r.built > 1 && <span className="ml-1.5 text-xs text-white/40">×{r.built}</span>}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-white/45">
          {r.built === 0 ? (
            <span>none built</span>
          ) : r.levels.length === 1 ? (
            <span>Lv {lowest} → {r.cap}</span>
          ) : (
            <span>
              {r.levels.map((l) => `Lv ${l.lvl}×${l.cnt}`).join(" · ")} → {r.cap}
            </span>
          )}
          {r.upgrading > 0 && (
            <span className="inline-flex items-center gap-1 text-gold-300">
              <Hammer size={11} /> {r.upgrading} in progress
            </span>
          )}
          {r.capBelowLevel && <span className="text-amber-300">above listed cap, so check game-data</span>}
        </div>
      </div>
      <ProgressBar value={progress} tone="gold" />
      <div className="text-right text-xs tabular-nums">
        {r.stepsLeft > 0 && <div className="text-white/80">{r.stepsLeft} level-up{r.stepsLeft === 1 ? "" : "s"}</div>}
        {r.missing > 0 && <div className="text-elixir-300">{r.missing} to build</div>}
      </div>
    </motion.div>
  );
}
