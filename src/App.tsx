import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TitleBar } from "./components/TitleBar";
import { Sidebar, type PageId } from "./components/Sidebar";
import { RefreshBar } from "./components/RefreshBar";
import { ErrorBanner, ErrorScreen } from "./components/ErrorScreen";
import { DashboardSkeleton, GridSkeleton } from "./components/Skeleton";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { Setup } from "./pages/Setup";
import { ClanPage } from "./pages/Clan";
import { Users } from "lucide-react";
import { useGameData, usePlayer } from "./hooks/usePlayer";
import { useResource } from "./hooks/useResource";
import { api } from "./lib/api";
import { buildRoster } from "./lib/units";

const fetchConfigStatus = () => api.getConfigStatus();

export default function App() {
  const config = useResource(fetchConfigStatus);

  return (
    <div className="app-backdrop flex h-full flex-col overflow-hidden">
      <TitleBar />
      <div className="min-h-0 flex-1">
        {config.loading ? null : config.data?.configured ? (
          <Shell onNeedsSetup={config.retry} />
        ) : config.data ? (
          <Setup status={config.data} onDone={config.retry} />
        ) : config.error ? (
          <ErrorScreen error={config.error} onRetry={config.retry} />
        ) : null}
      </div>
    </div>
  );
}

const TITLES: Record<PageId, string> = {
  dashboard: "Dashboard", profile: "Profile", clan: "Clan", war: "War", village: "Village", planner: "Planner",
};

function NoClan() {
  return (
    <div className="glass mx-auto mt-16 max-w-md rounded-3xl p-8 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/5 text-white/60">
        <Users size={26} />
      </div>
      <h2 className="mt-4 font-display text-xl font-bold">You're not in a clan</h2>
      <p className="mt-1 text-sm text-white/60">Join a clan in-game, then hit Refresh.</p>
    </div>
  );
}

/** Mounted only once config exists, so the player fetch never fires unconfigured. */
function Shell({ onNeedsSetup }: { onNeedsSetup: () => void }) {
  const [page, setPage] = useState<PageId>("dashboard");
  const player = usePlayer();
  const gameData = useGameData();

  // Memo keyed on the two data objects: these only change identity on a real fetch,
  // so page switches and the 1s freshness tick don't rebuild the roster.
  const roster = useMemo(
    () => (player.data ? buildRoster(player.data.data, gameData.data) : null),
    [player.data, gameData.data],
  );

  const refresh = useCallback(() => {
    player.refresh();
    gameData.refresh(); // re-read data/game-data.json so hand edits apply without restart
  }, [player.refresh, gameData.refresh]);

  const p = player.data?.data;
  const err = player.error;
  // invalidIp / notConfigured always get the full screen — they need action, not a banner.
  const blocking = err && (!p || err.kind === "invalidIp" || err.kind === "notConfigured");
  const ownsRefresh = page === "clan" && !!p?.clan;

  return (
    <div className="flex h-full">
      <Sidebar active={page} onNavigate={setPage} />
      <main className="min-w-0 flex-1 overflow-y-auto px-8 py-7">
        {gameData.error && (
          <ErrorBanner
            error={gameData.error}
            note={`game-data.json: ${gameData.error.message} — bars fall back to API max levels.`}
            onRetry={gameData.retry}
          />
        )}
        {err && !blocking && <ErrorBanner error={err} onRetry={player.refresh} />}

        <AnimatePresence mode="wait">
          <motion.div
            // Key by page (and by "state" so skeleton → content also cross-fades).
            key={`${page}-${blocking ? "err" : p ? "ok" : "load"}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Clan (and later War) own their resource + RefreshBar; everything else
                refreshes the player. While the player is loading/failed, the clan tag
                isn't known yet, so those pages fall back to the player bar too. */}
            {!(ownsRefresh && p && !blocking) && (
              <RefreshBar
                title={TITLES[page]}
                subtitle={p ? `${p.name} · ${p.tag}` : undefined}
                fetchedAt={player.data?.fetchedAt}
                fromCache={player.data?.fromCache}
                refreshing={player.refreshing}
                onRefresh={refresh}
              />
            )}
            {blocking ? (
              <ErrorScreen error={err} onRetry={err.kind === "notConfigured" ? onNeedsSetup : player.retry} />
            ) : !p || !roster ? (
              page === "profile" ? <GridSkeleton /> : <DashboardSkeleton />
            ) : page === "clan" ? (
              p.clan ? <ClanPage clanTag={p.clan.tag} myTag={p.tag} /> : <NoClan />
            ) : page === "dashboard" ? (
              <Dashboard player={p} roster={roster} gameData={gameData.data} />
            ) : (
              <Profile player={p} roster={roster} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
