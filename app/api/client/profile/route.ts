import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import { getApiBaseUrl, getAuthorizationHeader } from "@/lib/api-profile-proxy"

function clientProfileEndpoint(): string {
  return `${getApiBaseUrl()}/client/profile`
}

/** POST /api/client/profile — criar perfil de cliente a partir de perfil profissional */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const body = await request.json().catch(() => null)
    const userId =
      body && typeof body === "object" && typeof body.user_id === "string"
        ? body.user_id.trim()
        : ""

    if (!userId) {
      return NextResponse.json(
        { message: "O campo user_id é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const res = await fetch(clientProfileEndpoint(), {
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
        "Falha ao criar perfil de cliente."
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
