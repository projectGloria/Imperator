import { api } from "../lib/api";
import { useResource } from "./useResource";

// Module-level fetchers → stable identities, so useResource's effect runs once.
const fetchPlayer = (force: boolean) => api.getPlayer(force);
// Game data is a local file; "force" is meaningless but Refresh re-reads it so edits show up.
const fetchGameData = () => api.getGameData();
// Local file too; refetched after an import so every page sees the new snapshot.
const fetchVillage = () => api.getVillage();

export const usePlayer = () => useResource(fetchPlayer);
export const useGameData = () => useResource(fetchGameData);
export const useVillage = () => useResource(fetchVillage);
