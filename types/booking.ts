export interface CreateBookingPayload {
  professional_id: string
  service_id: string
  scheduled_start: string
  scheduled_end: string
  description: string
}

export interface MarketplaceBooking {
  id?: string
  professional_id?: string
  service_id?: string
  scheduled_start?: string
  scheduled_end?: string
  description?: string
  status?: string
  created_at?: string
}

export interface MarketplaceBookingListItem {
  id?: string
  client_id?: string
  professional_id?: string
  service_id?: string
  status?: string
  scheduled_start?: string
  scheduled_end?: string
  total_price?: string | number
  deposit_amount?: string | number
  deposit_paid?: boolean
  description?: string
  is_remote?: boolean
  professional_name?: string
  profile_photo_url?: string | null
  service_title?: string
  updated_at?: string
}

export interface MarketplaceBookingsPagination {
  page?: number
  limit?: number
  total?: number
  pages?: number
}

export interface MarketplaceBookingsListResponse {
  success: boolean
  data: MarketplaceBookingListItem[]
  pagination?: MarketplaceBookingsPagination
}

export interface CreateBookingResponse {
  success?: boolean
  message?: string
  data?: MarketplaceBooking
  booking?: MarketplaceBooking
}
