import { NextRequest, NextResponse } from "next/server"
import type { RegisterRequest, RegisterResponse, ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url
}

/** POST /api/auth/credentials/register - Proxy para a API externa (auth/register) */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterRequest

    const { name, email, password } = body

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        {
          message: "Nome, e-mail e senha são obrigatórios.",
        } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const baseUrl = getBaseUrl()
    const registerEndpoint = `${baseUrl}/auth/register`

    const payload: RegisterRequest = {
      name: name.trim(),
      email: email.trim(),
      password,
    }

    const res = await fetch(registerEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = (await res.json().catch(() => ({}))) as RegisterResponse | ApiErrorResponse

    if (!res.ok) {
      const message =
        "message" in data && typeof data.message === "string"
          ? data.message
          : "Falha ao criar conta. Tente novamente."
      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    return NextResponse.json(data as RegisterResponse)
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
