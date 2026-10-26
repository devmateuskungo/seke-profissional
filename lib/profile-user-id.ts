/** Extrai user_id / id de respostas da API com formatos variados. */
export function extractUserId(raw: unknown): string | null {
  if (raw == null) return null

  if (typeof raw === "string" || typeof raw === "number") {
    const s = String(raw).trim()
    return s.length > 0 ? s : null
  }

  if (typeof raw !== "object") return null

  const o = raw as Record<string, unknown>

  const direct = o.user_id ?? o.id ?? o.userId
  if (typeof direct === "string" && direct.trim()) return direct.trim()
  if (typeof direct === "number" && !Number.isNaN(direct)) return String(direct)

  const nestedKeys = ["user", "data", "profile", "perfil"] as const
  for (const key of nestedKeys) {
    const nested = o[key]
    if (nested && typeof nested === "object") {
      const fromNested = extractUserId(nested)
      if (fromNested) return fromNested
    }
  }

  if (o.data && typeof o.data === "object") {
    const data = o.data as Record<string, unknown>
    if (data.user && typeof data.user === "object") {
      const fromUser = extractUserId(data.user)
      if (fromUser) return fromUser
    }
  }

  return null
}
