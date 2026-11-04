import { useMemo } from "react";
import { motion } from "framer-motion";
import { Lock, Shield, ShieldHalf, Star, Swords, Timer, type LucideIcon } from "lucide-react";
import type { War, WarMember } from "../types/war";
import { useWar } from "../hooks/useWar";
import { useNow } from "../hooks/useNow";
import { outcome, parseApiTime, PHASE_LABEL, side, type Outcome, type Side } from "../lib/war";
import { fmtCountdown } from "../lib/format";
import { GlassCard } from "../components/GlassCard";
import { ImageSlot } from "../components/ImageSlot";
import { pickIcon } from "../lib/art";
import { ProgressBar } from "../components/ProgressBar";
import { RefreshBar } from "../components/RefreshBar";
import { ErrorBanner, ErrorScreen } from "../components/ErrorScreen";
import { Skeleton } from "../components/Skeleton";

/** Same ownership model as ClanPage: own resource, own RefreshBar. */
export function WarPage({ clanTag, myTag }: { clanTag: string; myTag: string }) {
  const war = useWar(clanTag);
  const w = war.data?.data;
  const blocking = war.error && (!w || war.error.kind === "invalidIp");

  const subtitle = w?.clan?.name && w.opponent?.name
    ? `${PHASE_LABEL[w.state] ?? w.state} · ${w.clan.name} vs ${w.opponent.name}`
    : clanTag;

  return (
    <>
      <RefreshBar
        title="War"
        subtitle={subtitle}
        fetchedAt={war.data?.fetchedAt}
        fromCache={war.data?.fromCache}
        refreshing={war.refreshing}
        onRefresh={war.refresh}
      />
      {war.error && !blocking && <ErrorBanner error={war.error} onRetry={war.refresh} />}
      {blocking ? (
        <ErrorScreen error={war.error!} onRetry={war.retry} />
      ) : !w ? (
        <WarSkeleton />
      ) : (
        <WarView war={w} myTag={myTag} />
      )}
    </>
  );
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

function WarView({ war, myTag }: { war: War; myTag: string }) {
  // Derived once per fetched war object: sorting 2×50 members isn't free, and the
  // countdown's 1s tick lives in a leaf so it never re-runs this.
  const sides = useMemo(
    () => (war.clan && war.opponent ? { us: side(war, war.clan), them: side(war, war.opponent) } : null),
    [war],
  );

  if (war.state === "warLogPrivate") {
    return (
      <EmptyState
        icon={Lock}
        title="War log is private"
        body="The API only exposes the current war when the clan's war log is public. A Leader or Co-Leader can change that in the clan settings."
      />
    );
  }
  if (war.state === "notInWar" || !sides) {
    return (
      <EmptyState
        icon={Swords}
        title="Not in a war"
        body="Your clan isn't in a regular war right now. Clan War League wars aren't reported by this endpoint, so during CWL this also shows as not in war."
      />
    );
  }

  const perMember = war.attacksPerMember ?? 2;
  // During preparation nobody can attack yet, so attack slots would just be noise.
  const showAttacks = war.state !== "preparation";
  const result = outcome(sides.us.clan, sides.them.clan);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <Scoreboard war={war} us={sides.us} them={sides.them} result={result} />
      <div className="grid grid-cols-2 gap-6">
        <Lineup title="Your clan" side={sides.us} perMember={perMember} showAttacks={showAttacks} myTag={myTag} tone="gold" />
        <Lineup title="Opponent" side={sides.them} perMember={perMember} showAttacks={showAttacks} myTag={myTag} tone="elixir" />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------------
// Scoreboard

const OUTCOME_COPY: Record<Outcome, { ended: string; live: string; cls: string }> = {
  win: { ended: "Victory", live: "Winning", cls: "bg-maxed-400/15 text-maxed-400 ring-maxed-400/30" },
  lose: { ended: "Defeat", live: "Losing", cls: "bg-danger-400/15 text-danger-400 ring-danger-400/30" },
  draw: { ended: "Draw", live: "Tied", cls: "bg-white/10 text-white/80 ring-white/20" },
};

function Scoreboard({ war, us, them, result }: { war: War; us: Side; them: Side; result: Outcome }) {
  const maxStars = (war.teamSize || us.lineup.length) * 3;
  const copy = OUTCOME_COPY[result];

  return (
    <GlassCard glow="gold" lift={false} className="relative overflow-hidden p-6">
      {/* Two soft colour washes so the halves read as "us vs them" at a glance. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-gold-400/[0.07] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-elixir-500/[0.08] to-transparent" />

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-6">
        <SideScore s={us} maxStars={maxStars} align="left" />

        <div className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-widest text-white/60">
            {PHASE_LABEL[war.state] ?? war.state}
          </span>
          <span className="font-display text-3xl font-black tracking-widest text-white/25">VS</span>
          <PhaseTimer war={war} />
          {/* No result during prep: 0–0 isn't "tied" in any meaningful sense. */}
          {war.state !== "preparation" && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.3 }}
              className={`rounded-lg px-3 py-1 text-sm font-semibold ring-1 ${copy.cls}`}
            >
              {war.state === "warEnded" ? copy.ended : copy.live}
            </motion.span>
          )}
          <span className="text-xs text-white/40">
            {war.teamSize} vs {war.teamSize} · {war.attacksPerMember ?? 2} attacks each
          </span>
        </div>

        <SideScore s={them} maxStars={maxStars} align="right" />
      </div>
    </GlassCard>
  );
}

function SideScore({ s, maxStars, align }: { s: Side; maxStars: number; align: "left" | "right" }) {
  const right = align === "right";
  const tone = right ? "elixir" : "gold";
  return (
    <div className={`flex flex-col gap-4 ${right ? "items-end text-right" : ""}`}>
      <div className={`flex items-center gap-3 ${right ? "flex-row-reverse" : ""}`}>
        {/* Opponents change every war, so they share one generic file. */}
        <ImageSlot art={[right ? "opponent-badge" : "clan-badge"]} src={pickIcon(s.clan.badgeUrls)} icon={Shield} alt="Clan badge" size={56} tone={right ? "elixir" : "gold"} />
        <div className="min-w-0">
          <div className="truncate font-display text-xl font-bold">{s.clan.name}</div>
          <div className="select-text text-xs text-white/45">
            {s.clan.tag} · Level {s.clan.clanLevel}
          </div>
        </div>
      </div>

      <div className={`flex items-end gap-2 ${right ? "flex-row-reverse" : ""}`}>
        <Star size={34} className={right ? "text-elixir-300" : "text-gold-400"} fill="currentColor" />
        <motion.span
          // Keyed by value so a refresh that changes the score replays the pop.
          key={s.clan.stars}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`font-display text-5xl font-black leading-none tabular-nums ${right ? "text-elixir-300" : "text-gold-gradient"}`}
        >
          {s.clan.stars}
        </motion.span>
        <span className="pb-1 text-sm text-white/40 tabular-nums">/ {maxStars}</span>
      </div>

      <div className="w-full max-w-72 space-y-3">
        <Meter label="Destruction" value={`${s.clan.destructionPercentage.toFixed(2)}%`} ratio={s.clan.destructionPercentage / 100} tone={tone} />
        <Meter
          label="Attacks used"
          value={`${s.attacksUsed} / ${s.attacksTotal}`}
          ratio={s.attacksTotal ? s.attacksUsed / s.attacksTotal : 0}
          tone={tone}
        />
      </div>
    </div>
  );
}

function Meter({ label, value, ratio, tone }: { label: string; value: string; ratio: number; tone: "gold" | "elixir" }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-white/50">{label}</span>
        <span className="tabular-nums text-white/80">{value}</span>
      </div>
      <ProgressBar value={ratio} tone={tone} />
    </div>
  );
}

/**
 * The only part of the page that ticks. Isolated so the 1s re-render covers one
 * line of text instead of two 50-row lineups.
 */
function PhaseTimer({ war }: { war: War }) {
  const now = useNow(1000);
  const target =
    war.state === "preparation" ? parseApiTime(war.startTime) : war.state === "inWar" ? parseApiTime(war.endTime) : null;

  if (war.state === "warEnded") {
    const end = parseApiTime(war.endTime);
    return end ? <span className="text-xs text-white/50">Ended {new Date(end).toLocaleString()}</span> : null;
  }
  if (target == null) return null;

  return (
    <div className="flex flex-col items-center">
      <span className="text-[11px] uppercase tracking-widest text-white/45">
        {war.state === "preparation" ? "Battle starts in" : "War ends in"}
      </span>
      <span className="flex items-center gap-1.5 font-display text-xl font-bold tabular-nums text-gold-200">
        <Timer size={16} /> {fmtCountdown(target - now)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------------
// Lineups

function Lineup({
  title, side: s, perMember, showAttacks, myTag, tone,
}: {
  title: string;
  side: Side;
  perMember: number;
  showAttacks: boolean;
  myTag: string;
  tone: "gold" | "elixir";
}) {
  const remaining = s.attacksTotal - s.attacksUsed;
  return (
    <GlassCard lift={false} className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 p-4">
        <h2 className={`font-display text-lg font-semibold ${tone === "gold" ? "text-gold-200" : "text-elixir-300"}`}>{title}</h2>
        {showAttacks && (
          <span className="text-xs tabular-nums text-white/45">
            {remaining > 0 ? `${remaining} attacks left` : "All attacks used"}
          </span>
        )}
      </div>
      <div>
        {s.lineup.map((m, i) => (
          <LineupRow key={m.tag} m={m} pos={i + 1} index={i} perMember={perMember} showAttacks={showAttacks} isMe={m.tag === myTag} />
        ))}
      </div>
    </GlassCard>
  );
}

function LineupRow({
  m, pos, index, perMember, showAttacks, isMe,
}: {
  m: WarMember;
  pos: number;
  index: number;
  perMember: number;
  showAttacks: boolean;
  isMe: boolean;
}) {
  // Pad to the per-member limit so unused attacks render as empty slots.
  const slots = Array.from({ length: perMember }, (_, k) => m.attacks[k] ?? null);
  const def = m.bestOpponentAttack;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0, transition: { delay: Math.min(index, 25) * 0.015 } }}
      className={`grid grid-cols-[28px_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-white/[0.04] px-4 py-2 text-sm transition-colors hover:bg-white/[0.04] ${
        isMe ? "bg-gold-400/[0.07] shadow-[inset_3px_0_0_var(--color-gold-400)]" : ""
      }`}
    >
      <span className="text-white/45 tabular-nums">{pos}</span>
      <div className="min-w-0">
        <div className="truncate font-medium">
          {m.name}
          {isMe && <span className="ml-2 text-[10px] uppercase tracking-wider text-gold-300">you</span>}
        </div>
        <div className="text-xs text-white/40">TH{m.townhallLevel}</div>
      </div>

      {showAttacks ? (
        <div className="flex gap-1.5">
          {slots.map((a, k) =>
            a ? (
              <div key={k} title={`${a.destructionPercentage}% destruction`} className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 ring-1 ring-white/10">
                <Stars n={a.stars} />
                <span className="w-8 text-right text-[11px] tabular-nums text-white/55">{a.destructionPercentage}%</span>
              </div>
            ) : (
              <div key={k} className="grid h-[26px] w-[86px] place-items-center rounded-lg border border-dashed border-white/10 text-[11px] text-white/30">
                unused
              </div>
            ),
          )}
        </div>
      ) : (
        <span />
      )}

      {/* Defence: the best attack this base has taken. */}
      <div className="flex w-16 items-center justify-end gap-1" title={def ? `Best attack against: ${def.stars} stars, ${def.destructionPercentage}%` : "Not attacked yet"}>
        {showAttacks && def ? (
          <>
            <ShieldHalf size={13} className="text-white/35" />
            <Stars n={def.stars} dim />
          </>
        ) : showAttacks ? (
          <ShieldHalf size={13} className="text-maxed-400/70" />
        ) : null}
      </div>
    </motion.div>
  );
}

function Stars({ n, dim = false }: { n: number; dim?: boolean }) {
  return (
    <span className="flex">
      {[0, 1, 2].map((k) => (
        <Star
          key={k}
          size={12}
          // Filled vs outline instead of hiding stars, so 1 star still reads as "1 of 3".
          fill={k < n ? "currentColor" : "none"}
          className={k < n ? (dim ? "text-white/60" : "text-gold-400") : "text-white/20"}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------------

function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass mx-auto mt-10 max-w-md rounded-3xl p-8 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/5 text-white/60">
        <Icon size={26} />
      </div>
      <h2 className="mt-4 font-display text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-white/60">{body}</p>
    </motion.div>
  );
}

function WarSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64" />
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-[420px]" />
        <Skeleton className="h-[420px]" />
      </div>
    </div>
  );
}

