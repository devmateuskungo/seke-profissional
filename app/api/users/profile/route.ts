import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url
}

/** PUT /api/users/profile — atualiza o perfil do utilizador autenticado (proxy para API externa) */
export async function PUT(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl()
    /** Predefinição: `PUT {NEXT_PUBLIC_URL_API}/users/profile`. Sobrescreva com `API_USERS_PROFILE_PATH` (ex. `/api/users/profile`). */
    const path =
      process.env.API_USERS_PROFILE_PATH?.trim() || "/users/profile"
    const profileEndpoint = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`

    const authorization = request.headers.get("authorization")

    if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        {
          message: "Token de autorização ausente ou inválido.",
        } satisfies ApiErrorResponse,
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => null)

    const res = await fetch(profileEndpoint, {
      method: "PUT",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: body != null ? JSON.stringify(body) : "{}",
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Falha ao atualizar o perfil."

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
      { message: "Erro interno ao atualizar o perfil." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
