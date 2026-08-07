import { NextRequest, NextResponse } from "next/server"
import type {
  ApiErrorResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url.replace(/\/$/, "")
}

/** POST /api/auth/refresh-token → POST {API}/auth/refresh-token */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RefreshTokenRequest
    const refreshToken = body.refreshToken?.trim()

    if (!refreshToken) {
      return NextResponse.json(
        { message: "O refresh token é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const endpoint = `${getBaseUrl()}/auth/refresh-token`
    const payload: RefreshTokenRequest = { refreshToken }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    const data = (await res.json().catch(() => ({}))) as
      | RefreshTokenResponse
      | ApiErrorResponse

    if (!res.ok) {
      const message =
        data &&
        typeof data === "object" &&
        "message" in data &&
        typeof (data as ApiErrorResponse).message === "string"
          ? (data as ApiErrorResponse).message
          : "Não foi possível renovar a sessão. Tente novamente."
      return NextResponse.json({ message } satisfies ApiErrorResponse, {
        status: res.status,
      })
    }

    return NextResponse.json(data as RefreshTokenResponse, { status: res.status })
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
