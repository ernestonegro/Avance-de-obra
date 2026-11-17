export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200 ${className}`} aria-hidden />
}

export function SkeletonTarjetaAvance() {
  return (
    <div className="space-y-3 rounded-2xl border-l-[6px] border-neutral-200 bg-white p-4 shadow-sm ring-1 ring-neutral-200" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
      <Skeleton className="aspect-[16/10] w-full rounded-xl" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}
