import { Skeleton } from "@/components/ui/skeleton"

/** Skeleton alinhado ao cartão de profissional em categoria-profissional. */
export function ProfessionalCardSkeleton() {
  return (
    <article
      className="w-full max-w-[280px] rounded-md border border-gray-200 bg-white p-4"
      aria-hidden
    >
      <div className="flex flex-col items-center text-center">
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="mt-3 h-4 w-32" />
        <Skeleton className="mt-2 h-3 w-28" />
        <div className="mt-2 w-full space-y-1.5">
          <Skeleton className="mx-auto h-3 w-full max-w-[200px]" />
          <Skeleton className="mx-auto h-3 w-4/5 max-w-[160px]" />
        </div>
        <Skeleton className="mt-2 h-3 w-24" />
        <Skeleton className="mt-3 h-4 w-20" />
        <Skeleton className="mt-3 h-7 w-full rounded-md" />
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
      className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 justify-items-center"
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
