"use client"

import type { ReactNode } from "react"
import { HomeSidebarMetrics } from "@/components/home/home-sidebar-metrics"
import { HomeUserProfileCard } from "@/components/home/home-user-profile-card"
import { useAccountRole } from "@/lib/use-account-role"
import { useAuth } from "@/lib/use-auth"
import { useViewerUserId } from "@/lib/viewer-user-id"

function LanguagesCard() {
  return (
    <div className="rounded-2xl border border-border/45 bg-card p-5 text-card-foreground">
      <div className="mb-3 border-b border-border/40 pb-3">
        <h3 className="text-base font-semibold text-foreground">Idiomas</h3>
      </div>
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Português
        </span>
      </div>
    </div>
  )
}

export function PostDetailShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { role, isLoading: roleLoading } = useAccountRole()
  const userId = useViewerUserId()

  const showSidebar =
    !authLoading && isAuthenticated && !roleLoading && role != null

  return (
    <div className="mx-auto grid grid-cols-1 gap-6 p-4 lg:grid-cols-12">
      {showSidebar && role ? (
        <aside className="order-1 space-y-6 lg:col-span-3">
          <HomeUserProfileCard />
          <HomeSidebarMetrics role={role} userId={userId} />
          <LanguagesCard />
        </aside>
      ) : null}

      <div
        className={
          showSidebar
            ? "order-2 min-w-0 lg:col-span-9"
            : "mx-auto w-full max-w-2xl min-w-0 lg:col-span-12"
        }
      >
        {children}
      </div>
    </div>
  )
}
