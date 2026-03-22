import { Skeleton } from "@/components/ui/skeleton"

/** Cartão alinhado ao feed de publicações profissionais na home. */
export function HomeFeedPostSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex min-w-0 gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 shrink-0 rounded-full" />
      </div>
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex gap-4 border-t border-gray-100 px-4 py-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  )
}

export function HomeFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="space-y-0 py-2"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="A carregar publicações"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="py-4">
          <HomeFeedPostSkeleton />
        </div>
      ))}
    </div>
  )
}
