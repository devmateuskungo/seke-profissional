import { NextRequest, NextResponse } from "next/server"
import type { LoginRequest, LoginResponse, ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.URL_API?.trim()
  if (!url) {
    throw new Error("URL_API não configurada no .env")
  }
  return url
}

/** POST /api/auth/credentials/login - Proxy para a API externa usando URL_API */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequest

    const { email, password } = body

    if (!email?.trim() || !password) {
      return NextResponse.json(
        {
          message: "E-mail e senha são obrigatórios.",
        } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const baseUrl = getBaseUrl()
    const loginEndpoint = `${baseUrl}/auth/login`

    const payload: LoginRequest = {
      email: email.trim(),
      password,
    }

    const res = await fetch(loginEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = (await res.json().catch(() => ({}))) as LoginResponse | ApiErrorResponse

    if (!res.ok) {
      const message =
        "message" in data && typeof data.message === "string"
          ? data.message
          : "Falha ao fazer login. Tente novamente."
      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    return NextResponse.json(data as LoginResponse)
  } catch (err) {
    if (err instanceof Error && err.message.includes("URL_API")) {
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
