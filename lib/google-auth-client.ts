"use client"

import { normalizeLoginResponse, type LoginOutcome } from "@/lib/auth-client"

const GOOGLE_CALLBACK_PATH = "/auth/callback"
const REDIRECT_URI_KEY = "seke_google_redirect_uri"
const REDIRECT_TARGET_KEY = "seke_google_redirect_target"

/** Constrói o redirect_uri exato (deve coincidir com a whitelist do IAM/Google). */
export function buildGoogleRedirectUri(origin?: string): string {
  const base = (origin ?? (typeof window !== "undefined" ? window.location.origin : "")).replace(
    /\/$/,
    ""
  )
  return `${base}${GOOGLE_CALLBACK_PATH}`
}

/** Guarda o redirect_uri e o destino para usar após o regresso do Google. */
export function rememberGoogleAuth(redirectUri: string, redirectTarget: string): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(REDIRECT_URI_KEY, redirectUri)
    window.sessionStorage.setItem(REDIRECT_TARGET_KEY, redirectTarget)
  } catch {
    /* ignore */
  }
}

export function readGoogleRedirectUri(origin?: string): string {
  if (typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem(REDIRECT_URI_KEY)
      if (stored?.trim()) return stored.trim()
    } catch {
      /* ignore */
    }
  }
  return buildGoogleRedirectUri(origin)
}

export function readGoogleRedirectTarget(): string {
  if (typeof window === "undefined") return "/"
  try {
    const stored = window.sessionStorage.getItem(REDIRECT_TARGET_KEY)
    if (stored?.trim()) return stored.trim()
  } catch {
    /* ignore */
  }
  return "/"
}

export function clearGoogleAuthState(): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(REDIRECT_URI_KEY)
    window.sessionStorage.removeItem(REDIRECT_TARGET_KEY)
  } catch {
    /* ignore */
  }
}

export type StartGoogleAuthOutcome =
  | { success: true; url: string }
  | { success: false; error: string }

/**
 * Passo 1 do fluxo: obtém a URL de autorização do Google através do IAM
 * (`sub=url`) e guarda o contexto para usar no callback.
 */
export async function startGoogleAuth(
  redirectTarget = "/"
): Promise<StartGoogleAuthOutcome> {
  const redirectUri = buildGoogleRedirectUri()
  rememberGoogleAuth(redirectUri, redirectTarget)

  try {
    const res = await fetch("/api/auth/google/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirectUri }),
    })

    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>

    if (!res.ok) {
      const message =
        typeof raw.message === "string" && raw.message.trim()
          ? raw.message
          : "Não foi possível iniciar sessão com o Google."
      return { success: false, error: message }
    }

    const url = typeof raw.url === "string" ? raw.url.trim() : ""
    if (!url) {
      return { success: false, error: "Resposta inválida do servidor de autenticação." }
    }

    return { success: true, url }
  } catch {
    return {
      success: false,
      error: "Erro de conexão. Verifique a sua internet e tente novamente.",
    }
  }
}

/**
 * Passo 2 do fluxo: troca o `code` do Google por uma sessão no IAM
 * (`sub=callback`) e devolve os tokens no formato de login.
 */
export async function completeGoogleAuth(params: {
  code: string
  state?: string
}): Promise<LoginOutcome> {
  const redirectUri = readGoogleRedirectUri()

  try {
    const res = await fetch("/api/auth/google/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: params.code,
        state: params.state,
        redirectUri,
      }),
    })

    const raw = await res.json().catch(() => ({}))

    if (!res.ok) {
      const record = raw as Record<string, unknown>
      const message =
        typeof record.message === "string" && record.message.trim()
          ? record.message
          : "Não foi possível concluir a sessão com o Google."
      return { success: false, error: message, statusCode: res.status }
    }

    return { success: true, data: normalizeLoginResponse(raw) }
  } catch {
    return {
      success: false,
      error: "Erro de conexão. Verifique a sua internet e tente novamente.",
    }
  }
}

/** Verifica a disponibilidade do serviço OAuth do Google no IAM. */
export async function checkGoogleAuthHealth(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/google/health", { cache: "no-store" })
    return res.ok
  } catch {
    return false
  }
}
