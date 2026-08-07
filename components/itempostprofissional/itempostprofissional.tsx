"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { Briefcase, Heart, Loader2, Play, UserMinus, UserPlus, Volume2, VolumeX } from "lucide-react"

import { DeletePostConfirmDialog } from "@/components/delete-post-confirm-dialog/delete-post-confirm-dialog"
import { PostLikesTooltip } from "@/components/post-likes-tooltip/post-likes-tooltip"
import { PostMeatballMenu } from "@/components/post-meatball-menu/post-meatball-menu"
import { PostEditModal } from "@/components/post-edit-modal/post-edit-modal"
import { PostMediaGallery } from "@/components/post-media-gallery/post-media-gallery"
import { useToast } from "@/components/ui/toaster"
import { followUser, unfollowUser } from "@/lib/follow-client"
import { likePost, unlikePost } from "@/lib/likes-client"
import { deletePost } from "@/lib/posts-client"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { cn } from "@/lib/utils"
import { sameUserId, useViewerUserId } from "@/lib/viewer-user-id"
import type {
  FollowUserResponse,
  LikePostResponse,
  PostDetail,
} from "@/types/post"

function resolveAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

function imageNeedsUnoptimized(src: string): boolean {
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("//")
  )
}

function normalizeMediaSrc(value: string | null | undefined): string | null {
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

const MEDIA_FRAME_CLASS =
  "relative w-full aspect-video max-h-[min(560px,80vh)] min-h-[220px] bg-black"

function FeedInlineVideo({
  src,
  posterUrl,
}: {
  src: string
  posterUrl?: string | null
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)

  const syncPlaying = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    setPlaying(!el.paused)
  }, [])

  const togglePlay = async () => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      try {
        await el.play()
      } catch {
        /* ignore — autoplay policies / load errors */
      }
    } else {
      el.pause()
    }
    syncPlaying()
  }

  const toggleMuted = () => {
    const el = videoRef.current
    if (!el) return
    const next = !el.muted
    el.muted = next
    setMuted(next)
  }

  return (
    <div key={src} className={MEDIA_FRAME_CLASS}>
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-contain"
        playsInline
        muted={muted}
        preload="metadata"
        poster={posterUrl ?? undefined}
        onClick={() => void togglePlay()}
        onPlay={syncPlaying}
        onPause={syncPlaying}
        onEnded={() => setPlaying(false)}
      />
      {!playing ? (
        <button
          type="button"
          onClick={() => void togglePlay()}
          className="absolute inset-0 grid place-items-center bg-black/40 transition-colors hover:bg-black/50"
          aria-label="Reproduzir vídeo"
        >
          <span className="inline-flex size-17 items-center justify-center rounded-full border-2 border-white/40 bg-black/50 text-white shadow-lg backdrop-blur-[2px]">
            <Play className="size-8 translate-x-0.5" aria-hidden />
          </span>
        </button>
      ) : null}
      <div className="pointer-events-none absolute bottom-2 right-2 flex gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleMuted()
          }}
          className="pointer-events-auto inline-flex size-9 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-sm backdrop-blur-sm hover:bg-black/55"
          aria-label={muted ? "Ativar som" : "Silenciar"}
        >
          {muted ? (
            <VolumeX className="size-4" aria-hidden />
          ) : (
            <Volume2 className="size-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  )
}

export interface ItemPostProfissonalProps {
  nome?: string
  data?: string
  descricao?: string
  titulo?: string
  imagemPerfil?: string
  imagemPost?: string
  mediaType?: "image" | "video" | null
  mediaUrl?: string | null
  /** Várias imagens (estilo Facebook). Se omitido, usa `mediaUrl` / `imagemPost`. */
  mediaUrls?: string[] | null
  curtidas?: number
  /** ID da publicação (obrigatório para editar/eliminar no feed) */
  postId?: string
  /** ID do autor — menu ⋮ só quando coincide com o utilizador autenticado */
  authorUserId?: string
  onPostUpdated?: (detail: PostDetail) => void
  onPostDeleted?: (postId: string) => void
  /** Se o utilizador já deu gosto (feed com token) */
  likedByMe?: boolean
  /** Após POST like — atualizar lista no pai */
  onLikeResult?: (data: LikePostResponse) => void
  /** Já segues o autor (feed / API) */
  followingAuthor?: boolean
  /** Após POST follow — atualizar outros posts do mesmo autor no pai */
  onFollowResult?: (authorUserId: string, data: FollowUserResponse) => void
}

export default function ItemPostProfissonal({
  nome = "Profissional",
  data = "25 Nov at 12:24 PM",
  descricao = "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
  titulo = "TÍTULO DO POST",
  imagemPerfil,
  imagemPost,
  mediaType = null,
  mediaUrl = null,
  mediaUrls = null,
  curtidas = 0,
  postId,
  authorUserId,
  onPostUpdated,
  onPostDeleted,
  likedByMe = false,
  onLikeResult,
  followingAuthor = false,
  onFollowResult,
}: ItemPostProfissonalProps) {
  const router = useRouter()
  const toast = useToast()
  const viewerId = useViewerUserId()
  const token = resolveAuthToken()

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [liking, setLiking] = useState(false)
  const [following, setFollowing] = useState(followingAuthor)
  const [followingLoading, setFollowingLoading] = useState(false)
  const [likedVisual, setLikedVisual] = useState(likedByMe)

  useEffect(() => {
    setFollowing(followingAuthor)
  }, [followingAuthor])

  useEffect(() => {
    setLikedVisual(likedByMe)
  }, [likedByMe])

  const isOwnPost =
    !!postId &&
    !!token &&
    sameUserId(viewerId, authorUserId)

  const profileHref = authorUserId
    ? `/detalhesuser?userId=${encodeURIComponent(authorUserId)}`
    : "/detalhesuser"

  const avatarSrc = resolveUserAvatarUrl(imagemPerfil)
  const normalizedMediaUrl = normalizeMediaSrc(mediaUrl)
  const normalizedImagemPost = imagemPost
    ? normalizeMediaSrc(imagemPost)
    : null
  const galleryUrls = (mediaUrls ?? [])
    .map((u) => normalizeMediaSrc(u))
    .filter((u): u is string => Boolean(u))
  const resolvedImageSrc =
    mediaType === "image" || galleryUrls.length > 0 || (!mediaType && normalizedImagemPost)
      ? normalizedMediaUrl ?? normalizedImagemPost ?? galleryUrls[0] ?? null
      : null
  const imageGalleryUrls =
    galleryUrls.length > 0
      ? galleryUrls
      : resolvedImageSrc
        ? [resolvedImageSrc]
        : []
  const resolvedVideoSrc = mediaType === "video" ? normalizedMediaUrl : null
  const videoPoster =
    mediaType === "video" ? normalizedImagemPost ?? null : null

  const startEdit = () => {
    setEditModalOpen(true)
  }

  const requestDelete = () => setDeleteDialogOpen(true)

  const handleFollowClick = async () => {
    if (!authorUserId || !token) {
      toast.error("Inicie sessão para seguir este utilizador.")
      return
    }
    if (following) return
    setFollowingLoading(true)
    const result = await followUser(authorUserId, token)
    setFollowingLoading(false)
    if (result.success) {
      setFollowing(result.data.following)
      onFollowResult?.(authorUserId, result.data)
      toast.success(result.data.message)
    } else {
      toast.error(result.error)
    }
  }

  const handleUnfollowClick = async () => {
    if (!authorUserId || !token) {
      toast.error("Inicie sessão para gerir quem segues.")
      return
    }
    if (!following) return
    setFollowingLoading(true)
    const result = await unfollowUser(authorUserId, token)
    setFollowingLoading(false)
    if (result.success) {
      setFollowing(result.data.following)
      onFollowResult?.(authorUserId, result.data)
      toast.success(result.data.message)
    } else {
      toast.error(result.error)
    }
  }

  const handleLikeClick = async () => {
    if (!postId || !token) {
      toast.error("Inicie sessão para gostar desta publicação.")
      return
    }
    const wasLiked = likedVisual
    setLikedVisual(!wasLiked)
    setLiking(true)
    const result = wasLiked
      ? await unlikePost(postId, token, { previousLikeCount: curtidas })
      : await likePost(postId, token, { previousLikeCount: curtidas })
    setLiking(false)
    if (result.success) {
      onLikeResult?.(result.data)
    } else {
      setLikedVisual(wasLiked)
      toast.error(result.error)
    }
  }

  const executeDelete = async () => {
    if (!postId || !token) return
    setDeleting(true)
    try {
      const result = await deletePost(postId, token)
      if (result.success) {
        setDeleteDialogOpen(false)
        onPostDeleted?.(postId)
        toast.success("Publicação eliminada.")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-card text-card-foreground rounded-md border border-gray-100 overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-muted rounded-full overflow-hidden shrink-0">
            <Image
              src={avatarSrc}
              alt={nome}
              width={40}
              height={40}
              className="object-cover w-full h-full"
              unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
            />
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <Link href={profileHref} className="min-w-0">
                <h3 className="text-xs font-semibold hover:underline cursor-pointer truncate">
                  {nome}
                </h3>
              </Link>
              {!isOwnPost && authorUserId ? (
                following ? (
                  <button
                    type="button"
                    onClick={() => void handleUnfollowClick()}
                    disabled={followingLoading}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline shrink-0 disabled:opacity-60"
                    title="Deixar de seguir"
                  >
                    {followingLoading ? (
                      <>
                        <Loader2
                          className="size-3.5 animate-spin shrink-0"
                          aria-hidden
                        />
                        <span className="sr-only">A carregar</span>
                      </>
                    ) : (
                      <>
                        <UserMinus className="size-3.5 shrink-0" aria-hidden />
                        A seguir
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleFollowClick()}
                    disabled={followingLoading}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0 disabled:opacity-60"
                  >
                    {followingLoading ? (
                      <>
                        <Loader2
                          className="size-3.5 animate-spin shrink-0"
                          aria-hidden
                        />
                        <span className="sr-only">A carregar</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="size-3.5 shrink-0" aria-hidden />
                        Seguir
                      </>
                    )}
                  </button>
                )
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{data}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
            <Briefcase size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Profissional
            </span>
          </div>
          {isOwnPost ? (
            <PostMeatballMenu
              onEdit={startEdit}
              onDelete={requestDelete}
              deleteLoading={false}
            />
          ) : null}
        </div>
      </div>

      <div className="px-4 pt-1 pb-2 space-y-1.5">
        <h2 className="text-[15px] sm:text-base font-semibold text-foreground leading-snug tracking-tight">
          {titulo}
        </h2>
        <div>
          <p className="text-sm text-foreground/90 leading-relaxed line-clamp-4 whitespace-pre-wrap">
            {descricao}
          </p>
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-foreground mt-1 transition-colors"
          >
            ver mais
          </button>
        </div>
      </div>

      {resolvedVideoSrc ? (
        <FeedInlineVideo src={resolvedVideoSrc} posterUrl={videoPoster} />
      ) : imageGalleryUrls.length > 0 ? (
        <PostMediaGallery urls={imageGalleryUrls} alt={titulo || descricao} />
      ) : null}

      {postId && token && isOwnPost ? (
        <>
          <PostEditModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            postId={postId}
            token={token}
            initialContent={descricao}
            initialImageUrl={imagemPost}
            onSaved={(detail) => {
              onPostUpdated?.(detail)
              toast.success("Publicação atualizada.")
            }}
            onError={(message) => toast.error(message)}
          />
          <DeletePostConfirmDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={executeDelete}
            loading={deleting}
          />
        </>
      ) : null}

      <div className="px-4 pb-4 flex items-center justify-between border-t border-border/60 pt-3 bg-background/60">
        <div
          className={cn(
            "flex items-center gap-2 group rounded-md p-1 -m-1 transition-colors",
            likedVisual && "text-red-500"
          )}
        >
          <button
            type="button"
            onClick={() => void handleLikeClick()}
            disabled={liking || !postId}
            className={cn(
              "flex shrink-0 disabled:opacity-60",
              likedVisual ? "text-red-500" : "text-muted-foreground"
            )}
            title={likedVisual ? "Gostou" : "Gostar"}
            aria-label={likedVisual ? "Retirar gosto" : "Gostar"}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                likedVisual
                  ? "bg-red-50"
                  : "bg-muted group-hover:bg-red-50"
              )}
            >
              {liking ? (
                <Loader2
                  className={cn(
                    "size-4 animate-spin shrink-0",
                    likedVisual ? "text-red-500" : "text-muted-foreground"
                  )}
                  aria-hidden
                />
              ) : (
                <Heart
                  size={16}
                  className={cn(
                    "transition-colors",
                    likedVisual
                      ? "fill-red-500 text-red-500"
                      : "text-muted-foreground group-hover:text-red-500"
                  )}
                />
              )}
            </div>
          </button>
          {postId ? (
            <PostLikesTooltip
              key={`${postId}-${curtidas}`}
              postId={postId}
              totalLikes={curtidas}
              token={token}
              triggerClassName={cn(
                "text-xs tabular-nums",
                likedVisual
                  ? "text-red-500 font-medium"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            >
              {curtidas}
            </PostLikesTooltip>
          ) : (
            <span
              className={cn(
                "text-xs tabular-nums",
                likedVisual
                  ? "text-red-500 font-medium"
                  : "text-muted-foreground"
              )}
            >
              {curtidas}
            </span>
          )}
        </div>

        {!isOwnPost ? (
          <button
            type="button"
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md transition-colors cursor-pointer hover:bg-primary/90"
          >
            Contactar
          </button>
        ) : null}
      </div>
    </div>
  )
}
