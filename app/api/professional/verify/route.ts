import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import type { ProfessionalVerifyRequest } from "@/types/professional"
import { getApiBaseUrl, getAuthorizationHeader } from "@/lib/api-profile-proxy"

/** POST /api/professional/verify — proxy para API externa */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const body = (await request.json()) as ProfessionalVerifyRequest
    const userId = typeof body.user_id === "string" ? body.user_id.trim() : ""

    if (!userId) {
      return NextResponse.json(
        { message: "O campo user_id é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const endpoint = `${getApiBaseUrl()}/professional/verify`
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: auth.value,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Falha ao solicitar a verificação da conta."
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
