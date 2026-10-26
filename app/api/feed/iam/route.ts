import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const FEED_ACTIONS = new Set(["latest", "trending", "my-feed"])

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API_AUTH?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API_AUTH não configurada no .env")
  }
  return url.replace(/\/+$/, "")
}

function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const body = data as Record<string, unknown>
  if (typeof body.message === "string" && body.message.trim()) {
    return body.message.trim()
  }
  if (typeof body.error === "string" && body.error.trim()) {
    return body.error.trim()
  }
  const error = body.error
  if (error && typeof error === "object") {
    const nested = (error as { message?: unknown }).message
    if (typeof nested === "string" && nested.trim()) {
      return nested.trim()
    }
  }
  return null
}

/**
 * GET /api/feed/iam — proxy para GET {NEXT_PUBLIC_URL_API_AUTH}/iam-feed?action=latest|trending|my-feed&page=&limit=
 *
 * `latest` e `trending` são públicas. `my-feed` exige `Authorization`
 * (a Edge Function responde 401 sem sessão; o header é repassado tal como chega).
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl()
    const { searchParams } = new URL(request.url)

    const requestedAction = searchParams.get("action")?.trim().toLowerCase() || "latest"
    const action = FEED_ACTIONS.has(requestedAction) ? requestedAction : "latest"
    const page = searchParams.get("page")?.trim() || "1"
    const limit = searchParams.get("limit")?.trim() || "20"

    const qs = new URLSearchParams({ action, page, limit })
    const url = `${baseUrl}/iam-feed?${qs.toString()}`

    const headers: HeadersInit = { Accept: "application/json" }
    const authorization = request.headers.get("authorization")
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      headers.Authorization = authorization
    }
    const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    if (apikey) {
      headers.apikey = apikey
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        {
          message:
            extractErrorMessage(data) ??
            "Não foi possível carregar o feed.",
        } satisfies ApiErrorResponse,
        { status: res.status }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes("NEXT_PUBLIC_URL_API_AUTH")
    ) {
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
