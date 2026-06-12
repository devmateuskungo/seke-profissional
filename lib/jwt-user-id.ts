/** Extrai id do utilizador do payload JWT (sem validar assinatura). */
export function extractUserIdFromJwt(token: string): string | null {
  const trimmed = token.trim()
  if (!trimmed) return null

  const parts = trimmed.split(".")
  if (parts.length < 2) return null

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    const json =
      typeof window !== "undefined"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8")
    const payload = JSON.parse(json) as Record<string, unknown>

    const nestedUser =
      payload.user && typeof payload.user === "object"
        ? (payload.user as Record<string, unknown>)
        : null

    const candidates = [
      payload.sub,
      payload.user_id,
      payload.userId,
      payload.id,
      nestedUser?.id,
      nestedUser?.user_id,
      nestedUser?.userId,
    ]

    for (const value of candidates) {
      if (typeof value === "string" && value.trim()) return value.trim()
      if (typeof value === "number" && !Number.isNaN(value)) return String(value)
    }
  } catch {
    return null
  }

  return null
}

export function extractUserIdFromBearer(authorization: string): string | null {
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  if (!match) return null
  return extractUserIdFromJwt(match[1])
}
