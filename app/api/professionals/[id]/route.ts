import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import { getApiBaseUrl } from "@/lib/api-profile-proxy"

/** GET /api/professionals/:id — proxy para API externa GET /professionals/:id */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const trimmed = id?.trim()
    if (!trimmed) {
      return NextResponse.json(
        { message: "ID do profissional inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const endpoint = `${getApiBaseUrl()}/professionals/${encodeURIComponent(trimmed)}`
    const authorization = request.headers.get("authorization")
    const headers: HeadersInit = { Accept: "application/json" }
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      headers.Authorization = authorization
    }

    const res = await fetch(endpoint, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Não foi possível carregar o perfil do profissional."
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
