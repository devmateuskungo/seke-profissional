import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import { proxyExternalPostsList } from "@/lib/external-posts-list-proxy"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url.replace(/\/+$/, "")
}

/**
 * GET /api/feed/explore — feed público para utilizadores sem sessão.
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl()
    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page")?.trim() || "1"
    const limit = searchParams.get("limit")?.trim() || "10"

    const qs = new URLSearchParams({ page, limit })
    const url = `${baseUrl}/feed/explore?${qs.toString()}`

    const authorization = request.headers.get("authorization")
    const headers: HeadersInit = { Accept: "application/json" }
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      headers.Authorization = authorization
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Não foi possível carregar o feed."

      const isRecoverable =
        res.status >= 500 ||
        /user_id/i.test(message) ||
        /cannot read properties/i.test(message)

      if (isRecoverable) {
        return proxyExternalPostsList(request, "Erro interno ao carregar o feed.")
      }

      return NextResponse.json(
        { message } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_PUBLIC_URL_API")) {
      return NextResponse.json(
        { message: "Configuração do servidor incompleta." } satisfies ApiErrorResponse,
        { status: 503 }
      )
    }

    return NextResponse.json(
      { message: "Erro interno ao carregar o feed." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
