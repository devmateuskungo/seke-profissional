import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import { getApiBaseUrl, getAuthorizationHeader } from "@/lib/api-profile-proxy"

/** PATCH /api/marketplace/services/:id/toggle — proxy para API externa PATCH /marketplace/services/:id/toggle */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const { id } = await context.params
    const trimmed = id?.trim()
    if (!trimmed) {
      return NextResponse.json(
        { message: "ID do serviço inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const endpoint = `${getApiBaseUrl()}/marketplace/services/${encodeURIComponent(trimmed)}/toggle`
    const res = await fetch(endpoint, {
      method: "PATCH",
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
        "Não foi possível alterar o estado do serviço."
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
