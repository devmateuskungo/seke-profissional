"use client"

import { Briefcase, Clock, Loader2, MapPin, Pencil, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { MarketplaceService } from "@/types/marketplace"

function formatPrice(service: MarketplaceService): string {
  const value = Number(service.price)
  const formatted = Number.isFinite(value)
    ? value.toLocaleString("pt-AO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : String(service.price)
  const suffix = service.price_unit === "hourly" ? "/hora" : ""
  return `${formatted} Kz${suffix}`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`
}

interface MyServiceCardProps {
  service: MarketplaceService
  onToggle?: (serviceId: string) => void
  onEdit?: (service: MarketplaceService) => void
  onDelete?: (serviceId: string) => void
  isToggling?: boolean
  isDeleting?: boolean
}

export function MyServiceCard({
  service,
  onToggle,
  onEdit,
  onDelete,
  isToggling = false,
  isDeleting = false,
}: MyServiceCardProps) {
  const rating = Number(service.rating_avg)
  const hasRating = Number.isFinite(rating) && rating > 0
  const actionsDisabled = isToggling || isDeleting

  return (
    <Card className="gap-0 overflow-hidden border-border/45 py-0 shadow-none transition-colors hover:border-primary/25">
      <CardContent className="p-0">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Briefcase size={18} strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold text-foreground">
                  {service.title}
                </h4>
                {service.category_name ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {service.category_name}
                  </p>
                ) : null}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  service.is_active
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {service.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>

            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {service.description}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {formatPrice(service)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={12} aria-hidden />
                {formatDuration(service.duration_minutes)}
              </span>
              {service.is_on_site ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} aria-hidden />
                  até {service.max_distance_km} km
                </span>
              ) : null}
              {hasRating ? (
                <span className="inline-flex items-center gap-1">
                  <Star size={12} className="text-amber-500" aria-hidden />
                  {rating.toFixed(1)}
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {service.is_remote ? (
                <span className="rounded-md bg-muted/80 px-2 py-0.5 text-[10px] text-muted-foreground">
                  Remoto
                </span>
              ) : null}
              {service.is_on_site ? (
                <span className="rounded-md bg-muted/80 px-2 py-0.5 text-[10px] text-muted-foreground">
                  No local
                </span>
              ) : null}
              <span className="rounded-md bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                {service.views_count} vistas
              </span>
              <span className="rounded-md bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                {service.bookings_count} reservas
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/40 bg-muted/20 px-4 py-3">
          {onToggle ? (
            <label className="flex cursor-pointer items-center gap-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                {service.is_active ? "Visível" : "Oculto"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={service.is_active}
                aria-label={service.is_active ? "Desativar serviço" : "Ativar serviço"}
                disabled={actionsDisabled}
                onClick={() => onToggle(service.id)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
                  service.is_active ? "bg-primary" : "bg-muted-foreground/25"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-flex size-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform",
                    service.is_active ? "translate-x-[22px]" : "translate-x-0.5",
                    isToggling && "scale-90"
                  )}
                >
                  {isToggling ? (
                    <Loader2 size={12} className="animate-spin text-primary" aria-hidden />
                  ) : null}
                </span>
              </button>
            </label>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1">
            {onEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                disabled={actionsDisabled}
                onClick={() => onEdit(service)}
                aria-label="Atualizar serviço"
              >
                <Pencil size={14} />
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                disabled={actionsDisabled}
                onClick={() => onDelete(service.id)}
                aria-label="Eliminar serviço"
              >
                {isDeleting ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                ) : (
                  <Trash2 size={14} />
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
