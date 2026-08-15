/** Corpo enviado em POST /api/posts (proxy → POST …/posts na API externa) */
export interface CreatePostRequest {
  /** Texto da publicação (mapeado para `content_text`) */
  content: string
  visibility?: "public" | "private" | "followers"
  hashtags?: string[]
  /** Campos legados — ignorados em POST /posts; usados em rascunhos / publishPost */
  title?: string
  midia?: string[]
  image?: string
  media_urls?: string[]
  media_type?: "image" | "video"
}

/** Resposta de sucesso { post } */
export interface CreatePostResponse {
  post: PostRecord
}

/** Corpo enviado em PUT /api/posts/:id */
export interface UpdatePostRequest {
  content: string
  visibility?: "public" | "private" | "followers"
  hashtags?: string[]
  /**
   * URLs de média já existentes a manter (quando se misturam com ficheiros novos).
   * O proxy PUT descarrega e reenvia como `media`.
   */
  keepMediaUrls?: string[]
  /** Remover toda a média da publicação */
  removeMedia?: boolean
  /** @deprecated Preferir FormData `media` / keepMediaUrls */
  image?: string | null
}

/** Resposta de sucesso ao editar { post } */
export interface UpdatePostResponse {
  post: PostRecord
}

/** Resposta de DELETE /api/posts/:id — apagar própria publicação */
export interface DeletePostResponse {
  message: string
}

/** Resposta de POST ou DELETE /api/likes/post/:postId — dar ou remover like */
export interface LikePostResponse {
  liked: boolean
  total_likes: number
}

/** Resposta de POST /api/follow/:userId — seguir utilizador */
export interface FollowUserResponse {
  following: boolean
  message: string
}

/** Resposta de GET /api/follow/status/:userId — se segues este utilizador */
export interface FollowStatusResponse {
  is_following: boolean
}

/** Utilizador na lista de gostos (GET /api/likes/post/:postId) */
export interface PostLikeUser {
  id?: string
  name?: string
  avatar?: string | null
  [key: string]: unknown
}

/** Resposta de GET /api/likes/post/:postId — quem deu like (query ?page=&limit=) */
export interface PostLikesListResponse {
  users: PostLikeUser[]
  total: number
}

/** Forma mínima do post devolvido pela API (campos extra permitidos) */
export interface PostRecord {
  id?: string
  content?: string
  image?: string | null
  createdAt?: string
  userId?: string
  [key: string]: unknown
}

/** Utilizador associado a uma publicação (GET /posts/:id) */
export interface PostDetailUser {
  id: string
  name: string
  avatar?: string | null
}

/** Estatísticas da publicação */
export interface PostDetailStats {
  likes: number
  comments: number
}

/**
 * Uma publicação (detalhe) — alinhado a GET /api/posts/:id → GET …/posts/:id.
 *
 * Campos típicos na resposta JSON:
 * - `id`, `content`, `image`, `created_at`
 * - `user`: `{ id, name, avatar }`
 * - `stats`: `{ likes, comments }`
 * - `liked_by_me` quando o pedido envia `Authorization: Bearer …`
 */
export interface PostDetail {
  id: string
  content: string
  /** Título vindo da API (ex. GET /posts/posts) */
  title?: string | null
  image?: string | null
  media_type?: "image" | "video" | null
  /** Primeira URL de média (compatível com layouts de uma só imagem/vídeo) */
  media_url?: string | null
  /** Todas as URLs de imagem/vídeo (ex. GET /api/feed → `media_urls`) */
  media_urls?: string[]
  created_at: string
  user: PostDetailUser
  stats: PostDetailStats
  /** Presente quando o pedido inclui Authorization (utilizador autenticado) */
  liked_by_me?: boolean
  /** Já segues o autor desta publicação (feed com token, se a API enviar) */
  following_author?: boolean
}

/** Alias semântico — resposta de sucesso de GET /api/posts/:id */
export type GetPostResponse = PostDetail

/** Item em GET …/posts/allmyposts (listagem das próprias publicações na API externa) */
export interface MyPostSummary {
  id: number | string
  author_id?: number | string | null
  author_name?: string | null
  title?: string | null
  content: string
  slug?: string | null
  midia?: string[]
  status?: string
  views_count?: number
  published_at?: string | null
  created_at: string
  updated_at?: string | null
  user_id?: number | string | null
}

export interface MyPostsPagination {
  total: number
  page: number
  totalPages: number
}

/** Item em GET /api/posts/user/:id → GET …/posts/user/:id */
export interface UserPostListItem {
  id: string
  content: string
  media_urls: string[]
  media_type: "image" | "video" | null
  likes_count: number
  comments_count: number
  shares_count: number
  views_count: number
  created_at: string
  author_id: string | null
}

export interface UserPostsPagination {
  page: number
  limit: number
  total: number
}
