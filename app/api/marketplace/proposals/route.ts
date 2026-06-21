import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import { getApiBaseUrl, getAuthorizationHeader } from "@/lib/api-profile-proxy"

/** GET /api/marketplace/proposals — propostas enviadas pelo profissional */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const endpoint = `${getApiBaseUrl()}/marketplace/proposals`
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: auth.value,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Não foi possível carregar as propostas."
      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_PUBLIC_URL_API")) {
      return NextResponse.json(
        { message: "Configuração do servidor incompleta." } satisfies ApiErrorResponse,
        { status: 503 }
      )
    }
    return NextResponse.json(
      { message: "Erro interno. Tente novamente mais tarde." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
