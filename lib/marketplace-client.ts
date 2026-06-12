import type { ApiErrorResponse } from "@/types/auth"
import type {
  MarketplaceCategoriesResponse,
  MarketplaceCategory,
  MarketplaceMyServicesResponse,
  MarketplaceService,
} from "@/types/marketplace"

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_URL_API?.trim()
const CATEGORIES_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/marketplace/categories`
  : "/api/marketplace/categories"
const MY_SERVICES_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/marketplace/my-services`
  : "/api/marketplace/my-services"

export type FetchCategoriesOutcome =
  | { success: true; data: MarketplaceCategory[] }
  | { success: false; error: string; statusCode?: number }

export async function fetchMarketplaceCategories(
  token?: string
): Promise<FetchCategoriesOutcome> {
  const headers: HeadersInit = { Accept: "application/json" }
  if (token?.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`
  }

  const res = await fetch(CATEGORIES_API, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  const raw = (await res.json().catch(() => ({}))) as
    | MarketplaceCategoriesResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível carregar as categorias."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const data = raw as MarketplaceCategoriesResponse
  const categories = Array.isArray(data.data)
    ? data.data
        .filter(
          (item): item is MarketplaceCategory =>
            typeof item === "object" &&
            item !== null &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            item.is_active !== false
        )
        .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name))
    : []

  return { success: true, data: categories }
}

export type FetchMyServicesOutcome =
  | { success: true; data: MarketplaceService[] }
  | { success: false; error: string; statusCode?: number }

function isMarketplaceService(item: unknown): item is MarketplaceService {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as MarketplaceService).id === "string" &&
    typeof (item as MarketplaceService).title === "string"
  )
}

export async function fetchMyMarketplaceServices(
  token: string
): Promise<FetchMyServicesOutcome> {
  const res = await fetch(MY_SERVICES_API, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const raw = (await res.json().catch(() => ({}))) as
    | MarketplaceMyServicesResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível carregar os seus serviços."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const data = raw as MarketplaceMyServicesResponse
  const services = Array.isArray(data.data)
    ? data.data.filter(isMarketplaceService)
    : []

  return { success: true, data: services }
}
