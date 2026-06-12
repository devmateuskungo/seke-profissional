import { NextRequest } from "next/server"
import { proxyProfileRequest } from "@/lib/api-profile-proxy"

/** PUT /api/profile/avatar — atualiza avatar do utilizador */
export async function PUT(request: NextRequest) {
  return proxyProfileRequest(request, {
    method: "PUT",
    subPath: "/avatar",
    errorFallback: "Falha ao atualizar o avatar.",
  })
}
