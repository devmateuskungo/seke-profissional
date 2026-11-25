"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Briefcase,
  Eye,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  CalendarCheck,
} from "lucide-react"
import { DeleteServiceConfirmDialog } from "@/components/delete-service-confirm-dialog/delete-service-confirm-dialog"
import {
  ServiceRegisterModal,
  type ServiceSaveResult,
} from "@/components/itemprofileservice/itemprofileservice"
import { MyServiceCard } from "@/components/itemprofileservice/my-service-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toaster"
import { fetchMyMarketplaceServices } from "@/lib/marketplace-client"
import { deleteService, toggleService } from "@/lib/services-client"
import { cn } from "@/lib/utils"
import type { MarketplaceService } from "@/types/marketplace"

type ServiceFilter = "todos" | "ativos" | "inativos"

const FILTERS: { id: ServiceFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "ativos", label: "Ativos" },
  { id: "inativos", label: "Inativos" },
]

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

export default function ProfissionalServicosPage() {
  const toast = useToast()
  const [services, setServices] = useState<MarketplaceService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ServiceFilter>("todos")
  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<MarketplaceService | null>(
    null
  )
  const [togglingServiceId, setTogglingServiceId] = useState<string | null>(null)
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [servicePendingDelete, setServicePendingDelete] =
    useState<MarketplaceService | null>(null)

  const loadServices = useCallback(async () => {
    const token = getSessionToken()
    if (!token) {
      setError("Sessão expirada. Inicie sessão novamente.")
      setServices([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await fetchMyMarketplaceServices(token)
      if (!result.success) {
        setError(result.error)
        setServices([])
        return
      }
      setServices(result.data)
    } catch {
      setError("Erro de ligação ao carregar os seus serviços.")
      setServices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadServices()
  }, [loadServices])

  const counts = useMemo<Record<ServiceFilter, number>>(() => {
    const active = services.filter((service) => service.is_active).length
    return {
      todos: services.length,
      ativos: active,
      inativos: services.length - active,
    }
  }, [services])

  const totalViews = useMemo(
    () =>
      services.reduce(
        (total, service) => total + (Number(service.views_count) || 0),
        0
      ),
    [services]
  )

  const totalBookings = useMemo(
    () =>
      services.reduce(
        (total, service) => total + (Number(service.bookings_count) || 0),
        0
      ),
    [services]
  )

  const filteredServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return services.filter((service) => {
      if (filter === "ativos" && !service.is_active) return false
      if (filter === "inativos" && service.is_active) return false
      if (!normalizedQuery) return true
      return [service.title, service.description, service.category_name]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [filter, query, services])

  const handleToggleService = useCallback(
    async (serviceId: string) => {
      const token = getSessionToken()
      if (!token) {
        toast.error("Sessão expirada. Inicie sessão novamente.")
        return
      }

      setTogglingServiceId(serviceId)
      try {
        const result = await toggleService(serviceId, token)
        if (!result.success) {
          toast.error(result.error)
          return
        }

        const apiActive = result.data?.data?.is_active
        let nextActive = false

        setServices((prev) =>
          prev.map((service) => {
            if (service.id !== serviceId) return service
            const isActive =
              typeof apiActive === "boolean"
                ? apiActive
                : !service.is_active
            nextActive = isActive
            return { ...service, is_active: isActive }
          })
        )

        toast.success(nextActive ? "Serviço ativado." : "Serviço desativado.")
      } catch {
        toast.error("Erro de ligação ao atualizar o serviço.")
      } finally {
        setTogglingServiceId(null)
      }
    },
    [toast]
  )

  const handleServiceSaved = useCallback((result: ServiceSaveResult) => {
    setServices((prev) =>
      result.mode === "create"
        ? [result.service, ...prev]
        : prev.map((item) =>
            item.id === result.service.id ? result.service : item
          )
    )
    setError(null)
  }, [])

  const openCreateServiceModal = useCallback(() => {
    setEditingService(null)
    setServiceModalOpen(true)
  }, [])

  const handleEditService = useCallback((service: MarketplaceService) => {
    setEditingService(service)
    setServiceModalOpen(true)
  }, [])

  const handleRequestDeleteService = useCallback(
    (serviceId: string) => {
      const service = services.find((item) => item.id === serviceId) ?? null
      setServicePendingDelete(service)
      setDeleteDialogOpen(true)
    },
    [services]
  )

  const handleConfirmDeleteService = useCallback(async () => {
    if (!servicePendingDelete) return
    const token = getSessionToken()
    if (!token) {
      toast.error("Sessão expirada. Inicie sessão novamente.")
      return
    }

    setDeletingServiceId(servicePendingDelete.id)
    try {
      const result = await deleteService(servicePendingDelete.id, token)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      setServices((prev) =>
        prev.filter((service) => service.id !== servicePendingDelete.id)
      )
      toast.success("Serviço eliminado.")
      setDeleteDialogOpen(false)
      setServicePendingDelete(null)
    } catch {
      toast.error("Erro de ligação ao eliminar o serviço.")
    } finally {
      setDeletingServiceId(null)
    }
  }, [servicePendingDelete, toast])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Meus serviços
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Crie e mantenha o catálogo que os clientes encontram no marketplace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void loadServices()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCcw className="size-3.5" aria-hidden />
            )}
            Atualizar
          </Button>
          <Button type="button" size="sm" onClick={openCreateServiceModal}>
            <Plus className="size-4" aria-hidden />
            Cadastrar serviço
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Total
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {loading && services.length === 0 ? "—" : counts.todos}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            Ativos
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-800">
            {loading && services.length === 0 ? "—" : counts.ativos}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye className="size-3" aria-hidden />
            <p className="text-[10px] font-semibold uppercase tracking-wide">
              Visualizações
            </p>
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {loading && services.length === 0 ? "—" : totalViews}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <CalendarCheck className="size-3" aria-hidden />
            <p className="text-[10px] font-semibold uppercase tracking-wide">
              Reservas
            </p>
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {loading && services.length === 0 ? "—" : totalBookings}
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
            placeholder="Pesquisar nos seus serviços…"
            className="h-10 border-border bg-muted/60 pl-9 text-sm shadow-none focus-visible:bg-background"
            aria-label="Pesquisar serviços"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((item) => {
            const active = filter === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
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
                  {counts[item.id]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {error && services.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-foreground">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={() => void loadServices()}
          >
            <RefreshCcw className="size-4" aria-hidden />
            Tentar novamente
          </Button>
        </div>
      ) : loading && services.length === 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-52 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Briefcase className="size-6" aria-hidden />
          </div>
          <h2 className="mt-4 text-base font-semibold text-foreground">
            {query.trim() || filter !== "todos"
              ? "Nenhum serviço corresponde aos filtros"
              : "Ainda não criou serviços"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {query.trim() || filter !== "todos"
              ? "Experimente limpar a pesquisa ou escolher outro filtro."
              : "Cadastre o que oferece para aparecer nas pesquisas dos clientes."}
          </p>
          {query.trim() || filter !== "todos" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={() => {
                setQuery("")
                setFilter("todos")
              }}
            >
              Limpar filtros
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="mt-5"
              onClick={openCreateServiceModal}
            >
              <Plus className="size-4" aria-hidden />
              Cadastrar primeiro serviço
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredServices.map((service) => (
            <MyServiceCard
              key={service.id}
              service={service}
              onToggle={(id) => void handleToggleService(id)}
              onEdit={handleEditService}
              onDelete={handleRequestDeleteService}
              isToggling={togglingServiceId === service.id}
              isDeleting={deletingServiceId === service.id}
            />
          ))}
        </div>
      )}

      {error && services.length > 0 ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        Serviços ativos ficam visíveis para os clientes. Pode ocultar um serviço
        sem o eliminar, usando o interruptor de cada cartão.
      </div>

      <ServiceRegisterModal
        open={serviceModalOpen}
        onOpenChange={(open) => {
          setServiceModalOpen(open)
          if (!open) setEditingService(null)
        }}
        service={editingService}
        onSuccess={handleServiceSaved}
        onFallbackRefresh={() => void loadServices()}
      />

      <DeleteServiceConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) setServicePendingDelete(null)
        }}
        serviceTitle={servicePendingDelete?.title}
        loading={Boolean(deletingServiceId)}
        onConfirm={handleConfirmDeleteService}
      />
    </div>
  )
}
