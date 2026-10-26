import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import { getApiBaseUrl } from "@/lib/api-profile-proxy"

/** GET /api/professionals — proxy para API externa GET /professionals */
export async function GET(request: NextRequest) {
  try {
    const endpoint = `${getApiBaseUrl()}/professionals`
    const authorization = request.headers.get("authorization")
    const headers: HeadersInit = { Accept: "application/json" }
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      headers.Authorization = authorization
    }

    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page") ?? "1"
    const limit = searchParams.get("limit") ?? "30"

    const forwardParams = new URLSearchParams({
      page,
      limit,
    })

    const optionalKeys = [
      "category_id",
      "province",
      "municipality",
      "latitude",
      "longitude",
      "radius_km",
      "sort",
      "user_id",
    ] as const

    for (const key of optionalKeys) {
      const value = searchParams.get(key)
      if (value?.trim()) {
        forwardParams.set(key, value.trim())
      }
    }

    const url = `${endpoint}?${forwardParams.toString()}`

    const res = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        "Não foi possível carregar os profissionais."
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
      { message: "Erro interno. Tente novamente mais tarde." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
