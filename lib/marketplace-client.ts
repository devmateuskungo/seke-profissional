import type { ApiErrorResponse } from "@/types/auth"
import type {
  MarketplaceCategoriesResponse,
  MarketplaceCategory,
  MarketplaceMyServicesResponse,
  MarketplaceService,
  MarketplaceServicesListResponse,
} from "@/types/marketplace"

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_URL_API?.trim()
const CATEGORIES_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/marketplace/categories`
  : "/api/marketplace/categories"
const MY_SERVICES_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/marketplace/my-services`
  : "/api/marketplace/my-services"
const SERVICES_API = EXTERNAL_API_BASE
  ? `${EXTERNAL_API_BASE}/marketplace/services`
  : "/api/marketplace/services"

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

function extractMarketplaceServicesList(raw: unknown): MarketplaceService[] {
  if (!raw || typeof raw !== "object") return []
  const root = raw as Record<string, unknown>

  const candidates: unknown[] = []
  if (Array.isArray(root.data)) candidates.push(root.data)
  if (Array.isArray(root.services)) candidates.push(root.services)

  if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
    const nested = root.data as Record<string, unknown>
    if (Array.isArray(nested.data)) candidates.push(nested.data)
    if (Array.isArray(nested.services)) candidates.push(nested.services)
  }

  for (const list of candidates) {
    if (!Array.isArray(list)) continue
    const services = list.filter(isMarketplaceService)
    if (services.length > 0) return services
  }

  return []
}

/** Mantém só serviços que pertencem ao profissional (id do perfil ou user_id). */
export function filterServicesForProfessional(
  services: MarketplaceService[],
  professional: { id: string; user_id?: string }
): MarketplaceService[] {
  const profileId = professional.id.trim()
  const userId = professional.user_id?.trim() ?? ""

  return services.filter((service) => {
    const ownerId = String(service.professional_id ?? "").trim()
    if (!ownerId) return false
    return ownerId === profileId || (userId !== "" && ownerId === userId)
  })
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
  const services = extractMarketplaceServicesList(data)

  return { success: true, data: services }
}

export type FetchMarketplaceServicesOutcome =
  | { success: true; data: MarketplaceService[] }
  | { success: false; error: string; statusCode?: number }

export async function fetchMarketplaceServices(options?: {
  token?: string
  category_id?: string
  professional_id?: string
}): Promise<FetchMarketplaceServicesOutcome> {
  const params = new URLSearchParams()
  if (options?.category_id?.trim()) {
    params.set("category_id", options.category_id.trim())
  }
  if (options?.professional_id?.trim()) {
    params.set("professional_id", options.professional_id.trim())
  }

  const headers: HeadersInit = { Accept: "application/json" }
  if (options?.token?.trim()) {
    headers.Authorization = `Bearer ${options.token.trim()}`
  }

  const url = params.toString()
    ? `${SERVICES_API}?${params}`
    : SERVICES_API

  const res = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  const raw = (await res.json().catch(() => ({}))) as
    | MarketplaceServicesListResponse
    | ApiErrorResponse

  if (!res.ok) {
    const message =
      "message" in raw && typeof raw.message === "string"
        ? raw.message
        : "Não foi possível carregar os serviços."
    return {
      success: false,
      error: message,
      statusCode: res.status,
    }
  }

  const services = extractMarketplaceServicesList(raw)

  return { success: true, data: services }
}

/** Serviços reais de um profissional — filtra no cliente se a API devolver a lista completa. */
export async function fetchProfessionalMarketplaceServices(
  professional: { id: string; user_id?: string },
  token?: string
): Promise<FetchMarketplaceServicesOutcome> {
  const attempts: string[] = [professional.id.trim()]
  if (professional.user_id?.trim()) {
    attempts.push(professional.user_id.trim())
  }

  let lastError: FetchMarketplaceServicesOutcome = {
    success: false,
    error: "Não foi possível carregar os serviços.",
  }

  for (const professionalId of attempts) {
    const result = await fetchMarketplaceServices({
      professional_id: professionalId,
      token,
    })
    if (!result.success) {
      lastError = result
      continue
    }
    const filtered = filterServicesForProfessional(result.data, professional)
    if (filtered.length > 0) {
      return { success: true, data: filtered }
    }
  }

  const all = await fetchMarketplaceServices({ token })
  if (all.success) {
    const filtered = filterServicesForProfessional(all.data, professional)
    if (filtered.length > 0) {
      return { success: true, data: filtered }
    }
  }

  if (!lastError.success) return lastError
  return { success: true, data: [] }
}

export function buildProfessionalCategoryMap(
  services: MarketplaceService[]
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const service of services) {
    const professionalId = service.professional_id?.trim()
    const categoryId = service.category_id?.trim()
    if (!professionalId || !categoryId) continue
    if (!map.has(professionalId)) {
      map.set(professionalId, new Set())
    }
    map.get(professionalId)!.add(categoryId)
  }
  return map
}
