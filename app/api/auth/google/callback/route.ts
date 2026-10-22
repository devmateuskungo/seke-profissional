import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/auth/google/callback
 * Conclui o fluxo OAuth do Google no IAM:
 * → POST {AUTH}/iam-auth?action=oauth-google&sub=callback
 * Body: { code, redirect_uri, state }
 * Devolve a sessão (tokens + utilizador) devolvida pelo IAM.
 */

function getAuthBase(): string | null {
  const base = process.env.NEXT_PUBLIC_URL_API_AUTH?.trim()
  return base ? base.replace(/\/$/, "") : null
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function readString(source: Record<string, unknown> | null, key: string): string | undefined {
  if (!source) return undefined
  const value = source[key]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function extractErrorMessage(raw: unknown): string {
  const root = toRecord(raw)
  const error = toRecord(root?.error)
  return (
    readString(root, "message") ??
    readString(error, "message") ??
    (typeof root?.error === "string" ? root.error : undefined) ??
    "Não foi possível concluir a sessão com o Google."
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

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { message: "Pedido inválido." },
      { status: 400 }
    )
  }

  const code = readString(body, "code")
  const state = readString(body, "state")
  const redirectUri = readString(body, "redirectUri") ?? readString(body, "redirect_uri")

  if (!code) {
    return NextResponse.json(
      { message: "Código de autorização em falta." },
      { status: 400 }
    )
  }

  try {
    const endpoint = `${authBase}/iam-auth?action=oauth-google&sub=callback`

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
        state,
      }),
      cache: "no-store",
    })

    const raw = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        { message: extractErrorMessage(raw) },
        { status: res.status }
      )
    }

    return NextResponse.json(raw)
  } catch {
    return NextResponse.json(
      { message: "Erro de conexão com o servidor de autenticação." },
      { status: 502 }
    )
  }
}
