export type ServicePriceUnit = "fixed" | "hourly"

/** Payload para criar serviço (POST /marketplace/services) */
export interface CreateServiceRequest {
  category_id: string
  title: string
  description: string
  price: number
  price_unit: ServicePriceUnit
  duration_minutes: number
  is_remote: boolean
  is_on_site: boolean
  max_distance_km: number
}

export interface CreateServiceResponse {
  message?: string
  success?: boolean
  data?: Record<string, unknown>
}

/** Payload para atualizar serviço (PUT /marketplace/services/:id) */
export type UpdateServiceRequest = CreateServiceRequest

export interface UpdateServiceResponse {
  message?: string
  success?: boolean
  data?: Record<string, unknown>
}

export interface DeleteServiceResponse {
  message?: string
  success?: boolean
}

/** Resposta de PATCH /marketplace/services/:id/toggle */
export interface ToggleServiceResponse {
  message?: string
  success?: boolean
  data?: {
    id?: string
    is_active?: boolean
    [key: string]: unknown
  }
}
