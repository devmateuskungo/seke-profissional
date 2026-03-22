import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url
}

/**
 * GET /api/notifications — proxy para GET …/notifications
 * Query: page, limit, unread_only (Authorization obrigatório).
 */
export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization")
    if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        {
          message: "Token de autorização ausente ou inválido.",
        } satisfies ApiErrorResponse,
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page")?.trim() || "1"
    const limit = searchParams.get("limit")?.trim() || "20"
    const unreadOnlyRaw = searchParams.get("unread_only")
    const unread_only =
      unreadOnlyRaw === "true" || unreadOnlyRaw === "1" ? "true" : "false"

    const qs = new URLSearchParams({
      page,
      limit,
      unread_only,
    })

    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/notifications?${qs.toString()}`

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
      },
      cache: "no-store",
    })

    const text = await res.text().catch(() => "")

    if (!res.ok) {
      let message = "Não foi possível carregar as notificações."
      if (text.trim()) {
        try {
          const err = JSON.parse(text) as { message?: string }
          if (typeof err.message === "string" && err.message) message = err.message
        } catch {
          /* ignore */
        }
      }
      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    if (!text.trim()) {
      return NextResponse.json(
        { message: "Resposta vazia do servidor." } satisfies ApiErrorResponse,
        { status: 502 }
      )
    }

    try {
      const data = JSON.parse(text) as unknown
      return NextResponse.json(data)
    } catch {
      return NextResponse.json(
        { message: "Resposta inválida do servidor." } satisfies ApiErrorResponse,
        { status: 502 }
      )
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_PUBLIC_URL_API")) {
      return NextResponse.json(
        { message: "Configuração do servidor incompleta." } satisfies ApiErrorResponse,
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: "Erro interno ao carregar notificações." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
