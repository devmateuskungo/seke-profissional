"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toaster"
import { fetchMarketplaceCategories } from "@/lib/marketplace-client"
import { createService, updateService } from "@/lib/services-client"
import type { MarketplaceCategory, MarketplaceService } from "@/types/marketplace"
import type { CreateServiceRequest, ServicePriceUnit } from "@/types/service"

export const DEFAULT_SERVICE_FORM: CreateServiceRequest = {
  category_id: "",
  title: "Corte de cabelo",
  description: "Serviço profissional",
  price: 25,
  price_unit: "fixed",
  duration_minutes: 30,
  is_remote: false,
  is_on_site: true,
  max_distance_km: 10,
}

function getEmptyFormState() {
  return {
    categoryId: "",
    title: "",
    description: "",
    price: "",
    priceUnit: "fixed" as ServicePriceUnit,
    durationMinutes: "60",
    isRemote: false,
    isOnSite: true,
    maxDistanceKm: "10",
  }
}

function getDefaultFormState() {
  return {
    categoryId: DEFAULT_SERVICE_FORM.category_id,
    title: DEFAULT_SERVICE_FORM.title,
    description: DEFAULT_SERVICE_FORM.description,
    price: String(DEFAULT_SERVICE_FORM.price),
    priceUnit: DEFAULT_SERVICE_FORM.price_unit as ServicePriceUnit,
    durationMinutes: String(DEFAULT_SERVICE_FORM.duration_minutes),
    isRemote: DEFAULT_SERVICE_FORM.is_remote,
    isOnSite: DEFAULT_SERVICE_FORM.is_on_site,
    maxDistanceKm: String(DEFAULT_SERVICE_FORM.max_distance_km),
  }
}

export type ServiceSaveResult = {
  service: MarketplaceService
  mode: "create" | "update"
}

function buildSavedService(
  payload: CreateServiceRequest,
  options: {
    id: string
    categoryName?: string
    existing?: MarketplaceService
  }
): MarketplaceService {
  const base = options.existing
  const now = new Date().toISOString()
  return {
    id: options.id,
    professional_id: base?.professional_id ?? "",
    category_id: payload.category_id,
    title: payload.title,
    description: payload.description,
    price: payload.price,
    price_unit: payload.price_unit,
    duration_minutes: payload.duration_minutes,
    is_remote: payload.is_remote,
    is_on_site: payload.is_on_site,
    max_distance_km: payload.max_distance_km,
    is_active: base?.is_active ?? true,
    views_count: base?.views_count ?? 0,
    bookings_count: base?.bookings_count ?? 0,
    rating_avg: base?.rating_avg ?? 0,
    created_at: base?.created_at ?? now,
    updated_at: now,
    category_name: options.categoryName ?? base?.category_name,
    category_slug: base?.category_slug,
    version: base?.version,
  }
}

function readServiceIdFromResponse(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const root = data as Record<string, unknown>
  const nested =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null
  const id = nested?.id ?? root.id
  return typeof id === "string" && id.trim() ? id.trim() : null
}

function mapServiceToFormState(service: MarketplaceService) {
  return {
    categoryId: service.category_id,
    title: service.title,
    description: service.description,
    price: String(service.price),
    priceUnit: (service.price_unit === "hourly" ? "hourly" : "fixed") as ServicePriceUnit,
    durationMinutes: String(service.duration_minutes),
    isRemote: service.is_remote,
    isOnSite: service.is_on_site,
    maxDistanceKm: String(service.max_distance_km),
  }
}

interface ServiceRegisterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (result: ServiceSaveResult) => void
  /** Fallback sem recarregar a página inteira (ex.: API não devolveu o id). */
  onFallbackRefresh?: () => void
  service?: MarketplaceService | null
  /** Apenas recolhe os dados sem chamar a API (ex.: cadastro profissional). */
  collectOnly?: boolean
  onCollect?: (payload: CreateServiceRequest, categoryName?: string) => void
}

export function ServiceRegisterModal({
  open,
  onOpenChange,
  onSuccess,
  onFallbackRefresh,
  service = null,
  collectOnly = false,
  onCollect,
}: ServiceRegisterModalProps) {
  const isEditMode = Boolean(service)
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [categoryId, setCategoryId] = useState(DEFAULT_SERVICE_FORM.category_id)
  const [title, setTitle] = useState(DEFAULT_SERVICE_FORM.title)
  const [description, setDescription] = useState(DEFAULT_SERVICE_FORM.description)
  const [price, setPrice] = useState(String(DEFAULT_SERVICE_FORM.price))
  const [priceUnit, setPriceUnit] = useState<ServicePriceUnit>(
    DEFAULT_SERVICE_FORM.price_unit
  )
  const [durationMinutes, setDurationMinutes] = useState(
    String(DEFAULT_SERVICE_FORM.duration_minutes)
  )
  const [isRemote, setIsRemote] = useState(DEFAULT_SERVICE_FORM.is_remote)
  const [isOnSite, setIsOnSite] = useState(DEFAULT_SERVICE_FORM.is_on_site)
  const [maxDistanceKm, setMaxDistanceKm] = useState(
    String(DEFAULT_SERVICE_FORM.max_distance_km)
  )
  const [categories, setCategories] = useState<MarketplaceCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  const resetForm = useCallback(() => {
    const defaults = collectOnly ? getEmptyFormState() : getDefaultFormState()
    setCategoryId(defaults.categoryId)
    setTitle(defaults.title)
    setDescription(defaults.description)
    setPrice(defaults.price)
    setPriceUnit(defaults.priceUnit)
    setDurationMinutes(defaults.durationMinutes)
    setIsRemote(defaults.isRemote)
    setIsOnSite(defaults.isOnSite)
    setMaxDistanceKm(defaults.maxDistanceKm)
  }, [collectOnly])

  useEffect(() => {
    if (!open) {
      resetForm()
      return
    }
    if (service) {
      const values = mapServiceToFormState(service)
      setCategoryId(values.categoryId)
      setTitle(values.title)
      setDescription(values.description)
      setPrice(values.price)
      setPriceUnit(values.priceUnit)
      setDurationMinutes(values.durationMinutes)
      setIsRemote(values.isRemote)
      setIsOnSite(values.isOnSite)
      setMaxDistanceKm(values.maxDistanceKm)
      return
    }
    resetForm()
  }, [open, service, resetForm])

  useEffect(() => {
    if (!open) return

    const token =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("auth_token")
        : null

    let cancelled = false
    setLoadingCategories(true)

    void (async () => {
      try {
        const result = await fetchMarketplaceCategories(token ?? undefined)
        if (cancelled) return

        if (!result.success) {
          toast.error(result.error)
          setCategories([])
          return
        }

        setCategories(result.data)
      } catch {
        if (!cancelled) {
          toast.error("Erro de ligação ao carregar categorias.")
          setCategories([])
        }
      } finally {
        if (!cancelled) setLoadingCategories(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, toast])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      const token =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("auth_token")
          : null

      if (!collectOnly && !token) {
        toast.error("Sessão inválida. Inicie sessão novamente.")
        return
      }

      const trimmedCategory = categoryId.trim()
      if (!trimmedCategory) {
        toast.error("Selecione a categoria do serviço.")
        return
      }

      const trimmedTitle = title.trim()
      if (!trimmedTitle) {
        toast.error("Informe o título do serviço.")
        return
      }

      const trimmedDescription = description.trim()
      if (!trimmedDescription) {
        toast.error("Informe a descrição do serviço.")
        return
      }

      const priceNum = Number(price)
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        toast.error("Informe um preço válido.")
        return
      }

      const durationNum = Number(durationMinutes)
      if (!Number.isFinite(durationNum) || durationNum <= 0) {
        toast.error("Informe uma duração válida em minutos.")
        return
      }

      const distanceNum = Number(maxDistanceKm)
      if (!Number.isFinite(distanceNum) || distanceNum < 0) {
        toast.error("Informe uma distância máxima válida.")
        return
      }

      if (!isRemote && !isOnSite) {
        toast.error("Selecione pelo menos uma modalidade: remoto ou no local.")
        return
      }

      const payload: CreateServiceRequest = {
        category_id: trimmedCategory,
        title: trimmedTitle,
        description: trimmedDescription,
        price: priceNum,
        price_unit: priceUnit,
        duration_minutes: Math.round(durationNum),
        is_remote: isRemote,
        is_on_site: isOnSite,
        max_distance_km: distanceNum,
      }

      if (collectOnly && onCollect) {
        const categoryName = categories.find(
          (category) => category.id === trimmedCategory
        )?.name
        onCollect(payload, categoryName)
        toast.success("Serviço adicionado à lista.")
        onOpenChange(false)
        return
      }

      setSaving(true)
      try {
        if (!token) {
          toast.error("Sessão inválida. Inicie sessão novamente.")
          return
        }

        const result = service
          ? await updateService(service.id, payload, token)
          : await createService(payload, token)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        const categoryName = categories.find(
          (category) => category.id === trimmedCategory
        )?.name

        if (service) {
          onSuccess?.({
            mode: "update",
            service: buildSavedService(payload, {
              id: service.id,
              categoryName,
              existing: service,
            }),
          })
        } else {
          const createdId = readServiceIdFromResponse(result.data)
          if (!createdId) {
            toast.success("Serviço cadastrado com sucesso.")
            onFallbackRefresh?.()
            onOpenChange(false)
            return
          }
          onSuccess?.({
            mode: "create",
            service: buildSavedService(payload, {
              id: createdId,
              categoryName,
            }),
          })
        }

        toast.success(
          service ? "Serviço atualizado com sucesso." : "Serviço cadastrado com sucesso."
        )
        onOpenChange(false)
      } catch {
        toast.error("Erro de ligação. Tente novamente.")
      } finally {
        setSaving(false)
      }
    },
    [
      categories,
      categoryId,
      collectOnly,
      description,
      durationMinutes,
      isOnSite,
      isRemote,
      maxDistanceKm,
      onCollect,
      onFallbackRefresh,
      onOpenChange,
      onSuccess,
      price,
      priceUnit,
      service,
      title,
      toast,
    ]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/45 shadow-none sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditMode ? "Atualizar serviço" : "Cadastrar serviço"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Altere os dados do serviço. As mudanças ficam visíveis na sua listagem."
              : "Adicione um serviço que oferece para que clientes o encontrem no SEKE."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="service_category_id">Categoria</Label>
            <Select
              value={categoryId || undefined}
              onValueChange={setCategoryId}
              disabled={saving || loadingCategories}
            >
              <SelectTrigger id="service_category_id" className="w-full">
                <SelectValue
                  placeholder={
                    loadingCategories
                      ? "A carregar categorias…"
                      : "Selecione a categoria"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="service_title">Título</Label>
            <Input
              id="service_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              required
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="service_description">Descrição</Label>
            <Textarea
              id="service_description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="service_price">Preço (Kz)</Label>
            <Input
              id="service_price"
              type="number"
              min={0}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={saving}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="service_price_unit">Unidade de preço</Label>
            <Select
              value={priceUnit}
              onValueChange={(v) => setPriceUnit(v as ServicePriceUnit)}
              disabled={saving}
            >
              <SelectTrigger id="service_price_unit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Valor fixo</SelectItem>
                <SelectItem value="hourly">Por hora</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="service_duration">Duração (minutos)</Label>
            <Input
              id="service_duration"
              type="number"
              min={1}
              step={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              disabled={saving}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="service_max_distance">Distância máxima (km)</Label>
            <Input
              id="service_max_distance"
              type="number"
              min={0}
              step={1}
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(e.target.value)}
              disabled={saving}
              required
            />
          </div>
          <div className="flex flex-col gap-3 sm:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isRemote}
                onChange={(e) => setIsRemote(e.target.checked)}
                disabled={saving}
                className="h-4 w-4 rounded border"
              />
              <span className="text-sm">Atendimento remoto</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isOnSite}
                onChange={(e) => setIsOnSite(e.target.checked)}
                disabled={saving}
                className="h-4 w-4 rounded border"
              />
              <span className="text-sm">Atendimento no local do cliente</span>
            </label>
          </div>
          <DialogFooter className="sm:col-span-2 gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="buy" size="xs" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  {isEditMode ? "A guardar…" : "A cadastrar…"}
                </>
              ) : isEditMode ? (
                "Guardar alterações"
              ) : (
                "Cadastrar serviço"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** @deprecated Use ServiceRegisterModal */
export const ItemProfileService = ServiceRegisterModal
