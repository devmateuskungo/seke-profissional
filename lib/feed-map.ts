import type { ItemPostProfissonalProps } from "@/components/itempostprofissional/itempostprofissional"
import { collectPostImageUrls, dedupeMediaUrls, parseMidiaTupleUrls } from "@/lib/posts-client"
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
  const imageUrls = collectPostImageUrls({
    media_urls: post.media_urls,
    media_url: post.media_url,
    image: post.image,
    media_type: post.media_type,
  })
  const isVideo = post.media_type === "video"
  const primaryImage = isVideo
    ? post.image?.trim() || undefined
    : imageUrls[0]
  const mediaUrl =
    (isVideo
      ? imageUrls[0] || post.media_url
      : post.media_url) ?? null

  const props: ItemPostProfissonalProps = {
    nome: author.name ?? "Utilizador",
    data: formatFeedDate(post.created_at),
    descricao: post.content,
    titulo,
    imagemPerfil: resolveUserAvatarUrl(author.avatar),
    imagemPost: primaryImage,
    mediaType: post.media_type ?? null,
    mediaUrl,
    mediaUrls: imageUrls.length > 0 ? imageUrls : undefined,
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

  const raw = post as Record<string, unknown>
  const content =
    typeof post.content === "string"
      ? post.content
      : typeof raw.content_text === "string"
        ? raw.content_text
        : typeof raw.text === "string"
          ? raw.text
          : ""

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
  let mediaUrls: string[] = []

  if (Array.isArray(raw.media_urls)) {
    mediaUrls = dedupeMediaUrls(
      raw.media_urls.filter((u): u is string => typeof u === "string" && u.trim() !== "")
    )
  }

  const apiMediaType =
    typeof raw.media_type === "string"
      ? raw.media_type.trim().toLowerCase()
      : ""
  if (apiMediaType === "image" || apiMediaType === "imagem") mediaType = "image"
  if (apiMediaType === "video" || apiMediaType === "vídeo") mediaType = "video"

  if (Array.isArray(raw.midia) && raw.midia.length >= 2) {
    const parsed = parseMidiaTupleUrls(raw.midia)
    if (parsed.urls.length > 0) {
      mediaType = parsed.mediaType ?? mediaType
      mediaUrl = parsed.urls[0]
      if (mediaUrls.length === 0) mediaUrls = parsed.urls
    } else {
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
        if (mediaUrl && mediaUrls.length === 0) mediaUrls = [mediaUrl]
      }
    }
  }

  if (mediaUrls.length > 0) {
    mediaUrl = mediaUrls[0]
    if (!mediaType) {
      mediaType = inferMediaKindFromUrl(mediaUrls[0]) ?? "image"
    }
  }

  if (!mediaUrl && image) {
    mediaType = mediaType ?? "image"
    mediaUrl = image
    if (mediaUrls.length === 0) mediaUrls = dedupeMediaUrls([image])
  }

  mediaUrls = collectPostImageUrls({
    media_urls: mediaUrls,
    media_url: mediaUrl,
    image,
    media_type: mediaType,
  })
  if (mediaUrls.length > 0) {
    mediaUrl = mediaUrls[0]
    if (!mediaType) {
      mediaType = inferMediaKindFromUrl(mediaUrls[0]) ?? "image"
    }
  } else if (!mediaUrl && image) {
    mediaType = mediaType ?? "image"
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
    image: image ?? (mediaType === "image" ? mediaUrl : null),
    media_type: mediaType,
    media_url: mediaUrl,
    ...(mediaUrls.length > 0 ? { media_urls: mediaUrls } : {}),
    user,
    stats: { likes: 0, comments: 0 },
  }
}
