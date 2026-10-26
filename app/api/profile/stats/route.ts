import { NextRequest } from "next/server"
import { proxyProfileRequest } from "@/lib/api-profile-proxy"

/** GET /api/profile/stats?user_id= — estatísticas do perfil */
export async function GET(request: NextRequest) {
  return proxyProfileRequest(request, {
    method: "GET",
    subPath: "/stats",
    errorFallback: "Falha ao carregar as estatísticas do perfil.",
  })
}
