import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import { buildExternalUserByIdUrl } from "@/lib/api-users-external-url"

/**
 * GET /api/users/:id — perfil público de outro utilizador (proxy).
 * Encaminha para `GET {NEXT_PUBLIC_URL_API}/users/{id}` da API externa.
 * `Authorization` opcional é propagado para campos como `is_following`.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params
    const userId = rawId.trim()
    if (!userId) {
      return NextResponse.json(
        { message: "ID inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const target = buildExternalUserByIdUrl(userId)

    const headers: HeadersInit = {
      Accept: "application/json",
    }

    const authorization = request.headers.get("authorization")
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      headers.Authorization = authorization
    }

    const res = await fetch(target, { method: "GET", headers, cache: "no-store" })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data &&
          typeof data === "object" &&
          "message" in data &&
          typeof (data as { message?: unknown }).message === "string" &&
          (data as { message: string }).message) ||
        "Perfil não encontrado."

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
      { message: "Erro interno ao obter o perfil." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
