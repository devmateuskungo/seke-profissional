/** Payload enviado no login (email + senha) */
export interface LoginRequest {
  email: string
  password: string
}

/** Resposta esperada da API de login em caso de sucesso */
export interface LoginResponse {
  token?: string
  accessToken?: string
  refreshToken?: string
  user?: {
    id: string
    email?: string
    name?: string
    username?: string
    image?: string
  }
  message?: string
}

/** Tipo de conta no registo */
export type RegisterRole = "client" | "professional"

/** Payload para registo de nova conta */
export interface RegisterRequest {
  email: string
  password: string
  full_name: string
  phone: string
  role: RegisterRole
}

/** Resposta esperada da API de registo em caso de sucesso */
export interface RegisterResponse {
  message?: string
  token?: string
  accessToken?: string
  user?: { id: string; name?: string; email?: string }
}

/** Utilizador devolvido por GET /api/profile */
export interface ProfileApiData {
  id: string
  full_name?: string
  email?: string
  phone?: string
  bio?: string | null
  profile_photo_url?: string | null
  latitude?: number | null
  longitude?: number | null
  province?: string | null
  municipality?: string | null
  status?: string
  email_verified?: boolean
  phone_verified?: boolean
  id_verified?: boolean
  roles?: string[]
  professional?: Record<string, unknown> | null
  client?: Record<string, unknown> | null
  admin?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

/** Resposta de GET /api/profile */
export interface ProfileApiResponse {
  success: boolean
  data: ProfileApiData
}

/** Payload para edição dos dados do utilizador (PUT /api/profile) */
export interface UpdateProfileRequest {
  user_id: string
  full_name: string
  phone: string
  bio: string
  province: string
  municipality: string
}

/** Payload para atualização do avatar (PUT /profile/avatar) */
export interface UpdateProfileAvatarRequest {
  user_id: string
  avatarUrl: string
}

/** Payload para atualização da localização (PUT /profile/location) */
export interface UpdateProfileLocationRequest {
  user_id: string
  latitude?: number
  longitude?: number
  province: string
  municipality: string
}

/** Payload para alteração de palavra-passe (PUT /profile/password) */
export interface UpdateProfilePasswordRequest {
  user_id: string
  currentPassword: string
  newPassword: string
}

/** Parâmetros para estatísticas do perfil (GET /profile/stats) */
export interface ProfileStatsRequest {
  user_id: string
}

/** Erro padrão retornado pela API */
export interface ApiErrorResponse {
  message: string
  statusCode?: number
  error?: string
  details?: Record<string, string[]>
}
