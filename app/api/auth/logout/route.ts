import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_URL_API_AUTH?.trim()
  if (url) return url
  const fallback = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!fallback) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return fallback
}

const getLogoutEndpoint = (): string => {
  const baseUrl = getBaseUrl()
  const usesAuthBase = Boolean(process.env.NEXT_PUBLIC_URL_API_AUTH?.trim())
  const path = usesAuthBase ? "/iam-auth?action=logout" : "/auth/logout"
  return `${baseUrl.replace(/\/$/, "")}${path}`
}

/** POST /api/auth/logout → iam-auth?action=logout (ou {API}/auth/logout) */
export async function POST(request: NextRequest) {
  try {
    const endpoint = getLogoutEndpoint()
    const usesAuthBase = Boolean(process.env.NEXT_PUBLIC_URL_API_AUTH?.trim())

    const authorization = request.headers.get("authorization")
    const headers: Record<string, string> = {}
    if (authorization) headers["Authorization"] = authorization

    let body: string | undefined
    if (usesAuthBase) {
      const parsed = (await request.json().catch(() => null)) as {
        refreshToken?: unknown
      } | null
      const refreshToken =
        parsed && typeof parsed.refreshToken === "string"
          ? parsed.refreshToken.trim()
          : ""
      if (refreshToken) {
        headers["Content-Type"] = "application/json"
        body = JSON.stringify({ refreshToken })
      }
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      ...(body ? { body } : {}),
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const errRecord =
        data && typeof data === "object" && !Array.isArray(data)
          ? ((data as Record<string, unknown>).error as Record<string, unknown> | undefined)
          : undefined
      const message =
        (data && typeof data.message === "string" && data.message) ||
        (errRecord && typeof errRecord.code === "string" && errRecord.code) ||
        (errRecord && typeof errRecord.message === "string" && errRecord.message) ||
        "Falha ao terminar sessão. Tente novamente."

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
      { message: "Erro interno ao terminar sessão." } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}

