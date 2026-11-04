export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden />;
}

/** Matches the real Dashboard layout so content doesn't jump when data lands. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="col-span-2 h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4">
        {Array.from({ length: count }, (_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    </div>
  );
}
