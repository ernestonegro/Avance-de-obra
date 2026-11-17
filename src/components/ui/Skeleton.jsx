export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200 ${className}`} aria-hidden />
}

export function SkeletonTarjetaAvance() {
  return (
    <div className="space-y-3 rounded-2xl border-2 border-neutral-200 p-4" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}
