import { useCallback } from "react";
import { api } from "../lib/api";
import { useResource } from "./useResource";

/** Same shape as useClan: one stable fetcher per clan tag (see the note there). */
export function useWar(clanTag: string) {
  const fetcher = useCallback((force: boolean) => api.getCurrentWar(clanTag, force), [clanTag]);
  return useResource(fetcher);
}
