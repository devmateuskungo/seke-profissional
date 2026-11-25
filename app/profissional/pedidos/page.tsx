"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ClipboardList,
  Loader2,
  RefreshCcw,
  Rss,
  Search,
  Send,
} from "lucide-react"
import SolicitacaoCliente from "@/components/itempostclients/itempostclient"
import { ItemPropostaEnviar } from "@/components/itempropostaenviar/itempropostaenviar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listOpenIamServices } from "@/lib/iam-orders-client"
import { fetchMarketplaceCategories } from "@/lib/marketplace-client"
import { serviceRequestToSolicitacaoRow } from "@/lib/service-request-map"
import { sameUserId, useViewerUserId } from "@/lib/viewer-user-id"
import { cn } from "@/lib/utils"
import type { MarketplaceCategory } from "@/types/marketplace"
import type {
  MarketplaceServiceRequest,
  ServiceRequestPagination,
} from "@/types/service-request"

type RequestFilter = "todos" | "sem-proposta" | "com-proposta" | "urgentes"

const PAGE_SIZE = 20
const ALL_CATEGORIES = "all"

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

const FILTERS: { id: RequestFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "sem-proposta", label: "Sem proposta" },
  { id: "com-proposta", label: "Com proposta" },
  { id: "urgentes", label: "Urgentes" },
]

export default function ProfissionalPedidosPage() {
  const viewerUserId = useViewerUserId()
  const [requests, setRequests] = useState<MarketplaceServiceRequest[]>([])
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<RequestFilter>("todos")
  const [categories, setCategories] = useState<MarketplaceCategory[]>([])
  const [categorySlug, setCategorySlug] = useState("")
  const categoryNamesRef = useRef<Map<string, string>>(new Map())
  const [proposalSentIds, setProposalSentIds] = useState<Set<string>>(
    () => new Set()
  )
  const [proposalRequest, setProposalRequest] = useState<{
    id: string
    servico: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const result = await fetchMarketplaceCategories(
        getSessionToken() ?? undefined
      )
      if (cancelled || !result.success) return

      setCategories(result.data)
      categoryNamesRef.current = new Map(
        result.data.map((category) => [
          category.slug.toLowerCase(),
          category.name,
        ])
      )
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      const token = getSessionToken()
      if (!token) {
        setError("Sessão expirada. Inicie sessão novamente.")
        setRequests([])
        setLoading(false)
        return
      }

      setLoading(true)
      const result = await listOpenIamServices({
        token,
        category: categorySlug || undefined,
        categoryNames: categoryNamesRef.current,
      })
      if (cancelled) return

      if (result.success) {
        setRequests(result.data)
        setError(null)
      } else {
        setError(result.error)
        setRequests([])
      }

      setLoading(false)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [categorySlug, reloadKey])

  const loadMore = useCallback(() => {
    setPage((previousPage) => previousPage + 1)
  }, [])

  const reload = useCallback(() => {
    setError(null)
    setPage(1)
    setReloadKey((key) => key + 1)
  }, [])

  const visibleRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          !request.client_id ||
          !sameUserId(viewerUserId, request.client_id)
      ),
    [requests, viewerUserId]
  )

  const counts = useMemo<Record<RequestFilter, number>>(() => {
    return {
      todos: visibleRequests.length,
      "sem-proposta": visibleRequests.filter(
        (request) =>
          !request.has_my_proposal && !proposalSentIds.has(request.id)
      ).length,
      "com-proposta": visibleRequests.filter(
        (request) =>
          request.has_my_proposal || proposalSentIds.has(request.id)
      ).length,
      urgentes: visibleRequests.filter((request) => request.is_urgent).length,
    }
  }, [proposalSentIds, visibleRequests])

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return visibleRequests.filter((request) => {
      const hasProposal =
        request.has_my_proposal || proposalSentIds.has(request.id)

      if (filter === "sem-proposta" && hasProposal) return false
      if (filter === "com-proposta" && !hasProposal) return false
      if (filter === "urgentes" && !request.is_urgent) return false

      if (!normalizedQuery) return true

      return [
        request.title,
        request.description,
        request.category_name,
        request.location_text,
        request.province,
        request.municipality,
      ]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [filter, proposalSentIds, query, visibleRequests])

  const pagination = useMemo<ServiceRequestPagination>(
    () => ({
      page,
      limit: PAGE_SIZE,
      total: visibleRequests.length,
      pages: Math.max(1, Math.ceil(visibleRequests.length / PAGE_SIZE)),
    }),
    [page, visibleRequests.length]
  )

  const hasMore = page < pagination.pages
  const totalRequests = pagination.total
  const pagedRequests = useMemo(
    () => filteredRequests.slice(0, page * PAGE_SIZE),
    [filteredRequests, page]
  )
  const hasActiveFilters =
    query.trim() !== "" || filter !== "todos" || categorySlug !== ""

  const handleProposalSuccess = useCallback((requestId: string) => {
    setProposalSentIds((prev) => {
      const next = new Set(prev)
      next.add(requestId)
      return next
    })
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? { ...request, has_my_proposal: true }
          : request
      )
    )
    setProposalRequest(null)
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Pedidos de clientes
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Encontre pedidos abertos e envie propostas aos clientes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={reload}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCcw className="size-3.5" aria-hidden />
            )}
            Atualizar
          </Button>
          <Button type="button" variant="outline" size="xs" asChild>
            <Link href="/">
              <Rss className="size-3.5" aria-hidden />
              Ver no feed
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Total
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {loading && requests.length === 0 ? "—" : totalRequests}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sem proposta
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {loading && requests.length === 0 ? "—" : counts["sem-proposta"]}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            Com proposta
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-800">
            {loading && requests.length === 0 ? "—" : counts["com-proposta"]}
          </p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700">
            Urgentes
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-red-800">
            {loading && requests.length === 0 ? "—" : counts.urgentes}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar por serviço, categoria ou localização…"
            className="h-10 border-border bg-muted/60 pl-9 text-sm shadow-none focus-visible:bg-background"
            aria-label="Pesquisar pedidos de clientes"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <label
            htmlFor="orders-category"
            className="text-xs font-semibold text-muted-foreground"
          >
            Categoria
          </label>
          <Select
            value={categorySlug || ALL_CATEGORIES}
            onValueChange={(value) => {
              setCategorySlug(value === ALL_CATEGORIES ? "" : value)
              setPage(1)
            }}
            disabled={loading}
          >
            <SelectTrigger id="orders-category" className="h-9 w-full sm:w-64">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.slug}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((item) => {
            const active = filter === item.id
            const count = counts[item.id]
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background/70 text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {error && requests.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
          <AlertCircle
            className="mx-auto size-6 text-destructive"
            aria-hidden
          />
          <p className="mt-3 text-sm text-foreground">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={reload}
          >
            <RefreshCcw className="size-4" aria-hidden />
            Tentar novamente
          </Button>
        </div>
      ) : loading && requests.length === 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground/60">
            <ClipboardList className="size-6" aria-hidden />
          </div>
          <h2 className="mt-4 text-base font-semibold text-foreground">
            {hasActiveFilters
              ? "Nenhum pedido corresponde aos filtros"
              : "Ainda não há pedidos abertos"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Experimente limpar a pesquisa ou escolher outra categoria."
              : "Novos pedidos aparecem aqui. Entretanto, pode explorar o feed da comunidade."}
          </p>
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={() => {
                setQuery("")
                setFilter("todos")
                setCategorySlug("")
                setPage(1)
              }}
            >
              Limpar filtros
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" className="mt-5" asChild>
              <Link href="/">
                <Rss className="size-4" aria-hidden />
                Ir para o feed
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {pagedRequests.map((request) => {
              const row = serviceRequestToSolicitacaoRow(request)
              const { id, ...data } = row
              const hasProposal =
                request.has_my_proposal || proposalSentIds.has(request.id)

              return (
                <div key={id} className="[&>div]:h-full">
                  <SolicitacaoCliente
                    {...data}
                    showProposalAction
                    hasMyProposal={hasProposal}
                    proposalSent={hasProposal}
                    onSendProposal={() =>
                      setProposalRequest({
                        id: request.id,
                        servico: request.title?.trim() || "Serviço",
                      })
                    }
                  />
                </div>
              )
            })}
          </div>

          {hasMore ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMore}
              >
                Carregar mais pedidos
              </Button>
            </div>
          ) : null}
        </>
      )}

      {error && requests.length > 0 ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {proposalRequest ? (
        <ItemPropostaEnviar
          serviceRequestId={proposalRequest.id}
          servico={proposalRequest.servico}
          open={Boolean(proposalRequest)}
          onOpenChange={(open) => {
            if (!open) setProposalRequest(null)
          }}
          onSuccess={() => handleProposalSuccess(proposalRequest.id)}
        />
      ) : null}

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        <Send className="size-3.5 shrink-0 text-primary" aria-hidden />
        Ao enviar uma proposta, o cliente recebe os seus dados de contacto e pode
        responder diretamente.
      </div>
    </div>
  )
}
