import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse, LoginResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url
}

/** GET /api/auth/me - Retorna o utilizador atual a partir do token */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl()
    const meEndpoint = `${baseUrl}/auth/me`

    const authorization = request.headers.get("authorization")

    if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        {
          message: "Token de autorização ausente ou inválido.",
        } satisfies ApiErrorResponse,
        { status: 401 }
      )
    }

    const res = await fetch(meEndpoint, {
      method: "GET",
      headers: {
        Authorization: authorization,
      },
    })

    const data = (await res.json().catch(() => ({}))) as Pick<LoginResponse, "user"> | ApiErrorResponse

    if (!res.ok) {
      const message =
        "message" in data && typeof data.message === "string"
          ? data.message
          : "Falha ao obter dados do utilizador."

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
      { message: "Erro interno ao obter dados do utilizador." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}

