export interface MarketplaceCategory {
  id: string
  name: string
  slug: string
  description: string
  icon: string | null
  parent_id: string | null
  display_order: number
  is_active: boolean
}

export interface MarketplaceCategoriesResponse {
  success: boolean
  data: MarketplaceCategory[]
}

export interface MarketplaceService {
  id: string
  professional_id: string
  category_id: string
  title: string
  description: string
  price: string | number
  price_unit: "fixed" | "hourly" | string
  duration_minutes: number
  is_remote: boolean
  is_on_site: boolean
  requires_equipment?: boolean
  max_distance_km: number
  is_active: boolean
  views_count: number
  bookings_count: number
  rating_avg: string | number
  created_at: string
  updated_at: string
  version?: number
  category_name?: string
  category_slug?: string
}

export interface MarketplaceMyServicesResponse {
  success: boolean
  data: MarketplaceService[]
}
