import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url.replace(/\/+$/, "")
}

/**
 * Proxy GET para a lista de posts na API externa (`/posts/posts`, depois fallbacks de feed).
 */
export async function proxyExternalPostsList(
  request: NextRequest,
  internalErrorMessage: string
): Promise<NextResponse> {
  try {
    const baseUrl = getBaseUrl()
    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page")?.trim() || "1"
    const limit = searchParams.get("limit")?.trim() || "10"

    const qs = new URLSearchParams({ page, limit })
    const postsListUrl = `${baseUrl}/posts/posts?${qs.toString()}`
    const postsListUrlTrailing = `${baseUrl}/posts/posts/?${qs.toString()}`
    const preferredUrl = `${baseUrl}/feed/globalFeed?${qs.toString()}`
    const legacyUrl = `${baseUrl}/feed/global?${qs.toString()}`

    const authorization = request.headers.get("authorization")
    const headers: HeadersInit = { Accept: "application/json" }
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      headers.Authorization = authorization
    }

    let res = await fetch(postsListUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    if (res.status === 404 || res.status === 405) {
      res = await fetch(postsListUrlTrailing, {
        method: "GET",
        headers,
        cache: "no-store",
      })
    }

    if (res.status === 404 || res.status === 405) {
      res = await fetch(preferredUrl, {
        method: "GET",
        headers,
        cache: "no-store",
      })
    }

    if (res.status === 404 || res.status === 405) {
      res = await fetch(legacyUrl, {
        method: "GET",
        headers,
        cache: "no-store",
      })
    }

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Não foi possível carregar o feed."

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
      { message: internalErrorMessage } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
