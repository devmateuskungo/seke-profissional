"use client"

import Link from "next/link"
import { CalendarDays, FileSearch, Loader2, Send } from "lucide-react"
import { useProfileMarketplaceData } from "@/components/profile/profile-marketplace-section"
import type { AccountRole } from "@/lib/use-account-role"

interface HomeSidebarMetricsProps {
  role: AccountRole
  userId: string | null
}

function MetricCell({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg bg-gray-50 px-2.5 py-2">
      <p className="text-[10px] font-medium text-gray-500 truncate leading-tight">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900 leading-tight">
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

/** Valores mock até existir API de estatísticas de agendamentos. */
function getAppointmentMetrics(role: AccountRole) {
  if (role === "professional") {
    return {
      total: 24,
      secondary: { label: "Pendentes", value: 4 },
      completed: 18,
      cancelled: 2,
    }
  }
  return {
    total: 6,
    secondary: { label: "Agendados", value: 2 },
    completed: 3,
    cancelled: 1,
  }
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
    <div className="bg-white p-4 rounded-md border border-gray-200">
      <div className="flex items-start gap-2.5 mb-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#dceffd] text-[#2b81e5]">
          <Icon className="size-3.5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          <p className="text-xs text-gray-500 leading-tight mt-0.5">{description}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4 text-gray-400">
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
          className="mt-2.5 block text-center text-xs font-medium text-[#2b81e5] hover:text-[#2b81e5]/80 transition-colors"
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

  const appointmentMetrics = getAppointmentMetrics(role)

  const appointmentItems = [
    { label: "Total", value: appointmentMetrics.total },
    {
      label: appointmentMetrics.secondary.label,
      value: appointmentMetrics.secondary.value,
    },
    { label: "Concluídos", value: appointmentMetrics.completed },
    { label: "Cancelados", value: appointmentMetrics.cancelled },
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
        metrics={appointmentItems}
        emptyMetrics={appointmentItems}
      />
      <MetricsCard
        title={isProfessional ? "Propostas" : "Solicitações"}
        description={
          isProfessional
            ? "Resumo das suas propostas"
            : "Resumo das suas solicitações"
        }
        icon={isProfessional ? Send : FileSearch}
        linkHref={isProfessional ? "/propostas" : "/solicitacoes"}
        linkLabel={isProfessional ? "Ver propostas" : "Ver solicitações"}
        loading={loading}
        metrics={proposalItems}
        emptyMetrics={proposalEmpty}
      />
    </>
  )
}
