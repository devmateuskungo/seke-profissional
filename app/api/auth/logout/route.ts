import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.URL_API?.trim()
  if (!url) {
    throw new Error("URL_API não configurada no .env")
  }
  return url
}

/** POST /api/auth/logout - Proxy para a API externa usando URL_API */
export async function POST(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl()
    const logoutEndpoint = `${baseUrl}/auth/logout`

    const authorization = request.headers.get("authorization")

    const res = await fetch(logoutEndpoint, {
      method: "POST",
      headers: {
        ...(authorization ? { Authorization: authorization } : {}),
      },
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Falha ao terminar sessão. Tente novamente."

      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof Error && err.message.includes("URL_API")) {
      return NextResponse.json(
        { message: "Configuração do servidor incompleta." } satisfies ApiErrorResponse,
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: "Erro interno ao terminar sessão." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}

