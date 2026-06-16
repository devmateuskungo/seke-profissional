import type { GeoCoords } from "@/lib/geolocation"
import { normalizeProvinceSearch } from "@/lib/angola-provinces"
import type { ProfessionalListItem } from "@/types/professional"

const EARTH_RADIUS_KM = 6371

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export function getProfessionalCoords(
  professional: ProfessionalListItem
): GeoCoords | null {
  const latitude = toNumber(professional.latitude)
  const longitude = toNumber(professional.longitude)
  if (latitude == null || longitude == null) return null
  return { latitude, longitude }
}

export function haversineDistanceKm(
  from: GeoCoords,
  to: GeoCoords
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(to.latitude - from.latitude)
  const dLon = toRad(to.longitude - from.longitude)
  const lat1 = toRad(from.latitude)
  const lat2 = toRad(to.latitude)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

export interface ApplyProfessionalFiltersInput {
  items: ProfessionalListItem[]
  categoryId?: string | null
  province?: string
  clientCoords?: GeoCoords | null
  sortByNearest?: boolean
  maxDistanceKm?: number
  professionalCategoryIds?: Map<string, Set<string>>
}

export function applyProfessionalFilters({
  items,
  categoryId,
  province,
  clientCoords,
  sortByNearest = false,
  maxDistanceKm = 100,
  professionalCategoryIds,
}: ApplyProfessionalFiltersInput): ProfessionalListItem[] {
  let result = items.map((item) => ({ ...item }))

  if (categoryId?.trim()) {
    const id = categoryId.trim()
    result = result.filter((pro) => {
      if (pro.category_ids?.includes(id)) return true
      const fromServices = professionalCategoryIds?.get(pro.id)
      return fromServices?.has(id) ?? false
    })
  }

  const provinceQuery = province?.trim()
  if (provinceQuery) {
    const normalized = normalizeProvinceSearch(provinceQuery)
    result = result.filter((pro) => {
      const proProvince = pro.province?.trim()
      if (!proProvince) return false
      return normalizeProvinceSearch(proProvince).includes(normalized)
    })
  }

  if (clientCoords) {
    result = result.map((pro) => {
      const coords = getProfessionalCoords(pro)
      if (!coords) return { ...pro, distance_km: null }
      const distance_km = haversineDistanceKm(clientCoords, coords)
      return { ...pro, distance_km }
    })

    if (sortByNearest) {
      result.sort((a, b) => {
        const da = a.distance_km ?? Number.POSITIVE_INFINITY
        const db = b.distance_km ?? Number.POSITIVE_INFINITY
        return da - db
      })
    }

    if (sortByNearest && maxDistanceKm > 0 && clientCoords) {
      result = result.filter(
        (pro) =>
          pro.distance_km == null || pro.distance_km <= maxDistanceKm
      )
    }
  }

  return result
}
