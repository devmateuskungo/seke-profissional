import type { CreateServiceRequest } from "@/types/service"

/** Payload para criar perfil profissional (POST /professional/profile) */
export interface ProfessionalProfileRequest {
  user_id: string
  hourly_rate: number
  bio: string
  is_available: boolean
}

/** Payload para actualizar perfil profissional (PUT /professional/profile) */
export interface ProfessionalProfileUpdateRequest {
  user_id: string
  hourly_rate?: number
  is_available?: boolean
}

/** Payload para actualizar só disponibilidade (PUT /professional/availability) */
export interface ProfessionalAvailabilityUpdateRequest {
  user_id: string
  is_available: boolean
}

/** Payload para pedir verificação (POST /professional/verify) */
export interface ProfessionalVerifyRequest {
  user_id: string
}

/** Parâmetro de GET /professional/profile */
export interface ProfessionalProfileGetRequest {
  user_id: string
}

/** Dados devolvidos por GET /professional/profile */
export interface ProfessionalProfileData {
  id: string
  user_id: string
  is_verified?: boolean
  hourly_rate?: string | number | null
  is_available?: boolean
  rating_avg?: string | number
  total_reviews?: number
  created_at?: string
  updated_at?: string
  version?: number
  full_name?: string
  email?: string
  phone?: string | null
  bio?: string | null
  profile_photo_url?: string | null
  province?: string | null
  municipality?: string | null
}

/** Dados recolhidos no cadastro profissional (inclui localização e serviços opcionais) */
export interface ProfessionalRegisterFormPayload extends ProfessionalProfileRequest {
  province?: string
  municipality?: string
  services?: CreateServiceRequest[]
}

/** Resposta de GET/PUT/POST /professional/profile */
export interface ProfessionalProfileResponse {
  message?: string
  success?: boolean
  data?: ProfessionalProfileData
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
  /** Presença em tempo real, se a API enviar. */
  is_online?: boolean
  last_seen_at?: string | null
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

/** Item devolvido por GET iam-professional?action=list-professionals */
export interface IamProfessionalListItem {
  id: string
  full_name: string
  bio?: string | null
  /** Avatar chega como data URI base64. */
  profile_photo_url?: string | null
  province?: string | null
  municipality?: string | null
  title?: string | null
  description?: string | null
  category?: string | null
  skills?: string[]
  hourly_rate?: string | number | null
  is_verified?: boolean
  is_available?: boolean
  rating_avg?: string | number
  total_reviews?: number
  location_precision?: string | null
  /** Só `get-public-profile` devolve coordenadas. */
  latitude?: number | null
  longitude?: number | null
  roles?: string[]
}

/** Resposta de GET iam-professional?action=get-public-profile */
export interface IamPublicProfileResponse {
  success?: boolean
  data?: {
    professional?: IamProfessionalListItem
    roles?: string[]
  }
}

/** Resposta de GET iam-professional?action=list-professionals */
export interface IamProfessionalsListResponse {
  success?: boolean
  data?: {
    professionals?: IamProfessionalListItem[]
    pagination?: {
      page?: number
      limit?: number
      total?: number
      total_pages?: number
      has_more?: boolean
    }
  }
}
