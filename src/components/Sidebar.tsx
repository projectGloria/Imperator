import { motion } from "framer-motion";
import { Castle, LayoutDashboard, ListOrdered, Swords, User, Users, type LucideIcon } from "lucide-react";

export type PageId = "dashboard" | "profile" | "clan" | "war" | "village" | "planner";

interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
  /** Not built yet (later steps) — rendered disabled so the layout is final from day one. */
  soon?: boolean;
}

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: User },
  { id: "clan", label: "Clan", icon: Users },
  { id: "war", label: "War", icon: Swords },
  { id: "village", label: "Village", icon: Castle, soon: true },
  { id: "planner", label: "Planner", icon: ListOrdered, soon: true },
];

export function Sidebar({ active, onNavigate }: { active: PageId; onNavigate: (p: PageId) => void }) {
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-white/5 bg-ink-950/40 p-3 backdrop-blur-xl">
      {NAV.map((item) => {
        const isActive = item.id === active;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            disabled={item.soon}
            onClick={() => onNavigate(item.id)}
            className={`group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
              isActive ? "text-ink-950" : item.soon ? "cursor-not-allowed text-white/25" : "text-white/65 hover:text-white"
            }`}
          >
            {isActive && (
              // Shared layoutId: Framer measures the old and new pill positions and
              // animates between them (FLIP), so the pill "slides" between items.
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 shadow-[0_0_24px_-4px_rgb(245_197_66/0.6)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            {!isActive && !item.soon && (
              <span className="absolute inset-0 rounded-xl bg-white/0 transition-colors group-hover:bg-white/5" />
            )}
            <Icon size={18} className="relative" />
            <span className="relative">{item.label}</span>
            {item.soon && <span className="relative ml-auto text-[10px] uppercase tracking-wider">soon</span>}
          </button>
        );
      })}
    </nav>
  );
}
