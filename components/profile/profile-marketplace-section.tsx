"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  BarChart3,
  CheckCircle2,
  Clock,
  FileSearch,
  Loader2,
  RefreshCw,
  Send,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DeleteProposalConfirmDialog } from "@/components/delete-proposal-confirm-dialog/delete-proposal-confirm-dialog"
import { ItemPropostaEditar } from "@/components/itempropostaeditar/itempropostaeditar"
import { ItemPropostasGerir } from "@/components/itempropostasgerir/itempropostasgerir"
import { useToast } from "@/components/ui/toaster"
import { formatRelativeTimePt } from "@/lib/format-relative-time"
import { deleteProposal, fetchMyProposals } from "@/lib/proposals-client"
import {
  fetchClientServiceRequestStats,
  fetchProfessionalServiceRequestStats,
} from "@/lib/service-request-client"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { cn } from "@/lib/utils"
import type { ProfessionalSentProposalItem } from "@/types/proposal"
import type {
  ClientRecentRequest,
  ClientServiceRequestStats,
  ProfessionalProposalStat,
  ProfessionalServiceRequestStats,
  ServiceRequestStatusStat,
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

function getStatusCount(
  byStatus: Record<string, ServiceRequestStatusStat>,
  key: string
): number {
  return byStatus[key]?.count ?? 0
}

function getProposalStatCount(
  stats: ProfessionalProposalStat[],
  id: string
): number {
  return (
    stats.find((item) => item._id.toLowerCase() === id.toLowerCase())?.count ?? 0
  )
}

function getClientRequestStatus(status?: string) {
  const normalized = status?.toLowerCase() ?? "open"
  if (normalized === "matched") {
    return { label: "Profissional escolhido", className: "border-emerald-100 bg-emerald-500/10 text-emerald-700" }
  }
  if (normalized === "open") {
    return { label: "Aberta", className: "border-amber-100 bg-amber-500/10 text-amber-700" }
  }
  return { label: "Encerrada", className: "border-gray-200 bg-muted text-muted-foreground" }
}

function formatProposalPrice(value: string | number): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return "—"
  return `${num.toLocaleString("pt-PT")} Kz`
}

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

function getMyProposalStatus(status?: string) {
  const normalized = status?.toLowerCase() ?? "pending"
  if (normalized === "accepted") {
    return { label: "Aceite", className: "border-emerald-100 bg-emerald-500/10 text-emerald-700" }
  }
  if (normalized === "rejected") {
    return { label: "Rejeitada", className: "border-red-100 bg-destructive/10 text-destructive" }
  }
  return { label: "Pendente", className: "border-amber-100 bg-amber-500/10 text-amber-700" }
}

function MetricTile({
  label,
  value,
  displayValue,
  icon: Icon,
  accent,
  className,
}: {
  label: string
  value: number
  displayValue?: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  accent?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-gray-100 bg-white p-3 sm:p-5",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className={cn("size-4", accent ?? "text-primary")} aria-hidden />
        </div>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-foreground leading-tight">
        {displayValue ?? value}
      </p>
    </div>
  )
}

export function useProfileMarketplaceData(
  isProfessional: boolean,
  userId: string | null
) {
  const [clientStats, setClientStats] = useState<ClientServiceRequestStats | null>(
    null
  )
  const [professionalStats, setProfessionalStats] =
    useState<ProfessionalServiceRequestStats | null>(null)
  const [professionalProposals, setProfessionalProposals] = useState<
    ProfessionalSentProposalItem[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const token = getSessionToken()
    if (!token) {
      setError("Inicie sessão para ver os dados.")
      setClientStats(null)
      setProfessionalStats(null)
      setProfessionalProposals([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      if (isProfessional) {
        const [statsResult, listResult] = await Promise.all([
          fetchProfessionalServiceRequestStats(token),
          fetchMyProposals(token),
        ])

        if (!statsResult.success) {
          setError(statsResult.error)
          setProfessionalStats(null)
          setProfessionalProposals([])
          return
        }

        setProfessionalStats(statsResult.data)
        setClientStats(null)

        if (listResult.success) {
          setProfessionalProposals(listResult.data)
        } else {
          setProfessionalProposals([])
        }
      } else {
        const statsResult = await fetchClientServiceRequestStats(token)
        if (!statsResult.success) {
          setError(statsResult.error)
          setClientStats(null)
          return
        }
        setClientStats(statsResult.data)
        setProfessionalStats(null)
        setProfessionalProposals([])
      }
    } catch {
      setError("Erro de ligação. Tente novamente.")
      setClientStats(null)
      setProfessionalStats(null)
      setProfessionalProposals([])
    } finally {
      setLoading(false)
    }
  }, [isProfessional])

  useEffect(() => {
    if (!userId) return
    void loadData()
  }, [userId, loadData])

  const listCount = isProfessional
    ? professionalProposals.length
    : (clientStats?.recentRequests.length ?? 0)

  const metricsCount = isProfessional
    ? (professionalStats?.totalProposals ?? 0)
    : (clientStats?.totalRequests ?? 0)

  return {
    loading,
    error,
    loadData,
    clientStats,
    professionalStats,
    professionalProposals,
    clientRecentRequests: clientStats?.recentRequests ?? [],
    listCount,
    metricsCount,
  }
}

interface ProfileMarketplacePanelsProps {
  isProfessional: boolean
  userId: string | null
  view?: "list" | "metrics" | "all"
  showSectionHeader?: boolean
}

export function ProfileMarketplacePanels({
  isProfessional,
  userId,
  view = "all",
  showSectionHeader = true,
}: ProfileMarketplacePanelsProps) {
  const toast = useToast()
  const {
    loading,
    error,
    loadData,
    clientStats,
    professionalStats,
    professionalProposals,
    clientRecentRequests,
  } = useProfileMarketplaceData(isProfessional, userId)

  const [manageDialog, setManageDialog] = useState<{
    id: string
    servico: string
  } | null>(null)

  const [deleteDialog, setDeleteDialog] = useState<{
    proposalId: string
    servico: string
  } | null>(null)
  const [deletingProposalId, setDeletingProposalId] = useState<string | null>(null)

  const [editDialog, setEditDialog] = useState<{
    proposalId: string
    servico: string
    proposal: {
      price: string | number
      estimated_duration: number
      message: string
    }
  } | null>(null)

  const handleDeleteProposal = useCallback(async () => {
    if (!deleteDialog) return

    const token = getSessionToken()
    if (!token) {
      toast.error("Inicie sessão para eliminar a proposta.")
      return
    }

    setDeletingProposalId(deleteDialog.proposalId)
    try {
      const result = await deleteProposal(deleteDialog.proposalId, token)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success("Proposta eliminada com sucesso.")
      setDeleteDialog(null)
      await loadData()
    } catch {
      toast.error("Erro de ligação. Tente novamente.")
    } finally {
      setDeletingProposalId(null)
    }
  }, [deleteDialog, loadData, toast])

  const professionalRejected = useMemo(() => {
    if (!professionalStats) return 0
    const fromStats = getProposalStatCount(professionalStats.proposalStats, "rejected")
    if (fromStats > 0) return fromStats
    return Math.max(
      0,
      professionalStats.totalProposals -
        professionalStats.pendingRequests -
        professionalStats.acceptedProposals
    )
  }, [professionalStats])

  const listTitle = isProfessional ? "As minhas propostas" : "As minhas solicitações"
  const listDescription = isProfessional
    ? "Pedidos de serviço aos quais enviou proposta."
    : "Serviços que solicitou e propostas recebidas."

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" aria-hidden />
        A carregar…
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadData()}>
          <RefreshCw className="size-3.5 mr-1.5" aria-hidden />
          Tentar novamente
        </Button>
      </div>
    )
  }

  const metricsSection = (
    <div className="space-y-4">
      {showSectionHeader || view === "all" ? (
        <div>
          <h3 className="text-base font-semibold text-foreground">Métricas</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isProfessional
              ? "Resumo das propostas enviadas no marketplace."
              : "Resumo das suas solicitações de serviço."}
          </p>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {isProfessional && professionalStats ? (
          <>
            <MetricTile
              label="Enviadas"
              value={professionalStats.totalProposals}
              icon={Send}
            />
            <MetricTile
              label="Pendentes"
              value={professionalStats.pendingRequests}
              icon={Clock}
              accent="text-amber-600"
            />
            <MetricTile
              label="Aceites"
              value={professionalStats.acceptedProposals}
              icon={CheckCircle2}
              accent="text-emerald-600"
            />
            <MetricTile
              label="Valor total"
              value={professionalStats.totalValue}
              displayValue={formatKz(professionalStats.totalValue)}
              icon={Wallet}
              accent="text-primary"
            />
            {professionalRejected > 0 ? (
              <MetricTile
                label="Rejeitadas"
                value={professionalRejected}
                icon={BarChart3}
                accent="text-muted-foreground"
                className="col-span-2 xl:col-span-1"
              />
            ) : null}
          </>
        ) : clientStats ? (
          <>
            <MetricTile
              label="Total"
              value={clientStats.totalRequests}
              icon={FileSearch}
            />
            <MetricTile
              label="Abertas"
              value={getStatusCount(clientStats.byStatus, "open")}
              icon={Clock}
              accent="text-amber-600"
            />
            <MetricTile
              label="Concluídas"
              value={getStatusCount(clientStats.byStatus, "matched")}
              icon={CheckCircle2}
              accent="text-emerald-600"
            />
            <MetricTile
              label="Orçamento total"
              value={clientStats.totalBudget}
              displayValue={formatKz(clientStats.totalBudget)}
              icon={Wallet}
              accent="text-primary"
            />
          </>
        ) : null}
      </div>
    </div>
  )

  if (view === "metrics") {
    return metricsSection
  }

  const listItems = isProfessional ? professionalProposals : clientRecentRequests

  const listSection = (
    <>
      <div className="space-y-4">
        {showSectionHeader || view === "all" ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">{listTitle}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{listDescription}</p>
            </div>
            <Link
              href="/"
              className="text-sm font-medium text-primary hover:underline shrink-0"
            >
              Ver no feed
            </Link>
          </div>
        ) : null}

        {listItems.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-14 text-center text-muted-foreground">
            <Send size={40} strokeWidth={1} className="mb-3 opacity-25" />
            <p className="text-sm max-w-sm">
              {isProfessional
                ? "Ainda não enviou propostas a nenhuma solicitação."
                : "Ainda não solicitou nenhum serviço."}
            </p>
            <Link
              href="/"
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Explorar solicitações
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {isProfessional
              ? professionalProposals.map((item) => {
                  const proposal = item.myProposal
                  const status = getMyProposalStatus(proposal.status)
                  const title = item.title?.trim() || item.category_name || "Serviço"
                  const clientName = item.client_name?.trim() || "Cliente"
                  const avatarSrc = resolveUserAvatarUrl(item.client_photo)
                  const sentLabel = proposal.created_at
                    ? formatRelativeTimePt(proposal.created_at)
                    : null

                  return (
                    <li
                      key={item.id}
                      className="space-y-3 rounded-xl border border-gray-100 bg-white p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Image
                          src={avatarSrc}
                          alt=""
                          width={40}
                          height={40}
                          className="size-10 shrink-0 rounded-full object-cover bg-muted"
                          unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-snug">{title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                Cliente: {clientName}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium",
                                status.className
                              )}
                            >
                              {status.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {item.category_name ? (
                        <p className="text-xs text-primary">{item.category_name}</p>
                      ) : null}

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Valor proposto
                          </p>
                          <p className="font-semibold text-foreground">
                            {formatProposalPrice(proposal.price)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Duração
                          </p>
                          <p className="font-semibold text-foreground">
                            {formatDuration(proposal.estimated_duration)}
                          </p>
                        </div>
                      </div>

                      {proposal.message ? (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {proposal.message}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>Orçamento pedido: {formatBudget(item.budget_min, item.budget_max)}</span>
                        {sentLabel ? <span>Enviada {sentLabel}</span> : null}
                      </div>

                      {proposal.status?.toLowerCase() === "pending" ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setEditDialog({
                                proposalId: proposal.id,
                                servico: title,
                                proposal: {
                                  price: proposal.price,
                                  estimated_duration: proposal.estimated_duration,
                                  message: proposal.message,
                                },
                              })
                            }
                          >
                            Editar proposta
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/5"
                            onClick={() =>
                              setDeleteDialog({
                                proposalId: proposal.id,
                                servico: title,
                              })
                            }
                          >
                            Eliminar proposta
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  )
                })
              : clientRecentRequests.map((item: ClientRecentRequest) => {
                  const status = getClientRequestStatus(item.status)
                  const title = item.title?.trim() || item.category_name || "Serviço"
                  const timeLabel = item.created_at
                    ? formatRelativeTimePt(item.created_at)
                    : null

                  return (
                    <li
                      key={item.id}
                      className="space-y-3 rounded-xl border border-gray-100 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug">{title}</p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium",
                            status.className
                          )}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.category_name ?? "Serviço"}
                        {timeLabel ? ` · ${timeLabel}` : ""}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          setManageDialog({ id: item.id, servico: title })
                        }
                      >
                        Ver propostas recebidas
                      </Button>
                    </li>
                  )
                })}
          </ul>
        )}
      </div>

      {manageDialog ? (
        <ItemPropostasGerir
          serviceRequestId={manageDialog.id}
          servico={manageDialog.servico}
          open={Boolean(manageDialog)}
          onOpenChange={(open) => {
            if (!open) setManageDialog(null)
          }}
          onProposalAccepted={() => void loadData()}
          onProposalRejected={() => void loadData()}
        />
      ) : null}

      {editDialog ? (
        <ItemPropostaEditar
          proposalId={editDialog.proposalId}
          servico={editDialog.servico}
          initialProposal={editDialog.proposal}
          open={Boolean(editDialog)}
          onOpenChange={(open) => {
            if (!open) setEditDialog(null)
          }}
          onSuccess={() => void loadData()}
        />
      ) : null}

      {deleteDialog ? (
        <DeleteProposalConfirmDialog
          open={Boolean(deleteDialog)}
          onOpenChange={(open) => {
            if (!open) setDeleteDialog(null)
          }}
          servico={deleteDialog.servico}
          loading={deletingProposalId === deleteDialog.proposalId}
          onConfirm={handleDeleteProposal}
        />
      ) : null}
    </>
  )

  if (view === "list") {
    return listSection
  }

  return (
    <div className="space-y-8">
      {metricsSection}
      <div className="border-t border-border/40 pt-8">{listSection}</div>
    </div>
  )
}
