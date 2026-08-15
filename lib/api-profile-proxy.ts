import http from "node:http"
import https from "node:https"
import { NextRequest, NextResponse } from "next/server"
import type { ApiErrorResponse } from "@/types/auth"
import { extractUserIdFromBearer } from "@/lib/jwt-user-id"

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_URL_API?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_URL_API não configurada no .env")
  }
  return url.replace(/\/$/, "")
}

/**
 * Predefinição: `/profile` → `{NEXT_PUBLIC_URL_API}/profile`
 * Ex.: `https://api-seke-v1.onrender.com/api` + `/profile` = `.../api/profile`
 * Sobrescreva com `API_PROFILE_PATH` se o host não incluir `/api`.
 */
export function getProfileBasePath(): string {
  return process.env.API_PROFILE_PATH?.trim() || "/profile"
}

export function buildProfileEndpoint(subPath = ""): string {
  const base = getApiBaseUrl()
  const profileBase = getProfileBasePath()
  const path = profileBase.startsWith("/") ? profileBase : `/${profileBase}`
  if (!subPath) return `${base}${path}`
  const sub = subPath.startsWith("/") ? subPath : `/${subPath}`
  return `${base}${path}${sub}`
}

export function getAuthorizationHeader(
  request: NextRequest
): { ok: true; value: string } | { ok: false; response: NextResponse } {
  const authorization = request.headers.get("authorization")
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Token de autorização ausente ou inválido." } satisfies ApiErrorResponse,
        { status: 401 }
      ),
    }
  }
  return { ok: true, value: authorization }
}

type ProxyMethod = "GET" | "PUT" | "POST" | "PATCH"

/** Node `fetch` não permite GET com body; a API externa exige esse formato. */
export function httpGetWithJsonBody(
  url: string,
  headers: Record<string, string>,
  jsonBody: string
): Promise<{ statusCode: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const transport = parsed.protocol === "https:" ? https : http

    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(jsonBody),
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (chunk: Buffer) => chunks.push(chunk))
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8")
          let data: unknown = {}
          if (text) {
            try {
              data = JSON.parse(text) as unknown
            } catch {
              data = { message: text }
            }
          }
          resolve({ statusCode: res.statusCode ?? 500, data })
        })
      }
    )

    req.on("error", reject)
    req.write(jsonBody)
    req.end()
  })
}

function readUserIdFromPayload(value: unknown): string | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  const raw = (value as Record<string, unknown>).user_id
  if (typeof raw === "string" && raw.trim()) return raw.trim()
  if (typeof raw === "number" && !Number.isNaN(raw)) return String(raw)
  return null
}

export async function proxyProfileRequest(
  request: NextRequest,
  options: {
    method: ProxyMethod
    subPath?: string
    errorFallback: string
    body?: unknown | null
  }
): Promise<NextResponse> {
  try {
    const auth = getAuthorizationHeader(request)
    if (!auth.ok) return auth.response

    const endpoint = buildProfileEndpoint(options.subPath ?? "")
    const headers: HeadersInit = {
      Authorization: auth.value,
      Accept: "application/json",
    }

    let body: BodyInit | undefined
    const queryUserId = request.nextUrl.searchParams.get("user_id")?.trim()
    const userIdFromToken = extractUserIdFromBearer(auth.value)
    const contentType = request.headers.get("content-type") ?? ""

    /** GET /profile com `{ user_id }` no corpo (id do login). POST no BFF = mesmo contrato. */
    const isFetchProfile = options.method === "GET" || options.method === "POST"

    // PUT multipart (avatar) → FormData para …/profile/avatar
    if (
      options.method === "PUT" &&
      options.body === undefined &&
      contentType.includes("multipart/form-data")
    ) {
      const incoming = await request.formData()
      const outgoing = new FormData()

      const resolvedUserId =
        (typeof incoming.get("user_id") === "string" &&
        String(incoming.get("user_id")).trim()
          ? String(incoming.get("user_id")).trim()
          : null) ||
        queryUserId ||
        userIdFromToken

      if (!resolvedUserId) {
        return NextResponse.json(
          { message: "O campo user_id é obrigatório." } satisfies ApiErrorResponse,
          { status: 400 }
        )
      }

      outgoing.append("user_id", resolvedUserId)

      for (const [key, value] of incoming.entries()) {
        if (key === "user_id") continue
        if (value instanceof File) {
          if (value.size > 0) outgoing.append(key, value, value.name)
        } else if (typeof value === "string" && value.trim()) {
          outgoing.append(key, value)
        }
      }

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { Authorization: auth.value },
        body: outgoing,
        cache: "no-store",
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message =
          (data && typeof data.message === "string" && data.message) ||
          options.errorFallback
        return NextResponse.json(
          { message } satisfies ApiErrorResponse,
          { status: res.status }
        )
      }
      return NextResponse.json(data)
    }

    const rawPayload =
      options.body !== undefined
        ? options.body
        : await request.json().catch(() => null)

    if (isFetchProfile) {
      const resolvedGetUserId =
        readUserIdFromPayload(rawPayload) || queryUserId || userIdFromToken

      if (!resolvedGetUserId) {
        return NextResponse.json(
          { message: "O campo user_id é obrigatório." } satisfies ApiErrorResponse,
          { status: 400 }
        )
      }

      headers["Content-Type"] = "application/json"
      body = JSON.stringify({ user_id: resolvedGetUserId })
    } else {
      if (rawPayload == null || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
        return NextResponse.json(
          { message: "Corpo do pedido inválido." } satisfies ApiErrorResponse,
          { status: 400 }
        )
      }

      const payload = { ...(rawPayload as Record<string, unknown>) }
      const bodyUserId = payload.user_id
      const hasBodyUserId =
        (typeof bodyUserId === "string" && bodyUserId.trim() !== "") ||
        (typeof bodyUserId === "number" && !Number.isNaN(bodyUserId))

      if (!hasBodyUserId && queryUserId) {
        payload.user_id = queryUserId
      }
      if (!hasBodyUserId && !queryUserId && userIdFromToken) {
        payload.user_id = userIdFromToken
      }

      const resolvedUserId = payload.user_id
      const hasResolvedUserId =
        (typeof resolvedUserId === "string" && resolvedUserId.trim() !== "") ||
        (typeof resolvedUserId === "number" && !Number.isNaN(resolvedUserId))

      if (!hasResolvedUserId) {
        return NextResponse.json(
          { message: "O campo user_id é obrigatório." } satisfies ApiErrorResponse,
          { status: 400 }
        )
      }

      headers["Content-Type"] = "application/json"
      body = JSON.stringify(payload)
    }

    if (isFetchProfile && typeof body === "string") {
      const headerRecord: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      }
      if (typeof headers === "object" && headers !== null) {
        for (const [key, value] of Object.entries(headers)) {
          if (typeof value === "string") headerRecord[key] = value
        }
      }

      const { statusCode, data } = await httpGetWithJsonBody(
        endpoint,
        headerRecord,
        body
      )

      if (statusCode < 200 || statusCode >= 300) {
        let message = options.errorFallback
        if (
          data &&
          typeof data === "object" &&
          "message" in data &&
          typeof (data as { message?: unknown }).message === "string"
        ) {
          message = (data as { message: string }).message
        }
        return NextResponse.json(
          { message } satisfies ApiErrorResponse,
          { status: statusCode }
        )
      }

      return NextResponse.json(data)
    }

    const res = await fetch(endpoint, {
      method: options.method,
      headers,
      body,
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        (data && typeof data.message === "string" && data.message) ||
        options.errorFallback
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
      { message: options.errorFallback } satisfies ApiErrorResponse,
      { status: 500 }
    )
  }
}
