import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url
}

const getProfilesMePath = (): string =>
  process.env.API_PROFILES_ME_PATH?.trim() ||
  process.env.API_PROFILE_PATH?.trim() ||
  "/profile"

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

/** GET /api/profiles/me — retorna o perfil do utilizador autenticado (proxy para API externa) */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl()
    const path = getProfilesMePath()
    const profileEndpoint = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`

    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const res = await fetch(profileEndpoint, {
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

/** PUT /api/profiles/me — atualiza o perfil do utilizador autenticado (proxy para API externa) */
export async function PUT(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl()
    const path = getProfilesMePath()
    const profileEndpoint = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`

    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const body = await request.json().catch(() => null)

    const res = await fetch(profileEndpoint, {
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
