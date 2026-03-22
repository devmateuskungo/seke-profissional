/** Corpo enviado em POST /api/posts */
export interface CreatePostRequest {
  content: string
  /** Opcional: URL, base64 ou data URL, conforme a API */
  image?: string
}

/** Resposta de sucesso { post } */
export interface CreatePostResponse {
  post: PostRecord
}

/** Corpo enviado em PUT /api/posts/:id */
export interface UpdatePostRequest {
  content: string
  /** Nova imagem (data URL, etc.); omitir para manter; `null` para remover */
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
  image?: string | null
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
