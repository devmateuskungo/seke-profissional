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
 * GET /api/notifications/unread-count — proxy para GET …/notifications/unread-count
 * Apenas contador de não lidas (Authorization obrigatório).
 * Resposta típica: { count: number }
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

    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/notifications/unread-count`

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
      },
      cache: "no-store",
    })

    // Algumas versões da API não expõem /notifications/unread-count.
    // Neste caso, usamos o endpoint de listagem e reaproveitamos unread_count.
    if (res.status === 404) {
      const fallbackUrl = `${baseUrl}/notifications?page=1&limit=1&unread_only=true`
      const fallbackRes = await fetch(fallbackUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: authorization,
        },
        cache: "no-store",
      })

      const fallbackText = await fallbackRes.text().catch(() => "")
      if (!fallbackRes.ok) {
        let message = "Não foi possível obter o contador."
        if (fallbackText.trim()) {
          try {
            const err = JSON.parse(fallbackText) as { message?: string }
            if (typeof err.message === "string" && err.message) message = err.message
          } catch {
            /* ignore */
          }
        }
        return NextResponse.json(
          { message } satisfies ApiErrorResponse,
          { status: fallbackRes.status }
        )
      }

      if (!fallbackText.trim()) {
        return NextResponse.json({ count: 0 })
      }

      try {
        const parsed = JSON.parse(fallbackText) as {
          unread_count?: unknown
          unreadCount?: unknown
          data?: { unread_count?: unknown; unreadCount?: unknown }
        }
        const rawCount =
          parsed.unread_count ??
          parsed.unreadCount ??
          parsed.data?.unread_count ??
          parsed.data?.unreadCount

        const count =
          typeof rawCount === "number"
            ? rawCount
            : typeof rawCount === "string"
              ? Number(rawCount)
              : 0

        return NextResponse.json({
          count: Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0,
        })
      } catch {
        return NextResponse.json({ count: 0 })
      }
    }

    const text = await res.text().catch(() => "")

    if (!res.ok) {
      let message = "Não foi possível obter o contador."
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
      { message: "Erro interno ao obter o contador." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
