"use client";

import { Loader2, MapPin, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProvinceSelect } from "@/components/province-select/province-select";
import { cn } from "@/lib/utils";
import type { MarketplaceCategory } from "@/types/marketplace";

interface ProfessionalListFiltersProps {
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
  geoLoading: boolean;
  geoError: string | null;
  onRefreshLocation: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
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
        "rounded-xl border border-gray-200 bg-white p-4 shadow-sm",
        className
      )}
    >
      <h2 className="mb-3 text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

export default function ProfessionalListFilters({
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
  geoLoading,
  geoError,
  onRefreshLocation,
  onClearFilters,
  hasActiveFilters,
}: ProfessionalListFiltersProps) {
  return (
    <div className="space-y-4 lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-gray-900">
          <SlidersHorizontal className="size-4" aria-hidden />
          <h2 className="text-base font-semibold">Filtros</h2>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#2b81e5] hover:underline"
          >
            <X className="size-3.5" aria-hidden />
            Limpar
          </button>
        ) : null}
      </div>

      <FilterCard title="Categorias" className="shadow-none">
        {categoriesLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
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

      <FilterCard title="Localização" className="shadow-none">
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

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
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
            <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <MapPin
                    className={cn(
                      "size-4 shrink-0 mt-0.5",
                      geoError ? "text-red-500" : "text-emerald-600"
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800">
                      A sua posição
                    </p>
                    {geoLoading ? (
                      <p className="text-xs text-gray-500 mt-0.5">
                        A obter localização…
                      </p>
                    ) : geoError ? (
                      <p className="text-xs text-red-600 mt-0.5">{geoError}</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Localização obtida com sucesso.
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-8"
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
                <Label
                  htmlFor="filter-radius"
                  className="text-xs text-gray-600"
                >
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

      {hasActiveFilters ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onClearFilters}
        >
          Limpar todos os filtros
        </Button>
      ) : (
        <p className="text-xs text-gray-500 leading-relaxed">
          Combine categoria e localização para encontrar o profissional ideal
          perto de si.
        </p>
      )}
    </div>
  );
}
