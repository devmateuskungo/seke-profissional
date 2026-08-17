"use client"

import { useCallback, useEffect, useMemo, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { FileSearch, Search } from "lucide-react"
import ItemPostProfissonal from "@/components/itempostprofissional/itempostprofissional"
import { HomeFeedPostSkeleton } from "@/components/home/home-feed-skeleton"
import { Button } from "@/components/ui/button"
import { searchPostsByHashtag } from "@/lib/feed-client"
import { postDetailToProfissionalFeedRow } from "@/lib/feed-map"
import {
  formatHashtagForDisplay,
  normalizeHashtagLabel,
} from "@/lib/posts-client"
import { toProfissionalFeedItem } from "@/types/home-feed"
import type { FollowUserResponse, LikePostResponse, PostDetail } from "@/types/post"
import { useAuth } from "@/lib/use-auth"

const PAGE_LIMIT = 20

function resolveAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

export default function PesquisaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-start gap-6">
          <aside className="hidden w-[342px] shrink-0 lg:block">
            <div className="h-24 animate-pulse rounded-md border border-gray-200 bg-white" />
          </aside>
          <div className="min-w-0 flex-1 space-y-4">
            <HomeFeedPostSkeleton />
            <HomeFeedPostSkeleton />
          </div>
        </div>
      }
    >
      <PesquisaResults />
    </Suspense>
  )
}

function PesquisaResults() {
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()
  const rawQuery =
    searchParams.get("hashtag")?.trim() || searchParams.get("q")?.trim() || ""
  const hashtag = normalizeHashtagLabel(rawQuery)
  const displayTag = formatHashtagForDisplay(hashtag)

  const [posts, setPosts] = useState<PostDetail[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalFound, setTotalFound] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPosts = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!hashtag) {
        setPosts([])
        setError(null)
        setHasMore(false)
        setTotalFound(null)
        return
      }

      if (append) setLoadingMore(true)
      else setLoading(true)

      const token = resolveAuthToken()
      const result = await searchPostsByHashtag(hashtag, {
        page: nextPage,
        limit: PAGE_LIMIT,
        token,
      })

      if (!result.success) {
        if (!append) setPosts([])
        setError(result.error)
        setHasMore(false)
        if (!append) setTotalFound(null)
        setLoading(false)
        setLoadingMore(false)
        return
      }

      setPosts((prev) => (append ? [...prev, ...result.data.posts] : result.data.posts))
      const pagination = result.data.pagination
      const total =
        typeof pagination.total === "number" && Number.isFinite(pagination.total)
          ? pagination.total
          : result.data.posts.length
      setTotalFound(total)
      const reachedEnd =
        pagination.has_more === false ||
        pagination.hasMore === false ||
        (pagination.total_pages != null && nextPage >= pagination.total_pages) ||
        (pagination.totalPages != null && nextPage >= pagination.totalPages) ||
        result.data.posts.length < PAGE_LIMIT
      setHasMore(!reachedEnd)
      setPage(nextPage)
      setError(null)
      setLoading(false)
      setLoadingMore(false)
    },
    [hashtag]
  )

  useEffect(() => {
    void loadPosts(1, false)
  }, [loadPosts, isAuthenticated])

  const items = useMemo(
    () =>
      posts.map((post) =>
        toProfissionalFeedItem(postDetailToProfissionalFeedRow(post))
      ),
    [posts]
  )

  const handleLikeResult = (postId: string, data: LikePostResponse) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked_by_me: data.liked,
              stats: { ...post.stats, likes: data.total_likes },
            }
          : post
      )
    )
  }

  const handleFollowResult = (authorUserId: string, data: FollowUserResponse) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.user.id === authorUserId
          ? { ...post, following_author: data.following }
          : post
      )
    )
  }

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId))
  }

  const results = !hashtag ? (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <Search className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">
        Ex.: design, fotografia ou #seke
      </p>
    </div>
  ) : loading ? (
    <div className="space-y-4">
      <HomeFeedPostSkeleton />
      <HomeFeedPostSkeleton />
    </div>
  ) : error && posts.length === 0 ? (
    <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
      <p className="text-sm text-destructive">{error}</p>
      <Button
        type="button"
        variant="outline"
        className="mt-4"
        onClick={() => void loadPosts(1, false)}
      >
        Tentar novamente
      </Button>
    </div>
  ) : items.length === 0 ? (
    <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
      <p className="text-sm text-muted-foreground">
        Não encontrámos publicações com {displayTag}.
      </p>
    </div>
  ) : (
    <div>
      {items.map((item) => (
        <div key={item.id} className="py-4 first:pt-0">
          <ItemPostProfissonal
            {...item.data}
            onPostDeleted={() => handlePostDeleted(item.id)}
            onLikeResult={(likeData) => handleLikeResult(item.id, likeData)}
            onFollowResult={handleFollowResult}
          />
        </div>
      ))}
      {hasMore ? (
        <div className="flex justify-center py-6">
          {loadingMore ? (
            <HomeFeedPostSkeleton />
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadPosts(page + 1, true)}
            >
              Carregar mais publicações
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )

  const showTotalCard = Boolean(hashtag && totalFound != null && !loading)
  const totalCard = (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-600">
          <FileSearch className="size-5" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Total encontrado</p>
          <p className="text-2xl font-semibold tabular-nums text-gray-900">
            {totalFound}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Pesquisa</h1>
        {hashtag ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Publicações com {displayTag}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Escreva uma hashtag na barra de pesquisa para ver publicações.
          </p>
        )}
      </header>

      <div className="flex items-start gap-6">
        <aside className="sticky top-20 z-10 hidden w-[342px] shrink-0 self-start lg:block">
          {showTotalCard ? totalCard : null}
          {hashtag && loading ? (
            <div className="h-24 animate-pulse rounded-md border border-gray-200 bg-white" />
          ) : null}
        </aside>

        <main className="min-w-0 flex-1">
          {showTotalCard ? <div className="mb-4 lg:hidden">{totalCard}</div> : null}
          {results}
        </main>
      </div>
    </div>
  )
}
