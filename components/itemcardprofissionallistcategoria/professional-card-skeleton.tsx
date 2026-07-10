import { Skeleton } from "@/components/ui/skeleton"

/** Skeleton alinhado ao cartão de profissional em categoria-profissional. */
export function ProfessionalCardSkeleton() {
  return (
    <article
      className="flex w-full max-w-none flex-col overflow-hidden rounded-xl border border-gray-200 bg-white sm:max-w-[300px]"
      aria-hidden
    >
      <div className="flex items-start gap-3 p-4 pb-3">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex gap-1.5 px-4">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="space-y-2 px-4 py-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="mt-auto border-t border-gray-100 bg-gray-50/70 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </article>
  )
}

export function ProfessionalCardSkeletonGrid({
  count = 6,
}: {
  count?: number
}) {
  return (
    <div
      className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="A carregar profissionais"
    >
      {Array.from({ length: count }).map((_, index) => (
        <ProfessionalCardSkeleton key={index} />
      ))}
    </div>
  )
}
