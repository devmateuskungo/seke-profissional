"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Briefcase,
  Heart,
  Loader2,
  MessageCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/toaster"
import { DeletePostConfirmDialog } from "@/components/delete-post-confirm-dialog/delete-post-confirm-dialog"
import { PostEditModal } from "@/components/post-edit-modal/post-edit-modal"
import { PostMeatballMenu } from "@/components/post-meatball-menu/post-meatball-menu"
import { PostLikesTooltip } from "@/components/post-likes-tooltip/post-likes-tooltip"
import { likePost, unlikePost } from "@/lib/likes-client"
import { deletePost, fetchPostById } from "@/lib/posts-client"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { sameUserId, useViewerUserId } from "@/lib/viewer-user-id"
import type { LikePostResponse, PostDetail } from "@/types/post"
import { cn } from "@/lib/utils"

function resolveAuthToken(accessToken: string | null | undefined): string | null {
  if (accessToken !== undefined) return accessToken
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

function formatPostDate(iso: string): string {
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

function imageNeedsUnoptimized(src: string): boolean {
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("//")
  )
}

export interface ItemPostPublicacaoContentProps {
  post: PostDetail
  className?: string
  /** Se omitido, usa `sessionStorage.auth_token` no cliente */
  accessToken?: string | null
  /** Chamado após PUT bem-sucedido com o `post` devolvido pela API */
  onPostSaved?: (post: PostDetail) => void
  /** Chamado após DELETE bem-sucedido (ex.: redirecionar) */
  onPostDeleted?: () => void
  /** Após POST like — atualizar estado local com `liked` e `total_likes` */
  onLikeResult?: (data: LikePostResponse) => void
}

/**
 * Vista de uma publicação já carregada (dados de GET /posts/:id).
 */
export function ItemPostPublicacaoContent({
  post,
  className,
  accessToken,
  onPostSaved,
  onPostDeleted,
  onLikeResult,
}: ItemPostPublicacaoContentProps) {
  const toast = useToast()
  const viewerId = useViewerUserId()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [liking, setLiking] = useState(false)

  const token = resolveAuthToken(accessToken)
  const isOwnPost = !!token && sameUserId(viewerId, post.user.id)

  const requestDelete = () => setDeleteDialogOpen(true)

  const executeDelete = async () => {
    if (!token) return
    setDeleting(true)
    try {
      const result = await deletePost(post.id, token)
      if (result.success) {
        setDeleteDialogOpen(false)
        onPostDeleted?.()
      } else {
        window.alert(result.error)
      }
    } finally {
      setDeleting(false)
    }
  }

  const startEdit = () => {
    setEditModalOpen(true)
  }

  const handleLikeClick = async () => {
    if (!token) {
      toast.error("Inicie sessão para gostar desta publicação.")
      return
    }
    setLiking(true)
    const result = liked
      ? await unlikePost(post.id, token)
      : await likePost(post.id, token)
    setLiking(false)
    if (result.success) {
      onLikeResult?.(result.data)
    } else {
      toast.error(result.error)
    }
  }

  const avatarSrc = resolveUserAvatarUrl(post.user.avatar)
  const imageSrc = post.image?.trim() || ""
  const imageAlt =
    post.content.trim().slice(0, 100) || "Imagem da publicação"
  const liked = post.liked_by_me === true

  return (
    <Card className={cn("overflow-hidden border-border/80", className)}>
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-muted rounded-full overflow-hidden shrink-0">
            <Image
              src={avatarSrc}
              alt={post.user.name}
              width={40}
              height={40}
              className="object-cover w-full h-full"
              unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
            />
          </div>
          <div className="space-y-0.5 min-w-0">
            <Link
              href={`/detalhesuser?userId=${encodeURIComponent(post.user.id)}`}
              className="font-semibold text-sm hover:underline truncate block"
            >
              {post.user.name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {formatPostDate(post.created_at)}
            </p>
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
      </CardHeader>

      {imageSrc ? (
        <div className="relative w-full aspect-video max-h-80 bg-muted">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 42rem"
            unoptimized={imageNeedsUnoptimized(imageSrc)}
          />
        </div>
      ) : null}

      <CardContent className="p-4 space-y-3">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      </CardContent>

      {token && isOwnPost ? (
        <>
          <PostEditModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            postId={post.id}
            token={token}
            initialContent={post.content}
            initialImageUrl={post.image}
            onSaved={(detail) => onPostSaved?.(detail)}
            onError={(message) => window.alert(message)}
          />
          <DeletePostConfirmDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={executeDelete}
            loading={deleting}
          />
        </>
      ) : null}

      <CardFooter className="px-4 pb-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 bg-background/60">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex items-center gap-2 text-muted-foreground rounded-md p-1 -m-1",
              liked && "text-red-500"
            )}
          >
            <button
              type="button"
              onClick={() => void handleLikeClick()}
              disabled={liking}
              className={cn(
                "flex items-center justify-center rounded-md transition-colors hover:text-foreground disabled:opacity-60",
                liked ? "text-red-500" : "text-muted-foreground"
              )}
              title={liked ? "Gostou" : "Gostar"}
              aria-label={liked ? "Retirar gosto" : "Gostar"}
            >
              {liking ? (
                <Loader2 className="size-[18px] shrink-0 animate-spin" aria-hidden />
              ) : (
                <Heart
                  size={18}
                  className={cn(
                    "shrink-0",
                    liked && "fill-red-500 text-red-500"
                  )}
                />
              )}
            </button>
            <PostLikesTooltip
              key={`${post.id}-${post.stats.likes}`}
              postId={post.id}
              totalLikes={post.stats.likes}
              token={token}
              triggerClassName={cn(
                "text-sm tabular-nums",
                liked && "text-red-500 font-medium"
              )}
            >
              {post.stats.likes}
            </PostLikesTooltip>
          </div>
          <div
            className="flex items-center gap-2 text-muted-foreground"
            title="Comentários"
          >
            <MessageCircle size={18} className="shrink-0" />
            <span className="text-sm tabular-nums">{post.stats.comments}</span>
          </div>
        </div>
        {!isOwnPost ? (
          <Button size="sm" className="text-xs" asChild>
            <Link href={`/detalhesuser?userId=${encodeURIComponent(post.user.id)}`}>
              Contactar
            </Link>
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  )
}

function PostPublicacaoSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 flex flex-row justify-between gap-3">
        <div className="flex gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </CardHeader>
      <Skeleton className="w-full aspect-video rounded-none" />
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  )
}

export interface ItemPostPublicacaoProps {
  postId: string
  className?: string
  /** Token Bearer; se omitido, usa `sessionStorage.auth_token` no cliente */
  accessToken?: string | null
}

/**
 * Carrega e exibe uma publicação (GET /api/posts/:id → proxy para GET /posts/:id).
 */
export function ItemPostPublicacao({
  postId,
  className,
  accessToken,
}: ItemPostPublicacaoProps) {
  const router = useRouter()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const result = await fetchPostById(
        postId,
        resolveAuthToken(accessToken)
      )
      if (cancelled) return
      if (result.success) {
        setPost(result.data)
        setError(null)
      } else {
        setPost(null)
        setError(result.error)
      }
      setLoading(false)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [postId, accessToken])

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    void (async () => {
      const result = await fetchPostById(
        postId,
        resolveAuthToken(accessToken)
      )
      if (result.success) {
        setPost(result.data)
        setError(null)
      } else {
        setPost(null)
        setError(result.error)
      }
      setLoading(false)
    })()
  }

  if (loading) {
    return (
      <div className={className}>
        <PostPublicacaoSkeleton />
      </div>
    )
  }

  if (error || !post) {
    return (
      <Card className={cn("p-6 border-destructive/30", className)}>
        <p className="text-sm text-destructive mb-3">
          {error ?? "Não foi possível carregar a publicação."}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
          Tentar novamente
        </Button>
      </Card>
    )
  }

  return (
    <ItemPostPublicacaoContent
      key={post.id}
      post={post}
      className={className}
      accessToken={resolveAuthToken(accessToken)}
      onPostSaved={setPost}
      onPostDeleted={() => router.push("/")}
      onLikeResult={(data) =>
        setPost((p) =>
          p
            ? {
                ...p,
                liked_by_me: data.liked,
                stats: { ...p.stats, likes: data.total_likes },
              }
            : null
        )
      }
    />
  )
}

export default ItemPostPublicacao
