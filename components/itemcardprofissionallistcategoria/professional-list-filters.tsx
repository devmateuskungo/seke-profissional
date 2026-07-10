"use client";

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Loader2,
  MapPin,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProvinceSelect } from "@/components/province-select/province-select";
import { cn } from "@/lib/utils";
import type { AvailabilityFilter } from "@/lib/professional-distance";
import type { MarketplaceCategory } from "@/types/marketplace";

export interface ProfessionalListFiltersProps {
  categories: MarketplaceCategory[];
  categoriesLoading: boolean;
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  province: string;
  onProvinceChange: (province: string) => void;
  sortByNearest: boolean;
  onSortByNearestChange: (value: boolean) => void;
  maxDistanceKm: number;
  onMaxDistanceKmChange: (value: number) => void;
  minPrice: string;
  onMinPriceChange: (value: string) => void;
  maxPrice: string;
  onMaxPriceChange: (value: string) => void;
  availability: AvailabilityFilter;
  onAvailabilityChange: (value: AvailabilityFilter) => void;
  geoLoading: boolean;
  geoError: string | null;
  onRefreshLocation: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount?: number;
}

function FilterCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-100 bg-white p-4",
        className
      )}
    >
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-gray-900">
        {title}
      </h2>
      {children}
    </div>
  );
}

function FiltersContent({
  categories,
  categoriesLoading,
  selectedCategoryId,
  onCategoryChange,
  province,
  onProvinceChange,
  sortByNearest,
  onSortByNearestChange,
  maxDistanceKm,
  onMaxDistanceKmChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  availability,
  onAvailabilityChange,
  geoLoading,
  geoError,
  onRefreshLocation,
  onClearFilters,
  hasActiveFilters,
  showHeader = true,
}: ProfessionalListFiltersProps & { showHeader?: boolean }) {
  return (
    <div className="space-y-4">
      {showHeader ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-gray-900">
            <SlidersHorizontal className="size-4 text-[#2b81e5]" aria-hidden />
            <h2 className="text-sm font-semibold tracking-tight">Filtros</h2>
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#2b81e5] transition-colors hover:bg-[#dceffd]"
            >
              <X className="size-3.5" aria-hidden />
              Limpar
            </button>
          ) : null}
        </div>
      ) : null}

      <FilterCard title="Categorias">
        {categoriesLoading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            A carregar…
          </div>
        ) : (
          <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
            <li>
              <button
                type="button"
                onClick={() => onCategoryChange(null)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  selectedCategoryId === null
                    ? "bg-[#dceffd] font-medium text-[#2b81e5]"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                Todas as categorias
              </button>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => onCategoryChange(category.id)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    selectedCategoryId === category.id
                      ? "bg-[#dceffd] font-medium text-[#2b81e5]"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {category.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </FilterCard>

      <FilterCard title="Localização">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="filter-province" className="text-xs text-gray-600">
              Província
            </Label>
            <ProvinceSelect
              id="filter-province"
              value={province}
              onChange={onProvinceChange}
              placeholder="Todas as províncias"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
            <input
              type="checkbox"
              checked={sortByNearest}
              onChange={(e) => onSortByNearestChange(e.target.checked)}
              className="mt-0.5 size-4 rounded border-gray-300"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-900">
                Mais próximos de mim
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                Usa a sua localização GPS para ordenar por distância.
              </span>
            </span>
          </label>

          {sortByNearest ? (
            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <MapPin
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      geoError ? "text-red-500" : "text-emerald-600"
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800">
                      A sua posição
                    </p>
                    {geoLoading ? (
                      <p className="mt-0.5 text-xs text-gray-500">
                        A obter localização…
                      </p>
                    ) : geoError ? (
                      <p className="mt-0.5 text-xs text-red-600">{geoError}</p>
                    ) : (
                      <p className="mt-0.5 text-xs text-gray-500">
                        Localização obtida com sucesso.
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0"
                  disabled={geoLoading}
                  onClick={onRefreshLocation}
                >
                  {geoLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  <span className="sr-only">Atualizar localização</span>
                </Button>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="filter-radius" className="text-xs text-gray-600">
                  Raio máximo: {maxDistanceKm} km
                </Label>
                <input
                  id="filter-radius"
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={maxDistanceKm}
                  onChange={(e) =>
                    onMaxDistanceKmChange(Number(e.target.value))
                  }
                  className="w-full accent-[#2b81e5]"
                />
              </div>
            </div>
          ) : null}
        </div>
      </FilterCard>

      <FilterCard title="Preço (Kz / hora)">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="filter-min-price" className="text-xs text-gray-600">
              Mínimo
            </Label>
            <Input
              id="filter-min-price"
              type="number"
              inputMode="decimal"
              min={0}
              step={100}
              placeholder="0"
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              className="h-9 rounded-lg text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="filter-max-price" className="text-xs text-gray-600">
              Máximo
            </Label>
            <Input
              id="filter-max-price"
              type="number"
              inputMode="decimal"
              min={0}
              step={100}
              placeholder="Sem limite"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              className="h-9 rounded-lg text-sm"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Filtra pela tarifa horária do profissional.
        </p>
      </FilterCard>

      <FilterCard title="Disponibilidade">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              onAvailabilityChange(availability === "today" ? null : "today")
            }
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 py-2.5 text-sm font-medium transition-colors",
              availability === "today"
                ? "border-[#2b81e5] bg-[#dceffd] text-[#2b81e5]"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            Hoje
          </button>
          <button
            type="button"
            onClick={() =>
              onAvailabilityChange(availability === "week" ? null : "week")
            }
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 py-2.5 text-sm font-medium transition-colors",
              availability === "week"
                ? "border-[#2b81e5] bg-[#dceffd] text-[#2b81e5]"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            Semana
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Mostra apenas profissionais marcados como disponíveis.
        </p>
      </FilterCard>

      {hasActiveFilters ? (
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl"
          onClick={onClearFilters}
        >
          Limpar todos os filtros
        </Button>
      ) : (
        <p className="text-xs leading-relaxed text-gray-500">
          Combine categoria, preço, disponibilidade e localização para
          encontrar o profissional ideal.
        </p>
      )}
    </div>
  );
}

/** Sidebar de filtros — desktop (lg+) */
export default function ProfessionalListFilters(props: ProfessionalListFiltersProps) {
  return (
    <div className="lg:sticky lg:top-5">
      <FiltersContent {...props} />
    </div>
  );
}

interface ProfessionalListFiltersDrawerProps extends ProfessionalListFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Painel lateral esquerdo — tablet/mobile */
export function ProfessionalListFiltersDrawer({
  open,
  onOpenChange,
  activeFilterCount = 0,
  hasActiveFilters,
  onClearFilters,
  ...props
}: ProfessionalListFiltersDrawerProps) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-100 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filters-panel-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/40"
        aria-label="Fechar filtros"
        onClick={close}
      />

      <aside className="absolute left-0 top-0 z-10 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-300">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-4">
          <div>
            <h2
              id="filters-panel-title"
              className="text-lg font-semibold text-gray-900"
            >
              Filtros
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Refine a sua pesquisa de profissionais
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="cursor-pointer rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <FiltersContent
            {...props}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={onClearFilters}
            showHeader={false}
          />
        </div>

        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="h-10 w-full rounded-lg bg-[#2b81e5] text-white hover:opacity-90"
              onClick={close}
            >
              Ver resultados
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-lg"
                onClick={() => {
                  onClearFilters();
                  close();
                }}
              >
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}

interface ProfessionalListFiltersTriggerProps {
  onClick: () => void;
  activeFilterCount: number;
}

/** Botão para abrir filtros — tablet/mobile */
export function ProfessionalListFiltersTrigger({
  onClick,
  activeFilterCount,
}: ProfessionalListFiltersTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-[#2b81e5]/5 hover:text-[#2b81e5]"
      aria-label="Abrir filtros"
    >
      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-md bg-[#dceffd] text-[#2b81e5]">
        <SlidersHorizontal className="size-4" aria-hidden />
        {activeFilterCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#2b81e5] text-[10px] font-semibold text-white">
            {activeFilterCount > 9 ? "9+" : activeFilterCount}
          </span>
        ) : null}
      </span>
      <span>Filtros</span>
      {activeFilterCount > 0 ? (
        <span className="text-xs text-gray-500">
          {activeFilterCount} activo{activeFilterCount !== 1 ? "s" : ""}
        </span>
      ) : null}
    </button>
  );
}
