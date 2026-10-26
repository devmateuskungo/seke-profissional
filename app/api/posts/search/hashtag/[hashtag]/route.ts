import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url.replace(/\/+$/, "")
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return n
}

/**
 * GET /api/posts/search/hashtag/:hashtag?page=1&limit=20
 * → GET {API}/posts/search/hashtag/:hashtag?page=&limit=
 * Ex.: https://api-seke-v1.onrender.com/api/posts/search/hashtag/programar?limit=20&page=1
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ hashtag: string }> }
) {
  try {
    const { hashtag: rawHashtag } = await context.params
    const hashtag = rawHashtag?.trim() || ""
    if (!hashtag) {
      return NextResponse.json(
        { message: "Indique uma hashtag para pesquisar." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parsePositiveInt(searchParams.get("page"), 1)
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 20), 100)
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    })

    const url = `${getBaseUrl()}/posts/search/hashtag/${encodeURIComponent(hashtag)}?${qs.toString()}`

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
        (data &&
          typeof data === "object" &&
          "message" in data &&
          typeof (data as { message?: unknown }).message === "string" &&
          (data as { message: string }).message.trim()) ||
        "Não foi possível pesquisar as publicações."
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
      { message: "Erro interno ao pesquisar publicações." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
