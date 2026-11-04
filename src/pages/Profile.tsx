import { motion } from "framer-motion";
import { Gift, HandHeart, Shield, Swords, ShieldCheck, User } from "lucide-react";
import type { Player } from "../types/player";
import { CATEGORIES, CATEGORY_LABEL, type Roster } from "../lib/units";
import { fmtNum, roleLabel } from "../lib/format";
import { GlassCard } from "../components/GlassCard";
import { ImageSlot } from "../components/ImageSlot";
import { UnitGrid } from "../components/UnitGrid";

export function Profile({ player, roster }: { player: Player; roster: Roster }) {
  const league = player.leagueTier?.name ?? player.league?.name ?? "Unranked";
  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="show">
        <GlassCard glow="gold" lift={false} className="flex items-center gap-6 p-6">
          <ImageSlot icon={User} alt="Player avatar" size={72} />
          <div className="min-w-0 flex-1">
            <div className="font-display text-2xl font-bold">{player.name}</div>
            <div className="mt-0.5 select-text text-sm text-white/55">{player.tag}</div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/70">
              <span>XP level <b className="text-white">{player.expLevel}</b></span>
              <span>TH <b className="text-gold-300">{player.townHallLevel}</b></span>
              <span>League <b className="text-white">{league}</b></span>
              <span>War pref <b className="text-white">{player.warPreference === "in" ? "In" : player.warPreference === "out" ? "Out" : "—"}</b></span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Stat icon={Shield} label={player.clan ? `${player.clan.name} · ${roleLabel(player.role)}` : "No clan"} />
            <Stat icon={Swords} label={`${fmtNum(player.attackWins)} attack wins`} />
            <Stat icon={Gift} label={`${fmtNum(player.donations)} donated`} />
            <Stat icon={HandHeart} label={`${fmtNum(player.donationsReceived)} received`} />
            <Stat icon={ShieldCheck} label={`${fmtNum(player.defenseWins)} defense wins`} />
          </div>
        </GlassCard>
      </motion.div>

      {CATEGORIES.map((cat) => (
        <UnitGrid key={cat} title={CATEGORY_LABEL[cat]} units={roster[cat]} />
      ))}
    </div>
  );
}

function Stat({ icon: Icon, label }: { icon: typeof Shield; label: string }) {
  return (
    <span className="flex items-center gap-2 text-white/70">
      <Icon size={14} className="text-gold-300" /> {label}
    </span>
  );
}
