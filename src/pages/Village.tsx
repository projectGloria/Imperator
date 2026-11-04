import { useActionState, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Castle, ClipboardPaste, Hammer, HelpCircle, Hourglass, TriangleAlert, Upload, X } from "lucide-react";
import type { GameData } from "../types/gameData";
import type { VillageSnapshot } from "../types/village";
import type { Resource } from "../hooks/useResource";
import { api, toAppError } from "../lib/api";
import { ago } from "../lib/format";
import { groupByType, makeLookup, sameTag, upgrades, type Group, type VillageSide } from "../lib/village";
import { useNow } from "../hooks/useNow";
import { GlassCard } from "../components/GlassCard";
import { UpgradeList, Unverified } from "../components/UpgradeList";
import { ErrorBanner } from "../components/ErrorScreen";
import { ImageSlot } from "../components/ImageSlot";
import { Skeleton } from "../components/Skeleton";

export function VillagePage({
  village,
  gameData,
  playerTag,
}: {
  village: Resource<VillageSnapshot | null>;
  gameData: GameData | null;
  playerTag: string;
}) {
  // "Replace snapshot" panel. The form itself shows unconditionally when nothing's imported,
  // so this flag only matters once a snapshot exists — no effect needed to sync them.
  const [importing, setImporting] = useState(false);
  const snap = village.data;
  const showForm = importing || (!village.loading && !snap);

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Village</h1>
          <div className="mt-1 text-sm text-white/55">From the game's village export — a snapshot, not live data.</div>
        </div>
        {snap && !importing && (
          <button
            type="button"
            onClick={() => setImporting(true)}
            className="glass flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gold-200 transition hover:text-gold-300"
          >
            <Upload size={15} /> Import new export
          </button>
        )}
      </div>

      {village.error && <ErrorBanner error={village.error} note={`village.json: ${village.error.message}`} onRetry={village.retry} />}

      <AnimatePresence initial={false}>
        {showForm && (
          <ImportForm
            key="import"
            canCancel={!!snap}
            onCancel={() => setImporting(false)}
            onImported={() => {
              setImporting(false);
              village.refresh(); // re-read from disk so Dashboard and this page share one source
            }}
          />
        )}
      </AnimatePresence>

      {village.loading ? (
        <Skeleton className="h-64" />
      ) : snap ? (
        <SnapshotView snap={snap} gameData={gameData} playerTag={playerTag} />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------------

function ImportForm({ canCancel, onCancel, onImported }: { canCancel: boolean; onCancel: () => void; onImported: () => void }) {
  // Form action: pending + error without useState/try/finally plumbing. The textarea is
  // uncontrolled — a 10 KB string in React state would re-render on every keystroke for nothing.
  const [error, submit, pending] = useActionState(async (_prev: string | null, form: FormData) => {
    try {
      await api.importVillage(String(form.get("json") ?? ""));
      onImported();
      return null;
    } catch (e) {
      return toAppError(e).message;
    }
  }, null);

  return (
    <motion.form
      action={submit}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-6 overflow-hidden"
    >
      <div className="glass rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-gold-400/10 text-gold-300">
              <ClipboardPaste size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Paste your village export</h2>
              <p className="text-sm text-white/55">Copy the village data JSON from the game's settings and paste it below.</p>
            </div>
          </div>
          {canCancel && (
            <button type="button" aria-label="Cancel import" onClick={onCancel} className="rounded-lg p-1.5 text-white/45 hover:bg-white/5 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>
        <textarea
          name="json"
          required
          spellCheck={false}
          placeholder='{"tag":"#…","timestamp":…,"buildings":[…]}'
          className="mt-4 h-40 w-full resize-y rounded-xl border border-white/10 bg-ink-950/70 p-3 font-mono text-xs text-white/80 outline-none focus:border-gold-400/60"
        />
        <div className="mt-3 flex items-center justify-between gap-4">
          <span className="text-sm text-danger-400">{error}</span>
          <button
            type="submit"
            disabled={pending}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:brightness-110 disabled:opacity-60"
          >
            <Upload size={15} /> {pending ? "Importing…" : canCancel ? "Replace snapshot" : "Import"}
          </button>
        </div>
      </div>
    </motion.form>
  );
}

// ---------------------------------------------------------------------------------

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

function SnapshotView({ snap, gameData, playerTag }: { snap: VillageSnapshot; gameData: GameData | null; playerTag: string }) {
  const [side, setSide] = useState<VillageSide>("home");
  const exp = snap.export;

  // One derivation per (snapshot, game-data) pair. The countdown tick lives inside
  // UpgradeList / SnapshotBanner, so it never re-groups 40 building types per second.
  const derived = useMemo(() => {
    const lookup = makeLookup(gameData);
    return {
      upgrades: upgrades(exp, lookup),
      home: { buildings: groupByType(exp.buildings, lookup), traps: groupByType(exp.traps, lookup) },
      builder: { buildings: groupByType(exp.buildings2, lookup), traps: groupByType(exp.traps2, lookup) },
    };
  }, [exp, gameData]);

  const sideUpgrades = derived.upgrades.filter((u) => u.side === side);
  const groups = derived[side];

  return (
    <div className="space-y-6">
      <SnapshotBanner snap={snap} mismatch={!sameTag(exp.tag, playerTag)} playerTag={playerTag} />

      <SideTabs side={side} onChange={setSide} />

      {/* Keyed by side so switching re-runs the stagger instead of morphing cards. */}
      <motion.div key={side} variants={stagger} initial="hidden" animate="show" className="space-y-6">
        <GlassCard lift={false} className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Upgrades in progress</h2>
            <span className="text-xs text-white/45">{sideUpgrades.length} running at export time</span>
          </div>
          {sideUpgrades.length ? (
            <UpgradeList items={sideUpgrades} />
          ) : (
            <p className="py-6 text-center text-sm text-white/50">Nothing was upgrading when this export was taken.</p>
          )}
        </GlassCard>

        <Section title="Buildings" groups={groups.buildings} />
        {groups.traps.length > 0 && <Section title="Traps" groups={groups.traps} />}
      </motion.div>
    </div>
  );
}

function SnapshotBanner({ snap, mismatch, playerTag }: { snap: VillageSnapshot; mismatch: boolean; playerTag: string }) {
  // 30s is plenty for an "exported 2h ago" label; the per-second tick is only for countdowns.
  const now = useNow(30_000);
  const exportedAt = snap.export.timestamp * 1000;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-elixir-500/20 bg-elixir-500/[0.07] px-4 py-3 text-sm">
        <Camera size={16} className="shrink-0 text-elixir-300" />
        <span className="text-white/80">
          <span className="font-semibold text-elixir-300">Snapshot</span> exported {new Date(exportedAt).toLocaleString()} (
          {ago(exportedAt, now)}) · imported {new Date(snap.importedAt).toLocaleString()}
        </span>
        <span className="ml-auto select-text text-xs text-white/45">{snap.export.tag}</span>
      </div>
      {mismatch && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200">
          <TriangleAlert size={15} className="shrink-0" />
          This export is for {snap.export.tag}, but the app is set up for {playerTag}.
        </div>
      )}
    </div>
  );
}

function SideTabs({ side, onChange }: { side: VillageSide; onChange: (s: VillageSide) => void }) {
  const tabs: [VillageSide, string][] = [["home", "Home Village"], ["builder", "Builder Base"]];
  return (
    <div className="glass inline-flex rounded-xl p-1">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`relative rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${side === id ? "text-ink-950" : "text-white/60 hover:text-white"}`}
        >
          {side === id && (
            <motion.span
              layoutId="village-tab"
              className="absolute inset-0 rounded-lg bg-gradient-to-b from-gold-300 to-gold-500"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

function Section({ title, groups }: { title: string; groups: Group[] }) {
  const total = groups.reduce((n, g) => n + g.total, 0);
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <span className="text-xs text-white/45">{groups.length} types · {total} total</span>
      </div>
      <motion.div variants={stagger} className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
        {groups.map((g) => (
          <GroupCard key={g.id} g={g} />
        ))}
      </motion.div>
    </section>
  );
}

function GroupCard({ g }: { g: Group }) {
  const top = g.levels[0]?.lvl ?? 0;
  return (
    <GlassCard glow="gold" className="p-4">
      <div className="flex items-start gap-3">
        <ImageSlot
          name={g.known ? g.name : undefined}
          level={top || undefined}
          icon={g.known ? Castle : HelpCircle}
          size={44}
          tone={g.known ? "gold" : "neutral"}
        />
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-semibold ${g.known ? "" : "text-white/50"}`} title={g.known ? undefined : "Add this ID to ids.names in data/game-data.json"}>
            {g.name}
            {g.unverified && <Unverified />}
          </div>
          <div className="text-xs text-white/45">
            ×{g.total}
            {g.upgrading > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-gold-300">
                <Hammer size={11} /> {g.upgrading} upgrading
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-gold-400/10 px-2 py-0.5 font-display text-sm font-bold tabular-nums text-gold-300">
          {top === 0 ? "New" : `Lv ${top}`}
        </span>
      </div>
      {/* One chip per level present. Only worth showing when the type isn't uniform. */}
      {g.levels.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {g.levels.map((l) => (
            <span key={l.lvl} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] tabular-nums text-white/70 ring-1 ring-white/10">
              {l.lvl === 0 ? "building" : `Lv ${l.lvl}`} ×{l.cnt}
            </span>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

/** Dashboard card: soonest home-village timers, or a pointer to the Village page. */
export function ActiveUpgradesCard({ snap, gameData, onOpenVillage }: { snap: VillageSnapshot | null; gameData: GameData | null; onOpenVillage: () => void }) {
  const list = useMemo(
    () => (snap ? upgrades(snap.export, makeLookup(gameData)).filter((u) => u.side === "home") : []),
    [snap, gameData],
  );

  return (
    <GlassCard lift={false} className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Active upgrades</h2>
        {snap && <span className="text-[11px] uppercase tracking-wider text-elixir-300">snapshot</span>}
      </div>
      {snap && list.length > 0 ? (
        <>
          <div className="mt-2">
            <UpgradeList items={list} limit={6} />
          </div>
          {list.length > 6 && (
            <button type="button" onClick={onOpenVillage} className="mt-2 text-xs text-elixir-300 hover:underline">
              +{list.length - 6} more on the Village page
            </button>
          )}
        </>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-elixir-500/10 text-elixir-300">
            <Hourglass size={26} />
          </div>
          <p className="text-sm text-white/60">
            {snap ? "Nothing was upgrading in your last village export." : "The API doesn't expose upgrade timers. Import your village export to see live countdowns."}
          </p>
          <button type="button" onClick={onOpenVillage} className="text-sm text-elixir-300 hover:underline">
            {snap ? "Import a newer export" : "Go to Village"}
          </button>
        </div>
      )}
    </GlassCard>
  );
}
