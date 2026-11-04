import { api } from "../lib/api";
import { useResource } from "./useResource";

// Module-level fetchers → stable identities, so useResource's effect runs once.
const fetchPlayer = (force: boolean) => api.getPlayer(force);
// Game data is a local file; "force" is meaningless but Refresh re-reads it so edits show up.
const fetchGameData = () => api.getGameData();

export const usePlayer = () => useResource(fetchPlayer);
export const useGameData = () => useResource(fetchGameData);
