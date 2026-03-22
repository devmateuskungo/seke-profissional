import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return n
}

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url
}

/**
 * GET /api/likes/post/:postId — proxy para GET …/likes/post/:postId
 * Ver quem deu like (?page=1&limit=20). Resposta típica: { users: [], total: number }
 * Authorization opcional (repassado se presente).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await context.params
    const trimmed = postId?.trim()
    if (!trimmed) {
      return NextResponse.json(
        { message: "ID da publicação inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parsePositiveInt(searchParams.get("page"), 1)
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 20), 100)

    const baseUrl = getBaseUrl()
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    })
    const url = `${baseUrl}/likes/post/${encodeURIComponent(trimmed)}?${qs.toString()}`

    const authorization = request.headers.get("authorization")
    const headers: HeadersInit = {
      Accept: "application/json",
    }
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      headers.Authorization = authorization
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    const text = await res.text().catch(() => "")

    if (!res.ok) {
      let message = "Não foi possível carregar os gostos."
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
      { message: "Erro interno ao carregar os gostos." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}

/**
 * POST /api/likes/post/:postId — proxy para POST …/likes/post/:postId
 * Dar like numa publicação (Authorization obrigatório).
 * Resposta típica: { liked: true, total_likes: number }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await context.params
    const trimmed = postId?.trim()
    if (!trimmed) {
      return NextResponse.json(
        { message: "ID da publicação inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

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
    const url = `${baseUrl}/likes/post/${encodeURIComponent(trimmed)}`

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
      },
      cache: "no-store",
    })

    const text = await res.text().catch(() => "")

    if (!res.ok) {
      let message = "Não foi possível registar o gosto."
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
      { message: "Erro interno ao registar o gosto." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/likes/post/:postId — proxy para DELETE …/likes/post/:postId
 * Remover like (Authorization obrigatório).
 * Resposta típica: { liked: false, total_likes: number }
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await context.params
    const trimmed = postId?.trim()
    if (!trimmed) {
      return NextResponse.json(
        { message: "ID da publicação inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

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
    const url = `${baseUrl}/likes/post/${encodeURIComponent(trimmed)}`

    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
      },
      cache: "no-store",
    })

    const text = await res.text().catch(() => "")

    if (!res.ok) {
      let message = "Não foi possível remover o gosto."
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
      { message: "Erro interno ao remover o gosto." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
