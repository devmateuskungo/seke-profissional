"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import type { AccountRole } from "@/lib/use-account-role"
import { HomeFindProfessionalCard } from "@/components/home/home-find-professional-card"
import { HomeUserProfileCard } from "@/components/home/home-user-profile-card"
import { HomeProfessionalAvailability } from "@/components/home/home-professional-availability"
import { HomeSidebarMetrics } from "@/components/home/home-sidebar-metrics"

export interface HomeSidebarPanelProps {
  open: boolean
  onClose: () => void
  isAuthenticated: boolean
  authLoading: boolean
  accountRole: AccountRole | null
  accountRoleLoading: boolean
  userId: string | null
}

export function HomeSidebarPanel({
  open,
  onClose,
  isAuthenticated,
  authLoading,
  accountRole,
  accountRoleLoading,
  userId,
}: HomeSidebarPanelProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const showAvailability =
    !authLoading &&
    isAuthenticated &&
    !accountRoleLoading &&
    accountRole === "professional"

  const showMetrics =
    !authLoading && isAuthenticated && !accountRoleLoading && !!accountRole

  return createPortal(
    <div
      className="fixed inset-0 z-100 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-sidebar-panel-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/40"
        aria-label="Fechar painel"
        onClick={onClose}
      />
      <aside className="absolute top-0 left-0 z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-300">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-4">
          <div>
            <h2
              id="home-sidebar-panel-title"
              className="text-lg font-semibold text-gray-900"
            >
              Resumo
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Profissionais, disponibilidade e métricas
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <HomeUserProfileCard onNavigate={onClose} />
          <HomeFindProfessionalCard
            variant="sidebar"
            onNavigate={onClose}
          />

          {showAvailability ? (
            <HomeProfessionalAvailability userId={userId} />
          ) : null}

          {showMetrics && accountRole ? (
            <HomeSidebarMetrics role={accountRole} userId={userId} />
          ) : null}
        </div>
      </aside>
    </div>,
    document.body
  )
}
