/** Payload para criar/atualizar perfil profissional (POST /professional/profile) */
export interface ProfessionalProfileRequest {
  user_id: string
  hourly_rate: number
  bio: string
  is_available: boolean
}

export interface ProfessionalProfileResponse {
  message?: string
  success?: boolean
  data?: Record<string, unknown>
}
