import { NextRequest } from "next/server"
import { proxyProfileRequest } from "@/lib/api-profile-proxy"

/** PUT /api/profile/password — altera palavra-passe do utilizador */
export async function PUT(request: NextRequest) {
  return proxyProfileRequest(request, {
    method: "PUT",
    subPath: "/password",
    errorFallback: "Falha ao alterar a palavra-passe.",
  })
}
