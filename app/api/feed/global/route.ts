import { NextRequest } from "next/server"
import { proxyExternalPostsList } from "@/lib/external-posts-list-proxy"

/** GET /api/feed/global — mesmo proxy que `/api/posts/posts` (compatibilidade). */
export async function GET(request: NextRequest) {
  return proxyExternalPostsList(request, "Erro interno ao carregar o feed.")
}
