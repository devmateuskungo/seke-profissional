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
 * GET /api/posts/user/:id?page=1&limit=20
 * → GET {API}/posts/user/:id
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params
    const id = rawId?.trim()
    if (!id) {
      return NextResponse.json(
        { message: "ID do utilizador inválido." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const { searchParams } = request.nextUrl
    const page = searchParams.get("page")?.trim() || "1"
    const limit = searchParams.get("limit")?.trim() || "20"
    const qs = new URLSearchParams({ page, limit })

    const url = `${getBaseUrl()}/posts/user/${encodeURIComponent(id)}?${qs.toString()}`

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

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data &&
          typeof data === "object" &&
          "message" in data &&
          typeof data.message === "string" &&
          data.message) ||
        "Falha ao obter as publicações."
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
      { message: "Erro interno ao obter as publicações." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
