import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url
}

const getAuthProfilePath = (): string =>
  process.env.API_AUTH_PROFILE_PATH?.trim() ||
  process.env.API_AUTH_USER_PROFILE_PATH?.trim() ||
  process.env.API_PROFILE_PATH?.trim() ||
  "/profile" /* {NEXT_PUBLIC_URL_API}/profile → .../api/profile */

const getAuthorizationHeader = (
  request: NextRequest
): { ok: true; value: string } | { ok: false; response: NextResponse } => {
  const authorization = request.headers.get("authorization")
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Token de autorização ausente ou inválido." } satisfies ApiErrorResponse,
        { status: 401 }
      ),
    }
  }

  return { ok: true, value: authorization }
}

/** GET /api/auth/profile — retorna perfil do utilizador autenticado (proxy para API externa) */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl()
    const path = getAuthProfilePath()
    const endpoint = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`

    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

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
        "Falha ao carregar o perfil."
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
      { message: "Erro interno ao carregar o perfil." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}

/** PUT /api/auth/profile — atualiza perfil do utilizador autenticado (proxy para API externa) */
export async function PUT(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl()
    const path = getAuthProfilePath()
    const endpoint = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`

    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const body = await request.json().catch(() => null)

    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: auth.value,
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
