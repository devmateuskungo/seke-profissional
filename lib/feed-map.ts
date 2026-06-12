import type { ItemPostProfissonalProps } from "@/components/itempostprofissional/itempostprofissional"
import { resolveUserAvatarUrl } from "@/lib/user-avatar"
import type { PostDetail, PostRecord } from "@/types/post"
import type { ProfissionalFeedRow } from "@/types/home-feed"

export function formatFeedDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat("pt-PT", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d)
  } catch {
    return iso
  }
}

function deriveTitulo(content: string): string {
  const line = content.trim().split("\n")[0] || "Publicação"
  return line.length > 80 ? `${line.slice(0, 80)}…` : line
}

function inferMediaKindFromUrl(url: string): "image" | "video" | null {
  const lower = url.toLowerCase()
  if (/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(lower)) return "video"
  if (/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|#|$)/i.test(lower)) return "image"
  if (lower.includes("/video/upload/")) return "video"
  if (lower.includes("/image/upload/")) return "image"
  return null
}

/** Converte um post da API para o cartão de profissional do feed. */
export function postDetailToProfissionalFeedRow(post: PostDetail): ProfissionalFeedRow {
  const author = post.user ?? {
    id: "unknown",
    name: "Utilizador",
    avatar: null,
  }
  const titulo =
    typeof post.title === "string" && post.title.trim()
      ? post.title.trim()
      : deriveTitulo(post.content)
  const props: ItemPostProfissonalProps = {
    nome: author.name ?? "Utilizador",
    data: formatFeedDate(post.created_at),
    descricao: post.content,
    titulo,
    imagemPerfil: resolveUserAvatarUrl(author.avatar),
    imagemPost: (post.media_type === "image" ? post.media_url : post.image)?.trim() || undefined,
    mediaType: post.media_type ?? null,
    mediaUrl: post.media_url ?? null,
    curtidas: post.stats?.likes ?? 0,
    authorUserId: author.id,
    likedByMe: post.liked_by_me === true,
    followingAuthor: post.following_author === true,
  }
  return { id: post.id, ...props }
}

/**
 * Converte a resposta de POST /posts (ou objeto parcial) para PostDetail,
 * usando `user_data` em sessionStorage quando o servidor não envia `user` aninhado.
 */
export function postRecordToPostDetail(post: PostRecord): PostDetail | null {
  const id =
    post.id != null && String(post.id).trim() !== ""
      ? String(post.id)
      : null
  if (!id) return null

  const content =
    typeof post.content === "string"
      ? post.content
      : typeof (post as Record<string, unknown>).text === "string"
        ? ((post as Record<string, unknown>).text as string)
        : ""

  const raw = post as Record<string, unknown>
  const created_at =
    (typeof post.createdAt === "string" ? post.createdAt : null) ??
    (typeof raw.created_at === "string" ? raw.created_at : null) ??
    new Date().toISOString()

  const image =
    post.image === null || post.image === undefined
      ? null
      : typeof post.image === "string"
        ? post.image
        : null
  let mediaType: PostDetail["media_type"] = null
  let mediaUrl: PostDetail["media_url"] = null
  if (Array.isArray(raw.midia) && raw.midia.length >= 2) {
    const first = String(raw.midia[0]).trim().toLowerCase()
    const second = typeof raw.midia[1] === "string" ? raw.midia[1].trim() : ""
    if (second) {
      if (first === "image" || first === "imagem") {
        mediaType = "image"
        mediaUrl = second
      } else if (first === "video" || first === "vídeo") {
        mediaType = "video"
        mediaUrl = second
      } else if (/^https?:\/\//i.test(second)) {
        const inferred = inferMediaKindFromUrl(second)
        if (inferred) {
          mediaType = inferred
          mediaUrl = second
        }
      }
    }
  }
  if (!mediaUrl && image) {
    mediaType = "image"
    mediaUrl = image
  }

  let user: PostDetail["user"] = {
    id: "me",
    name: "Utilizador",
    avatar: null,
  }

  const nested =
    raw.user && typeof raw.user === "object"
      ? (raw.user as Record<string, unknown>)
      : null
  if (nested) {
    const uid = nested.id != null ? String(nested.id) : "me"
    const name =
      typeof nested.name === "string"
        ? nested.name
        : typeof nested.username === "string"
          ? nested.username
          : user.name
    const avatar =
      typeof nested.avatar === "string"
        ? nested.avatar
        : typeof nested.image === "string"
          ? nested.image
          : null
    user = { id: uid, name, avatar }
  } else if (typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem("user_data")
      if (stored) {
        const u = JSON.parse(stored) as {
          id?: string
          name?: string
          email?: string
          image?: string
        }
        user = {
          id: u.id != null ? String(u.id) : "me",
          name: u.name ?? u.email?.split("@")[0] ?? "Utilizador",
          avatar: u.image ?? null,
        }
      }
    } catch {
      /* ignore */
    }
  }

  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : null

  return {
    id,
    content,
    ...(title ? { title } : {}),
    created_at,
    image,
    media_type: mediaType,
    media_url: mediaUrl,
    user,
    stats: { likes: 0, comments: 0 },
  }
}
