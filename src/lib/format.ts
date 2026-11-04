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
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`; // village snapshots can be days old
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

/** Countdown: "2d 03h 14m" / "3h 04m 09s" / "12m 05s" / "45s". Seconds dropped past a day. */
export function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${p(h)}h ${p(m)}m`;
  if (h > 0) return `${h}h ${p(m)}m ${p(s)}s`;
  if (m > 0) return `${m}m ${p(s)}s`;
  return `${s}s`;
}
