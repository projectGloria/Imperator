// The ONLY place the frontend talks to Rust. Every command is typed here so pages
// never call `invoke` with stringly-typed names/args.
import { invoke } from "@tauri-apps/api/core";
import type { AppError } from "../types/errors";
import type { Cached, Player } from "../types/player";
import type { ConfigStatus, GameData } from "../types/gameData";
import type { Clan } from "../types/clan";
import type { War } from "../types/war";
import type { VillageSnapshot } from "../types/village";

/** Narrow whatever `invoke` rejected with into our AppError union. */
export function toAppError(e: unknown): AppError {
  if (e && typeof e === "object" && "kind" in e && typeof (e as { kind: unknown }).kind === "string") {
    return e as AppError;
  }
  // Non-AppError rejections: IPC failure, a panicking command, a missing capability.
  return { kind: "api", status: 0, message: typeof e === "string" ? e : "Unexpected error talking to the backend." };
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    throw toAppError(e);
  }
}

// Tauri maps camelCase JS arg keys onto the snake_case Rust parameter names.
export const api = {
  getPlayer: (forceRefresh = false) => call<Cached<Player>>("get_player", { forceRefresh }),
  getClan: (clanTag: string, forceRefresh = false) => call<Cached<Clan>>("get_clan", { clanTag, forceRefresh }),
  getCurrentWar: (clanTag: string, forceRefresh = false) =>
    call<Cached<War>>("get_current_war", { clanTag, forceRefresh }),
  getConfigStatus: () => call<ConfigStatus>("get_config_status"),
  saveConfig: (apiKey: string, playerTag: string) => call<string>("save_config", { apiKey, playerTag }),
  getGameData: () => call<GameData>("get_game_data"),
  /** null = nothing imported yet. */
  getVillage: () => call<VillageSnapshot | null>("get_village"),
  importVillage: (json: string) => call<VillageSnapshot>("import_village", { json }),
  getPlannerPrefs: () => call<{ order: string[] }>("get_planner_prefs"),
  savePlannerPrefs: (order: string[]) => call<void>("save_planner_prefs", { order }),
  getPublicIp: () => call<string>("get_public_ip"),
};
