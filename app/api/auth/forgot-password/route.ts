import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse, ForgotPasswordRequest } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API_AUTH?.trim()
  if (url) return url
  const fallback = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!fallback) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return fallback
}

const getForgotPasswordEndpoint = (): string => {
  const baseUrl = getBaseUrl()
  const usesAuthBase = Boolean(process.env.NEXT_PUBLIC_URL_API_AUTH?.trim())
  const path = usesAuthBase
    ? "/iam-auth?action=forgot-password"
    : "/auth/forgot-password"
  return `${baseUrl.replace(/\/$/, "")}${path}`
}

/** POST /api/auth/forgot-password → iam-auth?action=forgot-password (ou {API}/auth/forgot-password) */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ForgotPasswordRequest
    const email = body.email?.trim()

    if (!email) {
      return NextResponse.json(
        { message: "O e-mail é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const endpoint = getForgotPasswordEndpoint()
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        data &&
        typeof data === "object" &&
        "message" in data &&
        typeof (data as ApiErrorResponse).message === "string"
          ? (data as ApiErrorResponse).message
          : "Não foi possível enviar o código. Tente novamente."
      return NextResponse.json({ message } satisfies ApiErrorResponse, {
        status: res.status,
      })
    }

    return NextResponse.json(data, { status: res.status })
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
