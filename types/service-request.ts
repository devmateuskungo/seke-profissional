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

/** Métricas GET /marketplace/service-requests/stats/client */
export interface ServiceRequestStatusStat {
  count: number
  percentage: number
  totalBudget: number
}

export interface ClientRecentRequest {
  id: string
  title: string
  status: string
  created_at: string
  category_name?: string
}

export interface ClientServiceRequestStats {
  totalRequests: number
  totalBudget: number
  byStatus: Record<string, ServiceRequestStatusStat>
  recentRequests: ClientRecentRequest[]
}

export interface ProfessionalProposalStat {
  _id: string
  count: number
  totalValue: number
}

/** Métricas GET /marketplace/service-requests/stats/professional */
export interface ProfessionalServiceRequestStats {
  totalProposals: number
  totalValue: number
  proposalStats: ProfessionalProposalStat[]
  pendingRequests: number
  acceptedProposals: number
}

export interface ServiceRequestStatsResponse {
  success?: boolean
  message?: string
  data?: Record<string, unknown>
}

/** Proposta embutida em GET /marketplace/service-requests/:id */
export interface ServiceRequestProposalDetail {
  id: string
  professional_id: string
  price: number
  estimated_duration: number
  message: string | null
  status: string
  viewed_at?: string | null
  created_at?: string
  updated_at?: string
  professional_name?: string
  professional_email?: string
  professional_phone?: string
  professional_photo?: string | null
  professional_bio?: string
  professional_rating?: number
  professional_total_reviews?: number
  professional_is_verified?: boolean
  professional_is_available?: boolean
  professional_hourly_rate?: string | number | null
}

/** Detalhe GET /marketplace/service-requests/:id (cliente) */
export interface ServiceRequestDetail extends MarketplaceServiceRequest {
  client_email?: string
  client_phone?: string
  client_photo?: string | null
  client_province?: string
  client_municipality?: string
  category_icon?: string | null
  category_description?: string
  proposals: ServiceRequestProposalDetail[]
  pending_proposals?: string | number
  accepted_proposals?: string | number
  accepted_proposal_details?: unknown | null
  matched_professional_user_id?: string | null
  matched_professional_name?: string | null
  matched_professional_email?: string | null
  matched_professional_photo?: string | null
  matched_professional_rating?: number | null
  matched_professional_verified?: boolean | null
  booking_scheduled_start?: string | null
  booking_scheduled_end?: string | null
  booking_status?: string | null
  booking_total_price?: string | number | null
  booking_description?: string | null
}

export interface ServiceRequestDetailResponse {
  success?: boolean
  message?: string
  data?: ServiceRequestDetail
}
