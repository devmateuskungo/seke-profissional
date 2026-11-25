"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  MapPin,
  RefreshCcw,
  Send,
  UserRound,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { HomeProfessionalAvailability } from "@/components/home/home-professional-availability"
import { fetchBookings } from "@/lib/bookings-client"
import { formatRelativeTimePt } from "@/lib/format-relative-time"
import { fetchMyMarketplaceServices } from "@/lib/marketplace-client"
import { fetchMyProposals } from "@/lib/proposals-client"
import {
  fetchProfessionalServiceRequestStats,
  fetchServiceRequests,
} from "@/lib/service-request-client"
import { useViewerUserId } from "@/lib/viewer-user-id"
import { cn } from "@/lib/utils"
import type { MarketplaceBookingListItem } from "@/types/booking"
import type { MarketplaceService } from "@/types/marketplace"
import type { ProfessionalSentProposalItem } from "@/types/proposal"
import type {
  MarketplaceServiceRequest,
  ProfessionalServiceRequestStats,
} from "@/types/service-request"

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

function formatKz(value: number): string {
  if (!Number.isFinite(value)) return "—"
  return `${value.toLocaleString("pt-PT")} Kz`
}

function formatBudget(min: string | number, max: string | number): string {
  const minNum = Number(min)
  const maxNum = Number(max)
  if (Number.isFinite(minNum) && Number.isFinite(maxNum)) {
    return `${minNum.toLocaleString("pt-PT")} – ${maxNum.toLocaleString("pt-PT")} Kz`
  }
  if (Number.isFinite(maxNum)) return `${maxNum.toLocaleString("pt-PT")} Kz`
  if (Number.isFinite(minNum)) return `${minNum.toLocaleString("pt-PT")} Kz`
  return "—"
}

function formatPriceValue(value: string | number): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return "—"
  return `${num.toLocaleString("pt-PT")} Kz`
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDayMonth(date: Date): { day: string; month: string } {
  return {
    day: new Intl.DateTimeFormat("pt-PT", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("pt-PT", { month: "short" })
      .format(date)
      .replace(".", "")
      .toUpperCase(),
  }
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function normalizeBookingStatus(status?: string): string {
  const normalized = status?.toLowerCase().trim() ?? ""
  if (normalized.includes("cancel")) return "cancelado"
  if (
    normalized.includes("done") ||
    normalized.includes("completed") ||
    normalized.includes("matched")
  ) {
    return "concluido"
  }
  if (normalized.includes("confirm")) return "confirmado"
  return "pendente"
}

function getBookingStatusBadge(status?: string) {
  const normalized = normalizeBookingStatus(status)
  if (normalized === "confirmado" || normalized === "concluido") {
    return {
      label: normalized === "confirmado" ? "Confirmado" : "Concluído",
      className: "border-emerald-100 bg-emerald-500/10 text-emerald-700",
    }
  }
  if (normalized === "cancelado") {
    return {
      label: "Cancelado",
      className: "border-red-100 bg-destructive/10 text-destructive",
    }
  }
  return {
    label: "Pendente",
    className: "border-amber-100 bg-amber-500/10 text-amber-700",
  }
}

function getProposalStatusBadge(status?: string) {
  const normalized = status?.toLowerCase() ?? "pending"
  if (normalized === "accepted") {
    return {
      label: "Aceite",
      className: "border-emerald-100 bg-emerald-500/10 text-emerald-700",
    }
  }
  if (normalized === "rejected") {
    return {
      label: "Rejeitada",
      className: "border-red-100 bg-destructive/10 text-destructive",
    }
  }
  return {
    label: "Pendente",
    className: "border-amber-100 bg-amber-500/10 text-amber-700",
  }
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string
  value: string | number
  detail: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  accent: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg bg-primary/10",
            accent
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {detail}
      </p>
    </div>
  )
}

function DashboardSection({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string
  description: string
  actionHref: string
  actionLabel: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <Link
          href={actionHref}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
        >
          {actionLabel}
          <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center">
      <Icon className="size-7 text-muted-foreground/50" aria-hidden />
      <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-0.5 max-w-xs text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="A carregar painel">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="space-y-5">
          <div className="h-56 animate-pulse rounded-xl bg-muted" />
          <div className="h-44 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  )
}

export function ProfessionalDashboard() {
  const userId = useViewerUserId()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookings, setBookings] = useState<MarketplaceBookingListItem[]>([])
  const [requests, setRequests] = useState<MarketplaceServiceRequest[]>([])
  const [services, setServices] = useState<MarketplaceService[]>([])
  const [proposals, setProposals] = useState<ProfessionalSentProposalItem[]>([])
  const [stats, setStats] = useState<ProfessionalServiceRequestStats | null>(null)

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const token = getSessionToken()
    if (!token) {
      setError("Sessão expirada. Inicie sessão novamente.")
      setLoading(false)
      return
    }

    if (options?.silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const [bookingsResult, statsResult, proposalsResult, servicesResult, requestsResult] =
        await Promise.all([
          fetchBookings({ token, page: 1, limit: 50 }),
          fetchProfessionalServiceRequestStats(token),
          fetchMyProposals(token),
          fetchMyMarketplaceServices(token),
          fetchServiceRequests({ token, page: 1, limit: 6 }),
        ])

      const errors: string[] = []

      if (bookingsResult.success) {
        setBookings(bookingsResult.data.bookings)
      } else {
        setBookings([])
        errors.push(bookingsResult.error)
      }

      if (statsResult.success) {
        setStats(statsResult.data)
      } else {
        setStats(null)
        errors.push(statsResult.error)
      }

      if (proposalsResult.success) {
        setProposals(proposalsResult.data)
      } else {
        setProposals([])
        errors.push(proposalsResult.error)
      }

      if (servicesResult.success) {
        setServices(servicesResult.data)
      } else {
        setServices([])
        errors.push(servicesResult.error)
      }

      if (requestsResult.success) {
        setRequests(requestsResult.data.requests)
      } else {
        setRequests([])
        errors.push(requestsResult.error)
      }

      setError(errors[0] ?? null)
    } catch {
      setError("Erro de ligação. Tente novamente.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const upcomingBookings = useMemo(() => {
    const now = Date.now()
    return bookings
      .map((booking) => ({ booking, date: parseDate(booking.scheduled_start) }))
      .filter(
        (item): item is { booking: MarketplaceBookingListItem; date: Date } =>
          item.date !== null &&
          item.date.getTime() >= now - 24 * 60 * 60 * 1000 &&
          normalizeBookingStatus(item.booking.status) !== "cancelado"
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 4)
  }, [bookings])

  const todayCount = useMemo(() => {
    const today = new Date()
    return bookings.filter((booking) => {
      const date = parseDate(booking.scheduled_start)
      if (!date) return false
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear() &&
        normalizeBookingStatus(booking.status) !== "cancelado"
      )
    }).length
  }, [bookings])

  const activeServices = useMemo(
    () => services.filter((service) => service.is_active).length,
    [services]
  )

  const pendingProposals = useMemo(
    () =>
      proposals.filter(
        (item) => item.myProposal.status?.toLowerCase() === "pending"
      ).length,
    [proposals]
  )

  const recentProposals = useMemo(
    () =>
      [...proposals]
        .sort((a, b) => {
          const aDate = parseDate(a.myProposal.created_at)?.getTime() ?? 0
          const bDate = parseDate(b.myProposal.created_at)?.getTime() ?? 0
          return bDate - aDate
        })
        .slice(0, 4),
    [proposals]
  )

  const openRequests = useMemo(
    () =>
      requests
        .filter((request) => request.status?.toLowerCase() === "open")
        .slice(0, 5),
    [requests]
  )

  const totalProposals = stats?.totalProposals ?? proposals.length
  const acceptedProposals =
    stats?.acceptedProposals ??
    proposals.filter(
      (item) => item.myProposal.status?.toLowerCase() === "accepted"
    ).length
  const totalProposalValue = stats?.totalValue ?? 0

  const quickActions = [
    {
      href: "/profissional/pedidos",
      label: "Pedidos de clientes",
      description: "Encontre pedidos e envie propostas.",
      icon: ClipboardList,
    },
    {
      href: "/profissional/propostas",
      label: "Propostas enviadas",
      description: "Acompanhe o estado das suas propostas.",
      icon: Send,
    },
    {
      href: "/profissional/servicos",
      label: "Meus serviços",
      description: "Crie, edite e ative os seus serviços.",
      icon: Briefcase,
    },
    {
      href: "/perfil",
      label: "Perfil público",
      description: "Atualize a forma como os clientes o vêem.",
      icon: UserRound,
    },
  ]

  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Visão geral
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Acompanhe a sua atividade e o que precisa de atenção.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => void load({ silent: true })}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCcw className="size-3.5" aria-hidden />
          )}
          Atualizar
        </Button>
      </div>

      {error ? (
        <div
          className="flex flex-col gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <span className="inline-flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            Alguns dados não puderam ser carregados. {error}
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="shrink-0 border-amber-200 bg-transparent text-amber-800 hover:bg-amber-100"
            onClick={() => void load()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Agendamentos"
          value={bookings.length}
          detail={
            todayCount > 0
              ? `${todayCount} hoje · ${upcomingBookings.length} por vir`
              : `${upcomingBookings.length} agendamentos por vir`
          }
          icon={CalendarDays}
          accent="text-primary"
        />
        <KpiCard
          label="Propostas enviadas"
          value={totalProposals}
          detail={
            pendingProposals > 0
              ? `${pendingProposals} à espera de resposta`
              : "Nenhuma proposta pendente"
          }
          icon={Send}
          accent="text-primary"
        />
        <KpiCard
          label="Serviços ativos"
          value={activeServices}
          detail={
            services.length > 0
              ? `${services.length} serviços no catálogo`
              : "Ainda sem serviços criados"
          }
          icon={Briefcase}
          accent="text-primary"
        />
        <KpiCard
          label="Valor em propostas"
          value={formatKz(totalProposalValue)}
          detail={`${acceptedProposals} propostas aceites`}
          icon={Wallet}
          accent="text-emerald-600"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <DashboardSection
            title="Próximos agendamentos"
            description="Serviços confirmados e pendentes na sua agenda."
            actionHref="/profissional/agenda"
            actionLabel="Abrir agenda"
          >
            {upcomingBookings.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Sem agendamentos futuros"
                description="Quando um cliente marcar um serviço, ele aparece aqui."
              />
            ) : (
              <ul className="space-y-2">
                {upcomingBookings.map(({ booking, date }, index) => {
                  const status = getBookingStatusBadge(booking.status)
                  const dayMonth = formatDayMonth(date)
                  return (
                    <li
                      key={booking.id ?? `${booking.scheduled_start}-${index}`}
                      className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5"
                    >
                      <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <span className="text-sm font-bold leading-none">
                          {dayMonth.day}
                        </span>
                        <span className="mt-0.5 text-[9px] font-semibold tracking-wide">
                          {dayMonth.month}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {booking.service_title?.trim() || "Serviço"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" aria-hidden />
                          {formatTime(date)}
                          {booking.is_remote ? " · Remoto" : " · No local"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            status.className
                          )}
                        >
                          {status.label}
                        </span>
                        <p className="mt-1 text-xs font-semibold text-foreground">
                          {formatPriceValue(booking.total_price ?? 0)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </DashboardSection>

          <DashboardSection
            title="Pedidos recentes de clientes"
            description="Oportunidades abertas no marketplace."
            actionHref="/profissional/pedidos"
            actionLabel="Ver pedidos"
          >
            {openRequests.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Sem pedidos abertos"
                description="Novos pedidos de clientes aparecem aqui para enviar proposta."
              />
            ) : (
              <ul className="space-y-2">
                {openRequests.map((request) => (
                  <li
                    key={request.id}
                    className="rounded-lg border border-border/60 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {request.title?.trim() || "Pedido de serviço"}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          {request.category_name ? (
                            <span>{request.category_name}</span>
                          ) : null}
                          {request.location_text ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" aria-hidden />
                              {request.location_text}
                            </span>
                          ) : null}
                          {request.created_at ? (
                            <span>{formatRelativeTimePt(request.created_at)}</span>
                          ) : null}
                        </p>
                      </div>
                      {request.is_urgent ? (
                        <span className="shrink-0 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                          Urgente
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">
                        {request.budget_range_formatted?.trim() ||
                          formatBudget(request.budget_min, request.budget_max)}
                      </p>
                      <Link
                        href="/profissional/pedidos"
                        className="text-xs font-semibold text-primary transition-colors hover:text-primary/80"
                      >
                        Ver e propor
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              Ações rápidas
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Atalhos para gerir a sua atividade.
            </p>
            <ul className="mt-3 space-y-1.5">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <li key={action.href}>
                    <Link
                      href={action.href}
                      className="group flex items-start gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent"
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          {action.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                          {action.description}
                        </span>
                      </span>
                      <ArrowRight
                        className="mt-2 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Propostas recentes
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Últimas propostas que enviou.
                </p>
              </div>
              <Link
                href="/profissional/propostas"
                className="shrink-0 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Ver todas
              </Link>
            </div>
            {recentProposals.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  icon={Send}
                  title="Ainda sem propostas"
                  description="Envie propostas a pedidos de clientes para começar."
                />
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {recentProposals.map((item) => {
                  const status = getProposalStatusBadge(item.myProposal.status)
                  return (
                    <li
                      key={item.id}
                      className="rounded-lg border border-border/60 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-medium text-foreground">
                          {item.title?.trim() || item.category_name || "Serviço"}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            status.className
                          )}
                        >
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{formatPriceValue(item.myProposal.price)}</span>
                        {item.myProposal.created_at ? (
                          <span>
                            {formatRelativeTimePt(item.myProposal.created_at)}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <div className="lg:hidden">
            <HomeProfessionalAvailability userId={userId} />
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {acceptedProposals > 0
                    ? `${acceptedProposals} propostas aceites`
                    : "Pronto para novos clientes"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {acceptedProposals > 0
                    ? "Continue a acompanhar os seus pedidos e a sua agenda."
                    : "Complete o perfil e os serviços para receber mais pedidos."}
                </p>
              </div>
            </div>
            <Link
              href="/profissional/pedidos"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Explorar pedidos de clientes
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
