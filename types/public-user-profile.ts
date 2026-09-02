/** Resposta de GET /api/users/:id — perfil público */
export interface PublicUserProfileStats {
  posts: number
  followers: number
  following: number
  reviews?: number
  rating_avg?: number
}

export type PublicUserRole = "client" | "professional" | "admin" | null

export interface PublicUserProfile {
  id: string | number
  name: string
  avatar?: string | null
  bio?: string | null
  email?: string | null
  phone?: string | null
  location?: string | null
  member_since?: string | null
  stats?: PublicUserProfileStats
  /** Presente quando o cliente envia Authorization */
  is_following?: boolean
  role?: PublicUserRole
  /** Dados do registo profissional, quando aplicável */
  professional?: {
    id?: string
    is_verified?: boolean
    hourly_rate?: number | string | null
    is_available?: boolean
    rating_avg?: number | string
    total_reviews?: number
  }
}