"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import ItemlistcategoriaProfissional from "./itemlistcagoriaprofissional";
import { Button } from "@/components/ui/button";
import { lightTheme } from "@/style/light";
import { fetchProfessionals } from "@/lib/professionals-client";
import type { ProfessionalListItem } from "@/types/professional";
import { HomeFeedPostSkeleton } from "@/components/home/home-feed-skeleton";

const ITEMS_PER_PAGE = 30;

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("auth_token");
}

export default function ProfessionalList() {
  const [professionals, setProfessionals] = useState<ProfessionalListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = getSessionToken();
      const result = await fetchProfessionals({
        page,
        limit: ITEMS_PER_PAGE,
        token: token ?? undefined,
      });

      if (cancelled) return;

      if (result.success) {
        const { professionals: items, total_count, total_pages } = result.data;
        setProfessionals((prev) =>
          page === 1 ? items : [...prev, ...items]
        );
        setTotalCount(total_count);
        setTotalPages(total_pages);
        setError(null);
      } else {
        setError(result.error);
        if (page === 1) {
          setProfessionals([]);
        }
      }

      setIsLoading(false);
      setIsLoadingMore(false);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  const hasMore = page < totalPages;

  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setPage(1);
    setProfessionals([]);
    setIsLoading(true);
    setIsLoadingMore(false);
    setReloadKey((prev) => prev + 1);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-7xl mx-auto px-4">
      <p className="text-sm text-gray-600">
        {isLoading && professionals.length === 0
          ? "A carregar profissionais…"
          : `${totalCount} profissional${totalCount !== 1 ? "is" : ""} encontrado${totalCount !== 1 ? "s" : ""}`}
      </p>

      {isLoading && professionals.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="w-full max-w-[300px]">
              <HomeFeedPostSkeleton />
            </div>
          ))}
        </div>
      ) : error && professionals.length === 0 ? (
        <div className="w-full max-w-md rounded-lg bg-white px-6 py-8 text-center border border-gray-200">
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
        <p className="text-sm text-gray-500 py-12">
          Nenhum profissional encontrado no momento.
        </p>
      ) : (
        <>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full justify-items-center"
          >
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
              />
            ))}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="text-[#2b81e5] px-6 py-3 rounded-lg transition cursor-pointer hover:bg-[#dceffd] disabled:opacity-60"
            >
              {isLoadingMore ? "A carregar…" : "Ver mais profissionais"}
            </button>
          )}
        </>
      )}

      {error && professionals.length > 0 ? (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
