// The ONLY place the frontend talks to Rust. Every command is typed here so pages
// never call `invoke` with stringly-typed names/args.
import { invoke } from "@tauri-apps/api/core";
import type { AppError } from "../types/errors";
import type { Cached, Player } from "../types/player";
import type { ConfigStatus, GameData } from "../types/gameData";
import type { Clan } from "../types/clan";

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
  getConfigStatus: () => call<ConfigStatus>("get_config_status"),
  saveConfig: (apiKey: string, playerTag: string) => call<string>("save_config", { apiKey, playerTag }),
  getGameData: () => call<GameData>("get_game_data"),
  getPublicIp: () => call<string>("get_public_ip"),
};
