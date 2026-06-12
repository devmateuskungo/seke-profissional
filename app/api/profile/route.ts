import { NextRequest } from "next/server"
import { proxyProfileRequest } from "@/lib/api-profile-proxy"

/** GET /api/profile — perfil do utilizador autenticado */
export async function GET(request: NextRequest) {
  return proxyProfileRequest(request, {
    method: "GET",
    errorFallback: "Falha ao carregar o perfil.",
  })
}

/**
 * POST /api/profile — fallback quando o browser bloqueia GET com body.
 * Reencaminha como GET + `{ user_id }` para a API externa.
 */
export async function POST(request: NextRequest) {
  return proxyProfileRequest(request, {
    method: "POST",
    errorFallback: "Falha ao carregar o perfil.",
  })
}

/** PUT /api/profile — atualiza dados do perfil */
export async function PUT(request: NextRequest) {
  return proxyProfileRequest(request, {
    method: "PUT",
    errorFallback: "Falha ao atualizar o perfil.",
  })
}
