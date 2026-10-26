import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse, ResetPasswordRequest } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API_AUTH?.trim()
  if (url) return url
  const fallback = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!fallback) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return fallback
}

const getResetPasswordEndpoint = (): string => {
  const baseUrl = getBaseUrl()
  const usesAuthBase = Boolean(process.env.NEXT_PUBLIC_URL_API_AUTH?.trim())
  const path = usesAuthBase
    ? "/iam-auth?action=reset-password-otp"
    : "/auth/reset-password"
  return `${baseUrl.replace(/\/$/, "")}${path}`
}

/** POST /api/auth/reset-password → iam-auth?action=reset-password (ou {API}/auth/reset-password) */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ResetPasswordRequest>
    const email = body.email?.trim()
    const otp = body.otp?.trim()
    const newPassword = body.newPassword?.trim()

    if (!email) {
      return NextResponse.json(
        { message: "O e-mail é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }
    if (!otp) {
      return NextResponse.json(
        { message: "O código de recuperação é obrigatório." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }
    if (!newPassword) {
      return NextResponse.json(
        { message: "A nova senha é obrigatória." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const endpoint = getResetPasswordEndpoint()
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword } satisfies ResetPasswordRequest),
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))
    const message =
      data && typeof data === "object" && "message" in data
        ? (data as { message?: unknown }).message
        : undefined

    if (!res.ok) {
      return NextResponse.json(
        {
          message:
            typeof message === "string" && message.trim()
              ? message
              : "Não foi possível redefinir a senha. Tente novamente.",
        } satisfies ApiErrorResponse,
        { status: res.status }
      )
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