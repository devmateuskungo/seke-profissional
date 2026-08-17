import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url.replace(/\/+$/, "")
}

/**
 * POST /api/posts/:id/share
 * → POST {API}/posts/:id/share
 * Body: { id, platform }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const trimmedId = id?.trim()
    if (!trimmedId) {
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

    const raw = await request.json().catch(() => null)
    const body =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {}

    const platform =
      typeof body.platform === "string" ? body.platform.trim() : ""
    if (!platform) {
      return NextResponse.json(
        { message: "Indique a plataforma de partilha." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const payload = {
      id: trimmedId,
      platform,
    }

    const url = `${getBaseUrl()}/posts/${encodeURIComponent(trimmedId)}/share`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    const text = await res.text().catch(() => "")
    let data: unknown = {}
    if (text.trim()) {
      try {
        data = JSON.parse(text) as unknown
      } catch {
        data = { message: text }
      }
    }

    if (!res.ok) {
      let message = "Não foi possível registar a partilha."
      if (data && typeof data === "object" && "message" in data) {
        const msg = (data as { message?: unknown }).message
        if (typeof msg === "string" && msg.trim()) message = msg.trim()
      }
      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
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
      { message: "Erro interno ao partilhar a publicação." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
