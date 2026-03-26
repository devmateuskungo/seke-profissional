import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"

function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-border/45 bg-card p-5 text-card-foreground ${className}`}
    >
      {children}
    </div>
  )
}

export function NetworkListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul
      className="divide-y divide-border/40"
      role="status"
      aria-live="polite"
      aria-label="A carregar lista"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-[min(100%,12rem)]" />
            <Skeleton className="h-3 w-24" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Layout alinhado à página de perfil (sidebar + capa + cartões). */
export function ProfileLayoutSkeleton() {
  return (
    <div
      className="font-sans text-foreground"
      role="status"
      aria-busy="true"
      aria-label="A carregar perfil"
    >
      <div className="mx-auto grid grid-cols-1 gap-6 p-4 lg:grid-cols-12">
        <aside className="space-y-6 lg:col-span-3">
          <Card>
            <Skeleton className="mb-4 h-4 w-28" />
            <div className="flex flex-col items-center py-6">
              <Skeleton className="mb-3 size-10 rounded-md" />
              <Skeleton className="h-3 w-40" />
            </div>
          </Card>
          <Card>
            <div className="mb-4 flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-4 rounded" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-9 w-full rounded-lg" />
          </Card>
          <Card>
            <Skeleton className="mb-4 h-4 w-20" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </Card>
        </aside>

        <div className="space-y-6 lg:col-span-9">
          <div className="overflow-hidden rounded-md border border-border/45 bg-card">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="relative px-4 pb-8 pt-0 md:px-8">
              <div className="-translate-y-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Skeleton className="size-32 shrink-0 rounded-3xl" />
                <div className="flex gap-2 sm:mb-2">
                  <Skeleton className="h-10 w-28 rounded-lg md:w-36" />
                  <Skeleton className="size-10 rounded-lg" />
                </div>
              </div>
              <div className="-mt-8 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-6 w-20 rounded-md" />
                </div>
                <Skeleton className="h-4 w-32" />
                <div className="flex flex-wrap gap-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          </div>

          <Card className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div className="space-y-6">
              <Skeleton className="h-5 w-28" />
              <div className="flex gap-8">
                <div className="space-y-2">
                  <Skeleton className="h-12 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex-1 space-y-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Skeleton key={n} className="h-2 w-full rounded-full" />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-3">
              <Skeleton className="size-20 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="size-8 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </Card>

          <Card className="min-h-[400px]">
            <div className="mb-8 flex justify-between">
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="mb-8 flex gap-4 border-b border-border/40 pb-1">
              {[1, 2, 3, 4].map((n) => (
                <Skeleton key={n} className="h-8 w-24" />
              ))}
            </div>
            <NetworkListSkeleton rows={5} />
          </Card>
        </div>
      </div>
    </div>
  )
}
