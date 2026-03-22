/** Avatar em `public/` quando o utilizador não tem imagem na API */
export const USER_AVATAR_PLACEHOLDER = "/user.svg"

export function resolveUserAvatarUrl(url: string | null | undefined): string {
  const t = typeof url === "string" ? url.trim() : ""
  return t || USER_AVATAR_PLACEHOLDER
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
