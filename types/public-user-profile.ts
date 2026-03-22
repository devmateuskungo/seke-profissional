/** Resposta de GET /api/users/:id — perfil público */
export interface PublicUserProfileStats {
  posts: number
  followers: number
  following: number
}

export interface PublicUserProfile {
  id: string | number
  name: string
  avatar?: string | null
  bio?: string | null
  location?: string | null
  member_since?: string | null
  stats?: PublicUserProfileStats
  /** Presente quando o cliente envia Authorization */
  is_following?: boolean
}
