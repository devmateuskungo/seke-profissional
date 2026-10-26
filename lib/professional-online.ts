/** Considera online se a API indicar, ou se atualizou o perfil nos últimos 30 minutos. */
const ONLINE_THRESHOLD_MS = 30 * 60 * 1000

export function isProfessionallyOnline(input: {
  is_online?: boolean
  last_seen_at?: string | null
  updated_at?: string | null
}): boolean {
  if (typeof input.is_online === "boolean") {
    return input.is_online
  }

  const raw = input.last_seen_at?.trim() || input.updated_at?.trim()
  if (!raw) return false
  const updatedAt = Date.parse(raw)
  if (Number.isNaN(updatedAt)) return false
  return Date.now() - updatedAt <= ONLINE_THRESHOLD_MS
}
