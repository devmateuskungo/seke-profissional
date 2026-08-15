"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  FileText,
  Heart,
  ImageIcon,
  Loader2,
  MessageCircle,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatFeedDate } from "@/lib/feed-map"
import { fetchPostsByUserId } from "@/lib/posts-client"
import { userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { cn } from "@/lib/utils"
import type { UserPostListItem } from "@/types/post"

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

function previewText(content: string, max = 280): string {
  const line = content.trim()
  if (!line) return "Publicação sem texto"
  return line.length > max ? `${line.slice(0, max).trim()}…` : line
}

interface ProfileUserPostsCardProps {
  active?: boolean
  disabled?: boolean
  onViewPosts: () => void
}

export function ProfileUserPostsCard({
  active = false,
  disabled = false,
  onViewPosts,
}: ProfileUserPostsCardProps) {
  return (
    <div className="rounded-2xl border border-border/45 bg-card p-5 text-card-foreground">
      <div className="mb-3 border-b border-border/40 pb-3">
        <h3 className="text-base font-semibold text-foreground">
          Publicações
        </h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Veja as suas publicações no Seke.
      </p>
      <Button
        type="button"
        className="w-full"
        variant={active ? "outline" : "default"}
        disabled={disabled}
        aria-pressed={active}
        onClick={onViewPosts}
      >
        <FileText className="size-4" aria-hidden />
        {active ? "A ver publicações" : "Ver publicações"}
      </Button>
    </div>
  )
}

interface ProfileUserPostsPanelProps {
  userId: string | null
  authorName?: string
  onBack: () => void
}

export function ProfileUserPostsPanel({
  userId,
  authorName = "Utilizador",
  onBack,
}: ProfileUserPostsPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<UserPostListItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const loadPosts = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!userId) {
        setLoading(false)
        setPosts([])
        setTotal(0)
        return
      }

      if (append) setLoadingMore(true)
      else setLoading(true)

      const result = await fetchPostsByUserId(userId, {
        token: getSessionToken(),
        page: nextPage,
        limit: 20,
      })

      if (!result.success) {
        setError(result.error)
        if (!append) {
          setPosts([])
          setTotal(0)
        }
        setLoading(false)
        setLoadingMore(false)
        return
      }

      setError(null)
      setPosts((prev) => (append ? [...prev, ...result.data] : result.data))
      setPage(nextPage)
      setTotal(result.pagination?.total ?? result.data.length)
      setLoading(false)
      setLoadingMore(false)
    },
    [userId]
  )

  useEffect(() => {
    void loadPosts(1, false)
  }, [loadPosts])

  const hasMore = posts.length < total

  const shell = (children: ReactNode) => (
    <div className="rounded-2xl border border-border/45 bg-card p-5 text-card-foreground">
      <div className="mb-3 flex items-center gap-3 border-b border-border/40 pb-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar ao perfil"
          className="rounded-lg p-1.5 text-foreground transition-colors hover:bg-accent"
        >
          <ArrowLeft size={18} aria-hidden />
        </button>
        <h3 className="text-base font-semibold text-foreground">Publicações</h3>
      </div>
      {children}
    </div>
  )

  if (!userId) {
    return shell(
      <p className="py-8 text-center text-sm text-muted-foreground">
        Não foi possível identificar o utilizador.
      </p>
    )
  }

  if (loading) {
    return shell(
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        A carregar publicações…
      </div>
    )
  }

  if (error && posts.length === 0) {
    return shell(
      <div className="flex flex-col items-center py-16 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void loadPosts(1, false)}
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (posts.length === 0) {
    return shell(
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <FileText
          size={40}
          strokeWidth={1}
          className="mb-2 opacity-20"
          aria-hidden
        />
        <p className="text-sm font-medium text-foreground">
          Ainda não tem publicações
        </p>
        <p className="mt-1 text-xs">
          Quando {authorName.split(" ")[0] || "você"} publicar, as publicações
          aparecem aqui.
        </p>
      </div>
    )
  }

  return shell(
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {total} publicação{total === 1 ? "" : "ões"}
      </p>
      <ul className="space-y-3">
        {posts.map((post) => {
          const thumb = post.media_urls[0]
          const isVideo = post.media_type === "video"

          return (
            <li key={post.id}>
              <button
                type="button"
                onClick={() =>
                  router.push(`/posts/${encodeURIComponent(post.id)}`)
                }
                className="flex w-full gap-4 rounded-xl border border-border/45 bg-muted/20 p-4 text-left transition-colors hover:bg-accent"
              >
                <span
                  className={cn(
                    "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground",
                    thumb && !isVideo ? "size-20" : "size-16"
                  )}
                >
                  {thumb && !isVideo ? (
                    <Image
                      src={thumb}
                      alt=""
                      width={80}
                      height={80}
                      className="size-full object-cover"
                      unoptimized={userAvatarSrcUnoptimized(thumb)}
                    />
                  ) : isVideo ? (
                    <Play className="size-6" aria-hidden />
                  ) : thumb ? (
                    <ImageIcon className="size-6" aria-hidden />
                  ) : (
                    <FileText className="size-6" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-4 whitespace-pre-wrap text-sm text-foreground">
                    {previewText(post.content)}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatFeedDate(post.created_at)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="size-3" aria-hidden />
                      {post.likes_count}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="size-3" aria-hidden />
                      {post.comments_count}
                    </span>
                    {isVideo ? <span>Vídeo</span> : null}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {hasMore ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={loadingMore}
          onClick={() => void loadPosts(page + 1, true)}
        >
          {loadingMore ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              A carregar…
            </>
          ) : (
            "Carregar mais"
          )}
        </Button>
      ) : null}
    </div>
  )
}
