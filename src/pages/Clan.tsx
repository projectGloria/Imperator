import { useDeferredValue, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Award, Gift, Globe, Search, Shield, Swords, Trophy, Users, X } from "lucide-react";
import type { Clan, ClanMember } from "../types/clan";
import { useClan } from "../hooks/useClan";
import { CLAN_TYPE_LABEL, DEFAULT_DIR, filterMembers, sortMembers, type Sort, type SortKey } from "../lib/clan";
import { fmtNum, roleLabel } from "../lib/format";
import { GlassCard } from "../components/GlassCard";
import { ImageSlot } from "../components/ImageSlot";
import { leagueIcon, pickIcon } from "../lib/art";
import { RefreshBar } from "../components/RefreshBar";
import { StatTile } from "../components/StatTile";
import { ErrorBanner, ErrorScreen } from "../components/ErrorScreen";
import { Skeleton } from "../components/Skeleton";

/**
 * Owns its own resource + RefreshBar: the clan is fetched only when this page is
 * open, and Refresh here refetches the clan, not the player.
 */
export function ClanPage({ clanTag, myTag }: { clanTag: string; myTag: string }) {
  const clan = useClan(clanTag);
  const c = clan.data?.data;
  const blocking = clan.error && (!c || clan.error.kind === "invalidIp");

  return (
    <>
      <RefreshBar
        title="Clan"
        subtitle={c ? `${c.name} · ${c.tag}` : clanTag}
        fetchedAt={clan.data?.fetchedAt}
        fromCache={clan.data?.fromCache}
        refreshing={clan.refreshing}
        onRefresh={clan.refresh}
      />
      {clan.error && !blocking && <ErrorBanner error={clan.error} onRetry={clan.refresh} />}
      {blocking ? (
        <ErrorScreen error={clan.error!} onRetry={clan.retry} />
      ) : !c ? (
        <ClanSkeleton />
      ) : (
        <ClanView clan={c} myTag={myTag} />
      )}
    </>
  );
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

function ClanView({ clan, myTag }: { clan: Clan; myTag: string }) {
  const warRecord = clan.isWarLogPublic
    ? `${fmtNum(clan.warWins)}W · ${fmtNum(clan.warTies)}T · ${fmtNum(clan.warLosses)}L`
    : `${fmtNum(clan.warWins)} wins · log private`;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <GlassCard glow="gold" lift={false} className="flex items-center gap-6 p-6">
        <ImageSlot art={["clan-badge"]} src={pickIcon(clan.badgeUrls)} icon={Shield} alt="Clan badge" size={80} tone="gold" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-2xl font-bold">{clan.name}</h2>
            <span className="select-text text-sm text-white/50">{clan.tag}</span>
          </div>
          {clan.description && (
            <p className="mt-1 line-clamp-2 select-text text-sm text-white/60">{clan.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Chip>Level {clan.clanLevel}</Chip>
            <Chip>{CLAN_TYPE_LABEL[clan.type] ?? clan.type}</Chip>
            {clan.location && <Chip icon={Globe}>{clan.location.name}</Chip>}
            <Chip icon={Trophy}>
              Requires {fmtNum(clan.requiredTrophies)}
              {clan.requiredTownhallLevel ? ` · TH${clan.requiredTownhallLevel}+` : ""}
            </Chip>
            {clan.warFrequency && <Chip icon={Swords}>War: {clan.warFrequency}</Chip>}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-4 gap-4">
        <StatTile icon={Users} label="Members" value={`${clan.members}/50`} tone="elixir" />
        <StatTile icon={Trophy} label="Clan points" value={fmtNum(clan.clanPoints)} tone="gold" />
        <StatTile
          icon={Swords}
          label="War record"
          value={<span className="text-lg">{warRecord}</span>}
          sub={clan.warWinStreak ? `${clan.warWinStreak} win streak` : undefined}
          tone="dark"
        />
        <StatTile icon={Award} label="War league" value={<span className="text-lg">{clan.warLeague?.name ?? "—"}</span>} tone="gold" />
      </div>

      <MemberTable members={clan.memberList} myTag={myTag} />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------------

const COLS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "rank", label: "#" },
  { key: "name", label: "Member" },
  { key: "role", label: "Role" },
  { key: "townHall", label: "TH", align: "right" },
  { key: "trophies", label: "Trophies", align: "right" },
  { key: "donations", label: "Donated", align: "right" },
  { key: "received", label: "Received", align: "right" },
];
// One template shared by header and rows so columns always line up.
const GRID = "grid grid-cols-[44px_minmax(0,1fr)_110px_56px_110px_110px_110px] items-center gap-3 px-4";

function MemberTable({ members, myTag }: { members: ClanMember[]; myTag: string }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "rank", dir: 1 });

  // Typing stays instant: React renders the input with the urgent `query`, then
  // re-renders the (heavier, animated) list with the deferred value at lower priority.
  const deferredQuery = useDeferredValue(query);
  const rows = useMemo(
    () => sortMembers(filterMembers(members, deferredQuery), sort),
    [members, deferredQuery, sort],
  );

  const onSort = (key: SortKey) =>
    // Functional update: reads the latest sort even if two clicks batch together.
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: DEFAULT_DIR[key] }));

  return (
    <GlassCard lift={false} className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-white/5 p-4">
        <h2 className="font-display text-lg font-semibold">Members</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/45 tabular-nums">
            {rows.length === members.length ? `${members.length} members` : `${rows.length} of ${members.length}`}
          </span>
          <label className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or tag"
              spellCheck={false}
              className="w-64 rounded-xl border border-white/10 bg-ink-950/60 py-2 pl-9 pr-8 text-sm outline-none transition focus:border-gold-400/60"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/40 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </label>
        </div>
      </div>

      <div className={`${GRID} border-b border-white/5 py-2.5 text-[11px] uppercase tracking-wider text-white/45`}>
        {COLS.map((col) => {
          const active = sort.key === col.key;
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => onSort(col.key)}
              aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
              className={`flex items-center gap-1 transition-colors hover:text-white ${
                col.align === "right" ? "justify-end" : ""
              } ${active ? "text-gold-300" : ""}`}
            >
              {col.label}
              {active && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
            </button>
          );
        })}
      </div>

      <div className="relative">
        {/* popLayout: leaving rows are taken out of flow immediately, so the rest slide up
            via `layout` instead of waiting for the exit animation to finish. */}
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((m, i) => (
            <MemberRow key={m.tag} member={m} index={i} isMe={m.tag === myTag} />
          ))}
        </AnimatePresence>
        {rows.length === 0 && (
          <div className="py-12 text-center text-sm text-white/45">No members match “{deferredQuery}”.</div>
        )}
      </div>
    </GlassCard>
  );
}

const ROLE_STYLE: Record<string, string> = {
  leader: "bg-gold-400/15 text-gold-300 ring-gold-400/30",
  coLeader: "bg-elixir-500/15 text-elixir-300 ring-elixir-500/30",
  admin: "bg-dark-500/25 text-dark-300 ring-dark-500/40",
  member: "bg-white/5 text-white/60 ring-white/10",
};

function MemberRow({ member: m, index, isMe }: { member: ClanMember; index: number; isMe: boolean }) {
  return (
    <motion.div
      // `layout` animates position changes on sort/filter (FLIP via transforms, no reflow per frame).
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      // Delay only on the entrance; capped so the 50th row doesn't wait a full second.
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 25) * 0.015 } }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ layout: { type: "spring", stiffness: 500, damping: 40 } }}
      className={`${GRID} border-b border-white/[0.04] py-2.5 text-sm transition-colors hover:bg-white/[0.04] ${
        isMe ? "bg-gold-400/[0.07] shadow-[inset_3px_0_0_var(--color-gold-400)]" : ""
      }`}
    >
      <span className="text-white/45 tabular-nums">{m.clanRank}</span>
      <div className="min-w-0">
        <div className="truncate font-medium">
          {m.name}
          {isMe && <span className="ml-2 text-[10px] uppercase tracking-wider text-gold-300">you</span>}
        </div>
        <div className="select-text text-xs text-white/40">{m.tag}</div>
      </div>
      <span>
        <span className={`rounded-md px-2 py-0.5 text-xs ring-1 ${ROLE_STYLE[m.role] ?? ROLE_STYLE.member}`}>
          {roleLabel(m.role)}
        </span>
      </span>
      <span className="text-right tabular-nums text-white/80">{m.townHallLevel ?? "—"}</span>
      <span className="flex items-center justify-end gap-1.5 tabular-nums">
        {/* League icon when the API has one; small size, lazy-loaded (50 rows). */}
        <ImageSlot src={leagueIcon(m, "small")} icon={Trophy} alt={m.leagueTier?.name ?? m.league?.name ?? "League"} size={20} tone="gold" />
        {fmtNum(m.trophies)}
      </span>
      <span className="flex items-center justify-end gap-1.5 tabular-nums text-emerald-300">
        <Gift size={13} /> {fmtNum(m.donations)}
      </span>
      <span className="text-right tabular-nums text-white/65">{fmtNum(m.donationsReceived)}</span>
    </motion.div>
  );
}

function Chip({ icon: Icon, children }: { icon?: typeof Shield; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-white/75">
      {Icon && <Icon size={12} />} {children}
    </span>
  );
}

function ClanSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-[480px]" />
    </div>
  );
}
