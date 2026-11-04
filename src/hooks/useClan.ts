import { useCallback } from "react";
import { api } from "../lib/api";
import { useResource } from "./useResource";

/**
 * useResource needs a stable fetcher; useCallback keyed on the tag gives one per clan.
 * If the tag changes (you switch clans) the fetcher identity changes → effect refetches,
 * and the request-id guard in useResource discards any response for the old tag.
 */
export function useClan(clanTag: string) {
  const fetcher = useCallback((force: boolean) => api.getClan(clanTag, force), [clanTag]);
  return useResource(fetcher);
}
