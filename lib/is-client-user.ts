/** Indica se o utilizador tem conta de cliente. */
export function isClientUser(profileType?: string | null): boolean {
  if (!profileType?.trim()) return false
  const normalized = profileType.trim().toLowerCase()
  return (
    normalized === "client" ||
    normalized === "cliente" ||
    normalized.includes("client")
  )
}
