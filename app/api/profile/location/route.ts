import { NextRequest } from "next/server"
import { proxyProfileRequest } from "@/lib/api-profile-proxy"

/** PUT /api/profile/location — atualiza localização do utilizador */
export async function PUT(request: NextRequest) {
  return proxyProfileRequest(request, {
    method: "PUT",
    subPath: "/location",
    errorFallback: "Falha ao atualizar a localização.",
  })
}
