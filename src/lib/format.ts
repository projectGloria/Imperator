const nf = new Intl.NumberFormat("en-US");

export const fmtNum = (n: number | null | undefined) => (n == null ? "—" : nf.format(n));

export const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

/** "just now", "23s ago", "4m ago" — cache freshness label. */
export function ago(fromMs: number, nowMs: number): string {
  const s = Math.max(0, Math.floor((nowMs - fromMs) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

/** API role ids → in-game labels ("admin" is the API's legacy name for Elder). */
export function roleLabel(role?: string | null): string {
  switch (role) {
    case "leader": return "Leader";
    case "coLeader": return "Co-Leader";
    case "admin": return "Elder";
    case "member": return "Member";
    default: return "—";
  }
}
