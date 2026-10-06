import { NextRequest, NextResponse } from "next/server"
import type { LoginRequest, LoginResponse, ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API_AUTH?.trim()
  if (url) return url
  const fallback = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!fallback) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return fallback
}

const getLoginEndpoint = (): string => {
  const baseUrl = getBaseUrl()
  const usesAuthBase = Boolean(process.env.NEXT_PUBLIC_URL_API_AUTH?.trim())
  const path = usesAuthBase ? "/iam-auth?action=login" : "/auth/login"
  return `${baseUrl.replace(/\/$/, "")}${path}`
}

/** POST /api/auth/credentials/login - Proxy para a API externa usando NEXT_PUBLIC_URL_API */
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

    const loginEndpoint = getLoginEndpoint()

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
      const record = data as Record<string, unknown>
      const message =
        typeof record.message === "string"
          ? record.message
          : typeof record.error === "string"
            ? record.error
            : "Falha ao fazer login. Tente novamente."
      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    return NextResponse.json(data as LoginResponse)
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
