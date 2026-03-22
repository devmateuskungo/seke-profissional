"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Briefcase, Heart, Loader2, UserMinus, UserPlus } from "lucide-react"

import { DeletePostConfirmDialog } from "@/components/delete-post-confirm-dialog/delete-post-confirm-dialog"
import { PostLikesTooltip } from "@/components/post-likes-tooltip/post-likes-tooltip"
import { PostMeatballMenu } from "@/components/post-meatball-menu/post-meatball-menu"
import { PostEditModal } from "@/components/post-edit-modal/post-edit-modal"
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

export interface ItemPostProfissonalProps {
  nome?: string
  data?: string
  descricao?: string
  titulo?: string
  imagemPerfil?: string
  imagemPost?: string
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
  imagemPost = "/imageprofissional.png",
  curtidas = 42,
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

  useEffect(() => {
    setFollowing(followingAuthor)
  }, [followingAuthor])

  const isOwnPost =
    !!postId &&
    !!token &&
    sameUserId(viewerId, authorUserId)

  const profileHref = authorUserId
    ? `/detalhesuser?userId=${encodeURIComponent(authorUserId)}`
    : "/detalhesuser"

  const avatarSrc = resolveUserAvatarUrl(imagemPerfil)

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
    setLiking(true)
    const result = likedByMe
      ? await unlikePost(postId, token)
      : await likePost(postId, token)
    setLiking(false)
    if (result.success) {
      onLikeResult?.(result.data)
    } else {
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
                <h3 className="font-semibold text-sm hover:underline cursor-pointer truncate">
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

      {imagemPost ? (
        <div className="relative w-full h-64 bg-muted">
          <Image
            src={imagemPost}
            alt="Post image"
            fill
            className="object-cover"
            unoptimized={imageNeedsUnoptimized(imagemPost)}
          />
        </div>
      ) : null}

      <div className="p-4 space-y-3">
        <h2 className="text-lg md:text-xl font-semibold tracking-tight">
          {titulo}
        </h2>

        <div>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
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
            likedByMe && "text-red-500"
          )}
        >
          <button
            type="button"
            onClick={() => void handleLikeClick()}
            disabled={liking || !postId}
            className={cn(
              "flex shrink-0 disabled:opacity-60",
              likedByMe ? "text-red-500" : "text-muted-foreground"
            )}
            title={likedByMe ? "Gostou" : "Gostar"}
            aria-label={likedByMe ? "Retirar gosto" : "Gostar"}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                likedByMe
                  ? "bg-red-50"
                  : "bg-muted group-hover:bg-red-50"
              )}
            >
              {liking ? (
                <Loader2
                  className="size-4 animate-spin text-muted-foreground"
                  aria-hidden
                />
              ) : (
                <Heart
                  size={16}
                  className={cn(
                    "transition-colors",
                    likedByMe
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
                likedByMe
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
                likedByMe
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
