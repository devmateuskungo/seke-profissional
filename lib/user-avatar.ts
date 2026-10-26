import { buildPublicStorageUrl, isStorageObjectPath } from "@/lib/storage-client"

/** Avatar em `public/` quando o utilizador não tem imagem na API */
export const USER_AVATAR_PLACEHOLDER = "/user.svg"

export function resolveUserAvatarUrl(url: string | null | undefined): string {
  const t = typeof url === "string" ? url.trim() : ""
  if (!t) return USER_AVATAR_PLACEHOLDER

  // Bases de dados antigas podem guardar apenas o caminho do objeto
  // (`id_client/…/profile/avatar.webp`); converter para a URL pública.
  if (isStorageObjectPath(t)) {
    const publicUrl = buildPublicStorageUrl(t)
    if (publicUrl) return publicUrl
  }

  return t
}

/** Para `next/image` em avatares (SVG local + URLs remotas / data) */
export function userAvatarSrcUnoptimized(src: string): boolean {
  return (
    src.endsWith(".svg") ||
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("//")
  )
}
