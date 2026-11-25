"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, FileSearch, Loader2, Send } from "lucide-react"
import { useProfileMarketplaceData } from "@/components/profile/profile-marketplace-section"
import { fetchBookings } from "@/lib/bookings-client"
import type { AccountRole } from "@/lib/use-account-role"

interface HomeSidebarMetricsProps {
  role: AccountRole
  userId: string | null
}

interface BookingMetrics {
  total: number
  confirmed: number
  pending: number
  cancelled: number
}

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

function normalizeBookingStatus(status?: string): "confirmed" | "pending" | "cancelled" {
  const normalized = status?.toLowerCase().trim() ?? ""
  if (normalized.includes("cancel")) return "cancelled"
  if (
    normalized.includes("confirm") ||
    normalized.includes("done") ||
    normalized.includes("completed") ||
    normalized.includes("matched")
  ) {
    return "confirmed"
  }
  return "pending"
}

function MetricCell({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg bg-muted px-2.5 py-2">
      <p className="text-[10px] font-medium text-muted-foreground truncate leading-tight">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground leading-tight">
        {value}
      </p>
    </div>
  )
}

function getStatusCount(
  byStatus: Record<string, { count?: number }> | undefined,
  key: string
): number {
  return byStatus?.[key]?.count ?? 0
}

function MetricsCard({
  title,
  description,
  icon: Icon,
  linkHref,
  linkLabel,
  loading,
  metrics,
  emptyMetrics,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  linkHref?: string
  linkLabel?: string
  loading?: boolean
  metrics: { label: string; value: string | number }[] | null
  emptyMetrics: { label: string; value: number }[]
}) {
  const items = metrics ?? emptyMetrics

  return (
    <div className="bg-card p-4 rounded-md border border-border">
      <div className="flex items-start gap-2.5 mb-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-3.5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          <p className="text-xs text-muted-foreground leading-tight mt-0.5">{description}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {items.map((item) => (
            <MetricCell key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      )}

      {linkHref && linkLabel ? (
        <Link
          href={linkHref}
          className="mt-2.5 block text-center text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  )
}

export function HomeSidebarMetrics({ role, userId }: HomeSidebarMetricsProps) {
  const isProfessional = role === "professional"
  const { loading, clientStats, professionalStats } = useProfileMarketplaceData(
    isProfessional,
    userId
  )
  const [bookingMetrics, setBookingMetrics] = useState<BookingMetrics | null>(
    null
  )
  const [bookingsLoading, setBookingsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const token = getSessionToken()
      if (!token) {
        if (!cancelled) setBookingsLoading(false)
        return
      }

      const result = await fetchBookings({ token, page: 1, limit: 100 })
      if (cancelled) return

      if (result.success) {
        const metrics: BookingMetrics = {
          total: result.data.bookings.length,
          confirmed: 0,
          pending: 0,
          cancelled: 0,
        }
        for (const booking of result.data.bookings) {
          metrics[normalizeBookingStatus(booking.status)] += 1
        }
        setBookingMetrics(metrics)
      } else {
        setBookingMetrics(null)
      }

      setBookingsLoading(false)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [userId])

  const appointmentItems = bookingMetrics
    ? [
        { label: "Total", value: bookingMetrics.total },
        { label: "Confirmados", value: bookingMetrics.confirmed },
        { label: "Pendentes", value: bookingMetrics.pending },
        { label: "Cancelados", value: bookingMetrics.cancelled },
      ]
    : null

  const appointmentEmpty = [
    { label: "Total", value: 0 },
    { label: "Confirmados", value: 0 },
    { label: "Pendentes", value: 0 },
    { label: "Cancelados", value: 0 },
  ]

  const proposalItems = isProfessional
    ? professionalStats
      ? [
          { label: "Enviadas", value: professionalStats.totalProposals },
          { label: "Pendentes", value: professionalStats.pendingRequests },
          { label: "Aceites", value: professionalStats.acceptedProposals },
          {
            label: "Rejeitadas",
            value:
              professionalStats.proposalStats.find(
                (s) => s._id.toLowerCase() === "rejected"
              )?.count ?? 0,
          },
        ]
      : null
    : clientStats
      ? [
          { label: "Total", value: clientStats.totalRequests },
          {
            label: "Abertas",
            value: getStatusCount(clientStats.byStatus, "open"),
          },
          {
            label: "Concluídas",
            value: getStatusCount(clientStats.byStatus, "matched"),
          },
          {
            label: "Encerradas",
            value: getStatusCount(clientStats.byStatus, "closed"),
          },
        ]
      : null

  const proposalEmpty = isProfessional
    ? [
        { label: "Enviadas", value: 0 },
        { label: "Pendentes", value: 0 },
        { label: "Aceites", value: 0 },
        { label: "Rejeitadas", value: 0 },
      ]
    : [
        { label: "Total", value: 0 },
        { label: "Abertas", value: 0 },
        { label: "Concluídas", value: 0 },
        { label: "Encerradas", value: 0 },
      ]

  return (
    <>
      <MetricsCard
        title="Agendamentos"
        description={
          isProfessional
            ? "Resumo da sua agenda de serviços"
            : "Resumo dos seus agendamentos"
        }
        icon={CalendarDays}
        linkHref={isProfessional ? "/profissional/agenda" : "/agendamentos"}
        linkLabel="Ver agendamentos"
        loading={bookingsLoading}
        metrics={appointmentItems}
        emptyMetrics={appointmentEmpty}
      />
      <MetricsCard
        title={isProfessional ? "Propostas" : "Solicitações"}
        description={
          isProfessional
            ? "Resumo das suas propostas"
            : "Resumo das suas solicitações"
        }
        icon={isProfessional ? Send : FileSearch}
        linkHref={isProfessional ? "/profissional/propostas" : "/solicitacoes"}
        linkLabel={isProfessional ? "Ver propostas" : "Ver solicitações"}
        loading={loading}
        metrics={proposalItems}
        emptyMetrics={proposalEmpty}
      />
    </>
  )
}
