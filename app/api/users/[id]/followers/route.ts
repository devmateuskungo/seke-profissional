import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import { buildExternalUserSubResourceUrl } from "@/lib/api-users-external-url"

/**
 * GET /api/users/:id/followers — lista de seguidores (proxy).
 * Resposta típica: `{ followers: [], total }`
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params
    const id = rawId?.trim()
    if (!id) {
      return NextResponse.json(
        { message: "ID inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const target =
      buildExternalUserSubResourceUrl(id, "/followers") + request.nextUrl.search

    const authorization = request.headers.get("authorization")
    const headers: HeadersInit = {
      Accept: "application/json",
    }
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      headers.Authorization = authorization
    }

    const res = await fetch(target, { method: "GET", headers })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Falha ao obter seguidores."
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
      { message: "Erro interno ao obter seguidores." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
