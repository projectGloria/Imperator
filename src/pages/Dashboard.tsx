import { motion } from "framer-motion";
import { Castle, Medal, Shield, Star, Trophy } from "lucide-react";
import type { Player } from "../types/player";
import type { GameData } from "../types/gameData";
import type { VillageSnapshot } from "../types/village";
import { ActiveUpgradesCard } from "./Village";
import { CATEGORIES, CATEGORY_LABEL, completion, type Roster } from "../lib/units";
import { fmtNum, roleLabel } from "../lib/format";
import { GlassCard } from "../components/GlassCard";
import { ProgressRing } from "../components/ProgressRing";
import { StatTile } from "../components/StatTile";
import { ImageSlot } from "../components/ImageSlot";
import { leagueIcon, pickIcon, townHallArt } from "../lib/art";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const RING_TONE = { heroes: "dark", troops: "elixir", spells: "elixir", siegeMachines: "gold" } as const;

export function Dashboard({
  player, roster, gameData, village, onOpenVillage,
}: {
  player: Player;
  roster: Roster;
  gameData: GameData | null;
  village: VillageSnapshot | null;
  onOpenVillage: () => void;
}) {
  // All derived from props each render — no useState/useEffect mirror to go stale.
  const all = CATEGORIES.flatMap((c) => roster[c]);
  const overall = completion(all);
  const league = player.leagueTier?.name ?? player.league?.name ?? "Unranked";

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {gameData && player.townHallLevel > gameData.maxTownHall && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200">
          game-data.json was written for up to TH{gameData.maxTownHall}; caps for TH{player.townHallLevel} are likely missing or stale.
        </div>
      )}

      {/* Hero banner: Town Hall + overall completion. */}
      <GlassCard glow="gold" lift={false} className="overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="relative flex items-center gap-8">
          <div className="flex items-center gap-5">
            <ImageSlot art={townHallArt(player.townHallLevel)} icon={Castle} alt={`Town Hall ${player.townHallLevel}`} size={88} tone="gold" />
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50">Town Hall</div>
              <div className="text-gold-gradient font-display text-6xl font-black leading-none">{player.townHallLevel}</div>
              {player.townHallWeaponLevel ? (
                <div className="mt-1 text-xs text-white/50">Weapon level {player.townHallWeaponLevel}</div>
              ) : null}
            </div>
          </div>

          <div className="h-20 w-px bg-white/10" />

          <div className="min-w-0 flex-1">
            <div className="font-display text-2xl font-bold">{player.name}</div>
            <div className="mt-0.5 text-sm text-white/55 select-text">{player.tag} · XP level {player.expLevel}</div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Chip icon={Shield}>{player.clan ? `${player.clan.name} · ${roleLabel(player.role)}` : "No clan"}</Chip>
              <Chip icon={Medal}>{league}</Chip>
            </div>
          </div>

          <ProgressRing value={overall.ratio} size={140} stroke={12} tone="gold" label="Overall" />
        </div>
      </GlassCard>

      <div className="grid grid-cols-4 gap-4">
        <StatTile icon={Trophy} label="Trophies" value={fmtNum(player.trophies)} sub={`Best ${fmtNum(player.bestTrophies)}`} tone="gold" />
        <StatTile icon={Star} label="War stars" value={fmtNum(player.warStars)} tone="gold" />
        <StatTile
          icon={Medal}
          label="League"
          value={<span className="text-lg">{league}</span>}
          tone="elixir"
          media={<ImageSlot src={leagueIcon(player)} icon={Medal} alt={league} size={48} tone="elixir" />}
        />
        <StatTile
          icon={Shield}
          media={<ImageSlot art={["clan-badge"]} src={pickIcon(player.clan?.badgeUrls)} icon={Shield} alt="Clan badge" size={48} tone="dark" />}
          label="Clan"
          value={<span className="text-lg">{player.clan?.name ?? "—"}</span>}
          sub={player.clan ? `Level ${player.clan.clanLevel} · ${player.clan.tag}` : undefined}
          tone="dark"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <GlassCard lift={false} className="col-span-2 p-6">
          <h2 className="font-display text-lg font-semibold">Completion for TH{player.townHallLevel}</h2>
          <p className="text-xs text-white/45">Home village only · levels vs. caps in data/game-data.json</p>
          <div className="mt-5 grid grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => {
              const c = completion(roster[cat]);
              return (
                <div key={cat} className="flex flex-col items-center gap-2">
                  <ProgressRing value={c.ratio} size={104} stroke={9} tone={RING_TONE[cat]} />
                  <div className="text-sm font-medium">{CATEGORY_LABEL[cat]}</div>
                  <div className="text-xs text-white/45 tabular-nums">{c.maxed}/{c.total} maxed</div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <ActiveUpgradesCard snap={village} gameData={gameData} onOpenVillage={onOpenVillage} />
      </div>
    </motion.div>
  );
}

function Chip({ icon: Icon, children }: { icon: typeof Shield; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-white/75">
      <Icon size={12} /> {children}
    </span>
  );
}
