/** Indica se o utilizador tem conta de profissional (role ou tipo de perfil). */
export function isProfessionalUser(profileType?: string | null): boolean {
  if (!profileType?.trim()) return false
  const normalized = profileType.trim().toLowerCase()
  return (
    normalized === "professional" ||
    normalized === "profissional" ||
    normalized.includes("professional")
  )
}
