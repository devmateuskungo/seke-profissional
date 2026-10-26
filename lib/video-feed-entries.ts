import { dedupeMediaUrls } from "@/lib/posts-client"
import type { PostDetail } from "@/types/post"

export type VideoFeedEntry = {
  /** `${postId}::${url}` */
  key: string
  postId: string
  url: string
  liked: boolean
  likesCount: number
  shareUrl: string
  shareTitle: string
  authorName: string
  authorAvatar: string | null
}

function normalizeVideoSrc(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("/")) return trimmed
  if (trimmed.startsWith("data:")) return trimmed
  if (trimmed.startsWith("//")) return `https:${trimmed}`

  try {
    return new URL(trimmed).toString()
  } catch {
    if (!trimmed.includes(" ") && trimmed.includes(".")) {
      try {
        return new URL(`https://${trimmed}`).toString()
      } catch {
        return null
      }
    }
    return null
  }
}

/** URLs de vídeo de um post (media_type video). */
export function collectPostVideoUrls(post: {
  media_type?: string | null
  media_urls?: string[] | null
  media_url?: string | null
}): string[] {
  const mediaType =
    typeof post.media_type === "string" ? post.media_type.trim().toLowerCase() : ""
  const isVideo = mediaType === "video" || mediaType === "vídeo"
  if (!isVideo) return []

  const candidates: string[] = []
  if (Array.isArray(post.media_urls)) candidates.push(...post.media_urls)
  if (typeof post.media_url === "string") candidates.push(post.media_url)

  return dedupeMediaUrls(
    candidates
      .map((u) => normalizeVideoSrc(u))
      .filter((u): u is string => Boolean(u))
  )
}

export function videoFeedEntryKey(postId: string, url: string): string {
  return `${String(postId)}::${url}`
}

/** Flatten posts → slides de vídeo (vários vídeos no mesmo post = vários slides). */
export function postsToVideoFeedEntries(posts: PostDetail[]): VideoFeedEntry[] {
  const entries: VideoFeedEntry[] = []
  const seen = new Set<string>()

  for (const post of posts) {
    const urls = collectPostVideoUrls(post)
    if (urls.length === 0) continue

    const postId = String(post.id)
    const title =
      (typeof post.title === "string" && post.title.trim()) ||
      post.content.trim().slice(0, 120) ||
      "Publicação SEKE"
    const liked = post.liked_by_me === true
    const likesCount = post.stats?.likes ?? 0
    const authorName = post.user?.name?.trim() || "Utilizador"
    const authorAvatar =
      typeof post.user?.avatar === "string" ? post.user.avatar : null

    for (const url of urls) {
      const key = videoFeedEntryKey(postId, url)
      if (seen.has(key)) continue
      seen.add(key)
      entries.push({
        key,
        postId,
        url,
        liked,
        likesCount,
        shareUrl: `/posts/${postId}`,
        shareTitle: title,
        authorName,
        authorAvatar,
      })
    }
  }

  return entries
}

/** Junta entradas novas sem duplicar; mantém ordem (existentes + append). */
export function mergeVideoFeedEntries(
  existing: VideoFeedEntry[],
  incoming: VideoFeedEntry[]
): VideoFeedEntry[] {
  const seen = new Set(existing.map((e) => e.key))
  const merged = [...existing]
  for (const entry of incoming) {
    if (seen.has(entry.key)) {
      const idx = merged.findIndex((e) => e.key === entry.key)
      if (idx >= 0) {
        merged[idx] = {
          ...merged[idx],
          liked: entry.liked,
          likesCount: entry.likesCount,
          shareTitle: entry.shareTitle || merged[idx].shareTitle,
          authorName: entry.authorName || merged[idx].authorName,
          authorAvatar: entry.authorAvatar ?? merged[idx].authorAvatar,
        }
      }
      continue
    }
    seen.add(entry.key)
    merged.push(entry)
  }
  return merged
}

/**
 * Feed da home como base; mantém slides extra já carregados na galeria
 * (ex. página seguinte pedida pelo player).
 */
export function reconcileVideoFeedEntries(
  fromFeed: VideoFeedEntry[],
  previous: VideoFeedEntry[]
): VideoFeedEntry[] {
  const prevByKey = new Map(previous.map((e) => [e.key, e]))
  const next = fromFeed.map((entry) => {
    const prev = prevByKey.get(entry.key)
    if (!prev) return entry
    return {
      ...entry,
      liked: entry.liked,
      likesCount: entry.likesCount,
      shareTitle: entry.shareTitle || prev.shareTitle,
      authorName: entry.authorName || prev.authorName,
      authorAvatar: entry.authorAvatar ?? prev.authorAvatar,
    }
  })
  const seen = new Set(next.map((e) => e.key))
  for (const entry of previous) {
    if (seen.has(entry.key)) continue
    next.push(entry)
    seen.add(entry.key)
  }
  return next
}
