import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API_AUTH?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API_AUTH não configurada no .env")
  }
  return url.replace(/\/+$/, "")
}

/** Slugs de categoria (ex.: `canalizador`, `nova-categoria`). */
const CATEGORY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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
 * GET /api/orders/list-open
 * → GET {NEXT_PUBLIC_URL_API_AUTH}/iam-orders?action=list-open[&category=<slug>]
 *
 * `category` é opcional: sem ele a Edge Function devolve todos os pedidos
 * abertos. O `Authorization` é repassado quando presente (a listagem pode
 * ser pública ou exigir sessão, conforme a configuração da Edge Function).
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl()
    const { searchParams } = new URL(request.url)
    const rawCategory = searchParams.get("category")?.trim().toLowerCase() ?? ""

    if (rawCategory && !CATEGORY_PATTERN.test(rawCategory)) {
      return NextResponse.json(
        { message: "Categoria inválida." } satisfies ApiErrorResponse,
        { status: 400 }
      )
    }

    const url = new URL(`${baseUrl}/iam-orders`)
    url.searchParams.set("action", "list-open")
    if (rawCategory) {
      url.searchParams.set("category", rawCategory)
    }

    const headers: HeadersInit = { Accept: "application/json" }
    const authorization = request.headers.get("authorization")
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      headers.Authorization = authorization
    }
    const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    if (apikey) {
      headers.apikey = apikey
    }

    const res = await fetch(url.toString(), {
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
            "Não foi possível carregar os pedidos abertos.",
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
      { message: "Erro interno ao carregar os pedidos abertos." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
