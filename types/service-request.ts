export interface MarketplaceServiceRequest {
  id: string
  client_id: string
  category_id: string
  title: string
  description: string
  budget_min: string | number
  budget_max: string | number
  preferred_date: string
  is_urgent: boolean
  location_text: string
  latitude: string | number | null
  longitude: string | number | null
  status: string
  matched_professional_id: string | null
  booking_id: string | null
  expires_at: string
  created_at: string
  updated_at: string
  client_name?: string
  profile_photo_url?: string | null
  province?: string | null
  municipality?: string | null
  category_name?: string
  has_my_proposal?: boolean
  my_proposal_id?: string | null
  total_proposals?: string | number
}

export interface ServiceRequestPagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface MarketplaceServiceRequestsResponse {
  success: boolean
  data: MarketplaceServiceRequest[]
  pagination?: ServiceRequestPagination
  visibility_info?: {
    user_role?: string
    filter_applied?: string
  }
}

export interface CreateServiceRequestPayload {
  category_id: string
  title: string
  description: string
  budget_min: number
  budget_max: number
  preferred_date: string
  is_urgent: boolean
  location_text: string
  latitude: number
  longitude: number
}
