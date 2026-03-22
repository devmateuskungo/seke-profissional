import type { PostDetail } from "@/types/post"

/** Metadados de paginação (campos opcionais conforme a API) */
export interface GlobalFeedPagination {
  page: number
  limit: number
  total?: number
  total_pages?: number
  totalPages?: number
  has_more?: boolean
  hasMore?: boolean
}

/** GET /feed/global — resposta típica */
export interface GlobalFeedResponse {
  posts: PostDetail[]
  pagination: GlobalFeedPagination
}
