import { NextRequest } from "next/server"
import { proxyProfileRequest } from "@/lib/api-profile-proxy"

/**
 * PUT /api/profile/avatar
 * → PUT https://api-seke-v1.onrender.com/api/profile/avatar
 * Authorization: Bearer {token}
 */
export async function PUT(request: NextRequest) {
  return proxyProfileRequest(request, {
    method: "PUT",
    subPath: "/avatar",
    errorFallback: "Falha ao atualizar o avatar.",
  })
}
