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

export interface CreateBookingResponse {
  success?: boolean
  message?: string
  data?: MarketplaceBooking
  booking?: MarketplaceBooking
}
