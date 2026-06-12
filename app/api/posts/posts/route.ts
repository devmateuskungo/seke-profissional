import { NextRequest } from "next/server"
import { proxyExternalPostsList } from "@/lib/external-posts-list-proxy"

/** GET /api/posts/posts?page=&limit= — lista de posts (proxy para a API externa). */
export async function GET(request: NextRequest) {
  return proxyExternalPostsList(request, "Erro interno ao carregar as publicações.")
}
