import type { CreateServiceRequest } from "@/types/service"

/** Payload para criar/atualizar perfil profissional (POST /professional/profile) */
export interface ProfessionalProfileRequest {
  user_id: string
  hourly_rate: number
  bio: string
  is_available: boolean
}

/** Dados recolhidos no cadastro profissional (inclui localização e serviços opcionais) */
export interface ProfessionalRegisterFormPayload extends ProfessionalProfileRequest {
  province?: string
  municipality?: string
  services?: CreateServiceRequest[]
}

export interface ProfessionalProfileResponse {
  message?: string
  success?: boolean
  data?: Record<string, unknown>
}

export interface ProfessionalListItem {
  id: string
  user_id: string
  is_verified: boolean
  hourly_rate: string | number | null
  is_available: boolean
  rating_avg: string | number
  total_reviews: number
  created_at: string
  updated_at: string
  version?: number
  full_name: string
  email?: string
  phone?: string | null
  profile_photo_url?: string | null
  province?: string | null
  municipality?: string | null
  bio?: string | null
  latitude?: string | number | null
  longitude?: string | number | null
  category_ids?: string[]
  /** Distância calculada no cliente (km). */
  distance_km?: number | null
}

export interface ProfessionalsListResponse {
  success: boolean
  professionals: ProfessionalListItem[]
  total_count: number
  total_pages: number
}

export interface ProfessionalDetail extends ProfessionalListItem {
  latitude?: number | null
  longitude?: number | null
}

export interface ProfessionalDetailResponse {
  success: boolean
  data: ProfessionalDetail
}
