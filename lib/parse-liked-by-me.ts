/**
 * Interpreta se o utilizador já deu gosto, aceitando formatos comuns das APIs.
 */
const LIKED_KEYS = [
  "liked_by_me",
  "likedByMe",
  "is_liked",
  "isLiked",
  "liked_by_user",
  "user_liked",
  "has_liked",
  "hasLiked",
] as const

function parseLikedValue(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v
  if (typeof v === "number" && !Number.isNaN(v)) return v !== 0
  if (typeof v === "string") {
    const s = v.trim().toLowerCase()
    if (s === "true" || s === "1" || s === "yes") return true
    if (s === "false" || s === "0" || s === "no") return false
  }
  return undefined
}

/** Lê o primeiro campo conhecido num objeto plano. */
export function parseLikedByMeFromObject(
  o: Record<string, unknown>
): boolean | undefined {
  for (const key of LIKED_KEYS) {
    if (key in o) {
      const parsed = parseLikedValue(o[key])
      if (parsed !== undefined) return parsed
    }
  }
  return undefined
}

/**
 * Post / item de feed: campos no topo e, por vezes, dentro de `stats`.
 */
export function parseLikedByMeFromPostLike(
  raw: Record<string, unknown>
): boolean | undefined {
  const direct = parseLikedByMeFromObject(raw)
  if (direct !== undefined) return direct

  const stats = raw.stats
  if (stats && typeof stats === "object" && !Array.isArray(stats)) {
    return parseLikedByMeFromObject(stats as Record<string, unknown>)
  }

  return undefined
}
