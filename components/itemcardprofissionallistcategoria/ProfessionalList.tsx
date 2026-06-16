"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import ItemlistcategoriaProfissional from "./itemlistcagoriaprofissional";
import ProfessionalListFilters from "./professional-list-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { lightTheme } from "@/style/light";
import { getClientGeolocation, type GeoCoords } from "@/lib/geolocation";
import {
  buildProfessionalCategoryMap,
  fetchMarketplaceCategories,
  fetchMarketplaceServices,
} from "@/lib/marketplace-client";
import { applyProfessionalFilters } from "@/lib/professional-distance";
import { fetchProfessionals } from "@/lib/professionals-client";
import type { ProfessionalListItem } from "@/types/professional";
import type { MarketplaceCategory } from "@/types/marketplace";
import { ProfessionalCardSkeletonGrid } from "./professional-card-skeleton";

const ITEMS_PER_PAGE = 30;
const DEFAULT_MAX_DISTANCE_KM = 50;

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("auth_token");
}

export default function ProfessionalList() {
  const [rawProfessionals, setRawProfessionals] = useState<
    ProfessionalListItem[]
  >([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [professionalCategoryIds, setProfessionalCategoryIds] = useState<
    Map<string, Set<string>>
  >(new Map());

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [province, setProvince] = useState("");
  const [sortByNearest, setSortByNearest] = useState(false);
  const [maxDistanceKm, setMaxDistanceKm] = useState(DEFAULT_MAX_DISTANCE_KM);
  const [clientCoords, setClientCoords] = useState<GeoCoords | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getSessionToken();

    void fetchMarketplaceCategories(token ?? undefined).then((result) => {
      if (cancelled) return;
      if (result.success) setCategories(result.data);
      setCategoriesLoading(false);
    });

    void fetchMarketplaceServices({ token: token ?? undefined }).then(
      (result) => {
        if (cancelled) return;
        if (result.success) {
          setProfessionalCategoryIds(
            buildProfessionalCategoryMap(result.data)
          );
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshClientLocation = useCallback(async () => {
    setGeoLoading(true);
    setGeoError(null);
    const result = await getClientGeolocation();
    setGeoLoading(false);

    if (result.success) {
      setClientCoords(result.coords);
      return result.coords;
    }

    setClientCoords(null);
    setGeoError(result.message);
    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = getSessionToken();
      const result = await fetchProfessionals({
        page,
        limit: ITEMS_PER_PAGE,
        token: token ?? undefined,
        category_id: selectedCategoryId ?? undefined,
        province: province.trim() || undefined,
        latitude: sortByNearest ? clientCoords?.latitude : undefined,
        longitude: sortByNearest ? clientCoords?.longitude : undefined,
        radius_km: sortByNearest ? maxDistanceKm : undefined,
        sort: sortByNearest ? "distance" : undefined,
      });

      if (cancelled) return;

      if (result.success) {
        const { professionals: items, total_pages } = result.data;
        setRawProfessionals((prev) => (page === 1 ? items : [...prev, ...items]));
        setTotalPages(total_pages);
        setError(null);
      } else {
        setError(result.error);
        if (page === 1) {
          setRawProfessionals([]);
        }
      }

      setIsLoading(false);
      setIsLoadingMore(false);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    page,
    reloadKey,
    selectedCategoryId,
    province,
    sortByNearest,
    clientCoords,
    maxDistanceKm,
  ]);

  const professionals = useMemo(
    () =>
      applyProfessionalFilters({
        items: rawProfessionals,
        categoryId: selectedCategoryId,
        province,
        clientCoords: sortByNearest ? clientCoords : null,
        sortByNearest,
        maxDistanceKm,
        professionalCategoryIds,
      }),
    [
      rawProfessionals,
      selectedCategoryId,
      province,
      sortByNearest,
      clientCoords,
      maxDistanceKm,
      professionalCategoryIds,
    ]
  );

  const hasActiveFilters =
    selectedCategoryId !== null ||
    province.trim() !== "" ||
    sortByNearest;

  const hasMore = page < totalPages;

  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setPage(1);
    setRawProfessionals([]);
    setIsLoading(true);
    setIsLoadingMore(false);
    setReloadKey((prev) => prev + 1);
  }, []);

  const resetList = useCallback(() => {
    setPage(1);
    setRawProfessionals([]);
    setIsLoading(true);
    setIsLoadingMore(false);
    setReloadKey((prev) => prev + 1);
  }, []);

  const handleCategoryChange = useCallback(
    (categoryId: string | null) => {
      setSelectedCategoryId(categoryId);
      resetList();
    },
    [resetList]
  );

  const handleProvinceChange = useCallback(
    (value: string) => {
      setProvince(value);
      resetList();
    },
    [resetList]
  );

  const handleSortByNearestChange = useCallback(
    (value: boolean) => {
      setSortByNearest(value);
      if (!value) {
        setClientCoords(null);
        setGeoError(null);
      } else {
        void refreshClientLocation();
      }
      resetList();
    },
    [resetList, refreshClientLocation]
  );

  const handleMaxDistanceKmChange = useCallback((value: number) => {
    setMaxDistanceKm(value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCategoryId(null);
    setProvince("");
    setSortByNearest(false);
    setMaxDistanceKm(DEFAULT_MAX_DISTANCE_KM);
    setClientCoords(null);
    setGeoError(null);
    resetList();
  }, [resetList]);

  const countLabel =
    isLoading && professionals.length === 0
      ? "A carregar profissionais…"
      : professionals.length === 1
        ? "1 profissional encontrado"
        : `${professionals.length} profissionais encontrados`;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <ProfessionalListFilters
            categories={categories}
            categoriesLoading={categoriesLoading}
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={handleCategoryChange}
            province={province}
            onProvinceChange={handleProvinceChange}
            sortByNearest={sortByNearest}
            onSortByNearestChange={handleSortByNearestChange}
            maxDistanceKm={maxDistanceKm}
            onMaxDistanceKmChange={handleMaxDistanceKmChange}
            geoLoading={geoLoading}
            geoError={geoError}
            onRefreshLocation={() => void refreshClientLocation()}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </aside>

        <div className="flex flex-col items-center gap-6 lg:col-span-9">
          {isLoading && professionals.length === 0 ? (
            <Skeleton className="h-5 w-44 self-start" />
          ) : (
            <p className="w-full font-bold text-gray-600">{countLabel}</p>
          )}

          {isLoading && professionals.length === 0 ? (
            <ProfessionalCardSkeletonGrid count={6} />
          ) : error && professionals.length === 0 ? (
            <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white px-6 py-8 text-center">
              <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
                <AlertCircle className="size-6" aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                Não foi possível carregar os profissionais
              </h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <Button
                type="button"
                onClick={handleRetry}
                className="mt-5 gap-2 text-white"
                style={{ backgroundColor: lightTheme.colors.primary }}
              >
                <RefreshCcw className="size-4" aria-hidden />
                Tentar novamente
              </Button>
            </div>
          ) : professionals.length === 0 ? (
            <div className="w-full rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
              <p className="text-sm text-gray-500">
                Nenhum profissional encontrado com estes filtros.
              </p>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={handleClearFilters}
                >
                  Limpar filtros
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 justify-items-center">
                {professionals.map((pro) => (
                  <ItemlistcategoriaProfissional
                    key={pro.id}
                    professionalId={pro.id}
                    name={pro.full_name}
                    image={pro.profile_photo_url}
                    rating={Number(pro.rating_avg) || 0}
                    verified={pro.is_verified}
                    price={Number(pro.hourly_rate) || 0}
                    bio={pro.bio}
                    province={pro.province}
                    municipality={pro.municipality}
                    isAvailable={pro.is_available}
                    totalReviews={pro.total_reviews}
                    distanceKm={pro.distance_km}
                  />
                ))}
              </div>

              {hasMore && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="cursor-pointer rounded-lg px-6 py-3 text-[#2b81e5] transition hover:bg-[#dceffd] disabled:opacity-60"
                >
                  {isLoadingMore ? "A carregar…" : "Ver mais profissionais"}
                </button>
              )}
            </>
          )}

          {error && professionals.length > 0 ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
