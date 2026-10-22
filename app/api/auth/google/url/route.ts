import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/auth/google/url
 * Inicia o fluxo OAuth do Google no IAM:
 * → POST {AUTH}/iam-auth?action=oauth-google&sub=url&redirect_uri=...
 * Devolve a URL de autorização do Google (e o state quando presente).
 */

const DEFAULT_REDIRECT_PATH = "/auth/callback"

function getAuthBase(): string | null {
  const base = process.env.NEXT_PUBLIC_URL_API_AUTH?.trim()
  return base ? base.replace(/\/$/, "") : null
}

function resolveRedirectUri(request: NextRequest, provided?: unknown): string {
  if (typeof provided === "string" && provided.trim()) return provided.trim()
  const origin = request.nextUrl.origin.replace(/\/$/, "")
  return `${origin}${DEFAULT_REDIRECT_PATH}`
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function readString(source: Record<string, unknown> | null, key: string): string | undefined {
  if (!source) return undefined
  const value = source[key]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function pickAuthorizationUrl(data: Record<string, unknown>): string | undefined {
  return (
    readString(data, "url") ??
    readString(data, "authorizationUrl") ??
    readString(data, "authorization_url") ??
    readString(data, "authUrl") ??
    readString(data, "auth_url") ??
    readString(data, "redirectUrl") ??
    readString(data, "redirect_url")
  )
}

function extractErrorMessage(raw: unknown): string {
  const root = toRecord(raw)
  const error = toRecord(root?.error)
  return (
    readString(root, "message") ??
    readString(error, "message") ??
    (typeof root?.error === "string" ? root.error : undefined) ??
    "Não foi possível iniciar sessão com o Google."
  )
}

export async function POST(request: NextRequest) {
  const authBase = getAuthBase()
  if (!authBase) {
    return NextResponse.json(
      { message: "Configuração do servidor incompleta." },
      { status: 503 }
    )
  }

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const bodyRecord = toRecord(body)
  const redirectUri = resolveRedirectUri(request, bodyRecord?.redirectUri)

  try {
    const endpoint = `${authBase}/iam-auth?action=oauth-google&sub=url&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ redirect_uri: redirectUri }),
      cache: "no-store",
    })

    const raw = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        { message: extractErrorMessage(raw) },
        { status: res.status }
      )
    }

    const root = toRecord(raw)
    const data = toRecord(root?.data) ?? root ?? {}
    const url = pickAuthorizationUrl(data)
    const state = readString(data, "state")

    if (!url) {
      return NextResponse.json(
        { message: "Resposta inválida do servidor de autenticação." },
        { status: 502 }
      )
    }

    return NextResponse.json({ url, state, redirectUri })
  } catch {
    return NextResponse.json(
      { message: "Erro de conexão com o servidor de autenticação." },
      { status: 502 }
    )
  }
}
