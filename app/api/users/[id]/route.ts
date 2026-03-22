import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url.replace(/\/$/, "")
}

/**
 * GET /api/users/:id — perfil público (proxy).
 * Encaminha `Authorization` opcional para `is_following`.
 * Path no backend: `{NEXT_PUBLIC_URL_API}{prefix}/{id}` — predefinição `prefix=/users` (ex.: `/users/42`).
 * Para `/api/users/:id` no backend: `API_USERS_BY_ID_PREFIX=/api/users`
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params
    const id = encodeURIComponent(rawId.trim())
    if (!id) {
      return NextResponse.json(
        { message: "ID inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const baseUrl = getBaseUrl()
    const prefix =
      process.env.API_USERS_BY_ID_PREFIX?.trim() || "/users"
    const path = prefix.startsWith("/") ? prefix : `/${prefix}`
    const profileEndpoint = `${baseUrl}${path}/${id}`

    const authorization = request.headers.get("authorization")
    const headers: HeadersInit = {
      Accept: "application/json",
    }
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      headers.Authorization = authorization
    }

    const res = await fetch(profileEndpoint, {
      method: "GET",
      headers,
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
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
