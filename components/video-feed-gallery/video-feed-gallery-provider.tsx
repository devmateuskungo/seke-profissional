"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Loader2,
  Play,
  Share2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"

import { useToast } from "@/components/ui/toaster"
import { fetchHomeFeed } from "@/lib/feed-client"
import { likePost, unlikePost } from "@/lib/likes-client"
import { cn } from "@/lib/utils"
import {
  mergeVideoFeedEntries,
  postsToVideoFeedEntries,
  reconcileVideoFeedEntries,
  videoFeedEntryKey,
  type VideoFeedEntry,
} from "@/lib/video-feed-entries"
import type { LikePostResponse, PostDetail } from "@/types/post"

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

function formatActionCount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".", ",").replace(/,0$/, "")} mi`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(".", ",").replace(/,0$/, "")} mil`
  }
  return String(value)
}

function GallerySlideVideo({
  src,
  active,
}: {
  src: string
  active: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    if (active) {
      el.currentTime = 0
      void el.play().catch(() => {
        /* autoplay / play pode falhar — onPause cobre o UI */
      })
    } else {
      el.pause()
    }
  }, [active, src])

  const togglePlay = async () => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      try {
        await el.play()
      } catch {
        /* ignore */
      }
    } else {
      el.pause()
    }
  }

  return (
    <div className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-cover md:object-contain"
        playsInline
        loop
        muted={muted}
        preload={active ? "auto" : "metadata"}
        onClick={() => void togglePlay()}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {!playing ? (
        <button
          type="button"
          onClick={() => void togglePlay()}
          className="absolute inset-0 z-10 grid place-items-center bg-black/20"
          aria-label="Reproduzir vídeo"
        >
          <span className="inline-flex size-14 items-center justify-center rounded-full border-2 border-white/40 bg-black/50 text-white">
            <Play className="size-7 translate-x-0.5" aria-hidden />
          </span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setMuted((value) => !value)
        }}
        className="absolute bottom-28 left-3 z-20 inline-flex size-9 items-center justify-center rounded-full bg-black/50 text-white md:bottom-4"
        aria-label={muted ? "Ativar som" : "Silenciar"}
      >
        {muted ? (
          <VolumeX className="size-4" aria-hidden />
        ) : (
          <Volume2 className="size-4" aria-hidden />
        )}
      </button>
    </div>
  )
}

export type OpenVideoFeedOptions = {
  postId: string
  url: string
  /** Se o post ainda não estiver no feed carregado, usa isto como fallback inicial */
  fallback?: Omit<VideoFeedEntry, "key"> & { key?: string }
}

type VideoFeedGalleryContextValue = {
  openFromPost: (options: OpenVideoFeedOptions) => void
  close: () => void
  /** Sincroniza posts já carregados (ex. home feed) */
  syncFromPosts: (
    posts: PostDetail[],
    meta?: { page?: number; hasMore?: boolean }
  ) => void
  /** Atualiza o feed da página quando o like acontece na galeria */
  registerLikeListener: (
    listener: (postId: string, data: LikePostResponse) => void
  ) => () => void
  isOpen: boolean
}

const VideoFeedGalleryContext =
  createContext<VideoFeedGalleryContextValue | null>(null)

export function useVideoFeedGallery(): VideoFeedGalleryContextValue {
  const ctx = useContext(VideoFeedGalleryContext)
  if (!ctx) {
    throw new Error(
      "useVideoFeedGallery deve ser usado dentro de VideoFeedGalleryProvider"
    )
  }
  return ctx
}

export function useVideoFeedGalleryOptional(): VideoFeedGalleryContextValue | null {
  return useContext(VideoFeedGalleryContext)
}

export function VideoFeedGalleryProvider({
  children,
}: {
  children: ReactNode
}) {
  const toast = useToast()
  const [entries, setEntries] = useState<VideoFeedEntry[]>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [feedPage, setFeedPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [liking, setLiking] = useState(false)
  const galleryRef = useRef<HTMLDivElement | null>(null)
  const isProgrammaticScroll = useRef(false)
  const loadMoreInFlight = useRef(false)
  const bootstrapped = useRef(false)
  const entriesRef = useRef<VideoFeedEntry[]>([])
  const pendingOpenKey = useRef<string | null>(null)
  const likeListenersRef = useRef(
    new Set<(postId: string, data: LikePostResponse) => void>()
  )

  const isOpen = activeIndex !== null

  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  const syncFromPosts = useCallback(
    (posts: PostDetail[], meta?: { page?: number; hasMore?: boolean }) => {
      const fromFeed = postsToVideoFeedEntries(posts)
      setEntries((prev) => {
        const next = reconcileVideoFeedEntries(fromFeed, prev)
        entriesRef.current = next
        return next
      })
      if (typeof meta?.page === "number") setFeedPage(meta.page)
      if (typeof meta?.hasMore === "boolean") setHasMore(meta.hasMore)
      if (fromFeed.length > 0) bootstrapped.current = true
    },
    []
  )

  const fetchAndAppendPage = useCallback(
    async (page: number, mode: "replace" | "append") => {
      if (loadMoreInFlight.current) return
      loadMoreInFlight.current = true
      setLoadingMore(true)
      try {
        const token = getSessionToken()
        const result = await fetchHomeFeed({
          page,
          limit: 50,
          token: token ?? undefined,
        })
        if (!result.success) {
          if (mode === "replace") {
            toast.error(result.error || "Não foi possível carregar os vídeos.")
          }
          return
        }

        const nextEntries = postsToVideoFeedEntries(result.data.posts)
        setEntries((prev) => {
          const merged =
            mode === "replace"
              ? nextEntries
              : mergeVideoFeedEntries(prev, nextEntries)
          entriesRef.current = merged
          return merged
        })
        setFeedPage(page)

        const pagination = result.data.pagination
        const more =
          pagination.has_more === true ||
          pagination.hasMore === true ||
          (typeof pagination.total_pages === "number" &&
            page < pagination.total_pages) ||
          (typeof pagination.totalPages === "number" &&
            page < pagination.totalPages)
        setHasMore(more)
        bootstrapped.current = true
      } finally {
        loadMoreInFlight.current = false
        setLoadingMore(false)
      }
    },
    [toast]
  )

  const ensureFeed = useCallback(async () => {
    if (entriesRef.current.length > 0) return
    await fetchAndAppendPage(1, "replace")
  }, [fetchAndAppendPage])

  const openFromPost = useCallback(
    (options: OpenVideoFeedOptions) => {
      const postId = String(options.postId)
      const url = options.url.trim()
      if (!url) return

      const key = videoFeedEntryKey(postId, url)
      pendingOpenKey.current = key

      void (async () => {
        await ensureFeed()

        setEntries((prev) => {
          let next = prev
          const exists = next.some((e) => e.key === key)

          if (!exists && options.fallback) {
            const fallbackEntry: VideoFeedEntry = {
              key,
              postId,
              url,
              liked: options.fallback.liked,
              likesCount: options.fallback.likesCount,
              shareUrl: options.fallback.shareUrl,
              shareTitle: options.fallback.shareTitle,
              authorName: options.fallback.authorName,
              authorAvatar: options.fallback.authorAvatar,
            }
            next = mergeVideoFeedEntries([fallbackEntry], next)
          } else if (!exists) {
            next = mergeVideoFeedEntries(
              [
                {
                  key,
                  postId,
                  url,
                  liked: false,
                  likesCount: 0,
                  shareUrl: `/posts/${postId}`,
                  shareTitle: "Publicação SEKE",
                  authorName: "Utilizador",
                  authorAvatar: null,
                },
              ],
              next
            )
          }

          entriesRef.current = next
          return next
        })

        const index = entriesRef.current.findIndex((e) => e.key === key)
        setActiveIndex(index >= 0 ? index : 0)
        pendingOpenKey.current = null
      })()
    },
    [ensureFeed]
  )

  const close = useCallback(() => {
    setActiveIndex(null)
  }, [])

  const registerLikeListener = useCallback(
    (listener: (postId: string, data: LikePostResponse) => void) => {
      likeListenersRef.current.add(listener)
      return () => {
        likeListenersRef.current.delete(listener)
      }
    },
    []
  )

  const goToPrev = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null || current <= 0) return current
      return current - 1
    })
  }, [])

  const goToNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) return current
      if (current >= entries.length - 1) return current
      return current + 1
    })
  }, [entries.length])

  const scrollGalleryTo = useCallback((index: number) => {
    const root = galleryRef.current
    if (!root) return
    const slide = root.children[index] as HTMLElement | undefined
    if (!slide) return
    isProgrammaticScroll.current = true
    root.scrollTo({ top: slide.offsetTop, behavior: "smooth" })
    window.setTimeout(() => {
      isProgrammaticScroll.current = false
    }, 450)
  }, [])

  const onGalleryScroll = useCallback(() => {
    if (isProgrammaticScroll.current) return
    const root = galleryRef.current
    if (!root || root.clientHeight === 0) return
    const next = Math.round(root.scrollTop / root.clientHeight)
    setActiveIndex(Math.max(0, Math.min(entries.length - 1, next)))
  }, [entries.length])

  useEffect(() => {
    if (activeIndex === null) return
    scrollGalleryTo(activeIndex)
  }, [activeIndex, scrollGalleryTo])

  // Prefetch mais vídeos perto do fim
  useEffect(() => {
    if (activeIndex === null) return
    if (!hasMore || loadingMore) return
    if (activeIndex < entries.length - 3) return
    void fetchAndAppendPage(feedPage + 1, "append")
  }, [
    activeIndex,
    entries.length,
    hasMore,
    loadingMore,
    feedPage,
    fetchAndAppendPage,
  ])

  useEffect(() => {
    if (!isOpen) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault()
        goToNext()
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault()
        goToPrev()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [isOpen, close, goToNext, goToPrev])

  const current = activeIndex !== null ? entries[activeIndex] : null
  const canGoPrev = activeIndex !== null && activeIndex > 0

  const handleLike = useCallback(async () => {
    if (!current) return
    const token = getSessionToken()
    if (!token) {
      toast.error("Inicie sessão para gostar desta publicação.")
      return
    }

    const wasLiked = current.liked
    const previousCount = current.likesCount
    setEntries((prev) =>
      prev.map((e) =>
        e.postId === current.postId
          ? {
              ...e,
              liked: !wasLiked,
              likesCount: Math.max(0, previousCount + (wasLiked ? -1 : 1)),
            }
          : e
      )
    )
    setLiking(true)
    const result = wasLiked
      ? await unlikePost(current.postId, token, {
          previousLikeCount: previousCount,
        })
      : await likePost(current.postId, token, {
          previousLikeCount: previousCount,
        })
    setLiking(false)

    if (result.success) {
      setEntries((prev) =>
        prev.map((e) =>
          e.postId === current.postId
            ? {
                ...e,
                liked: result.data.liked,
                likesCount: result.data.total_likes,
              }
            : e
        )
      )
      likeListenersRef.current.forEach((listener) => {
        listener(current.postId, result.data)
      })
    } else {
      setEntries((prev) =>
        prev.map((e) =>
          e.postId === current.postId
            ? { ...e, liked: wasLiked, likesCount: previousCount }
            : e
        )
      )
      toast.error(result.error)
    }
  }, [current, toast])

  const handleShare = useCallback(async () => {
    if (!current) return
    let url = current.shareUrl
    try {
      url = new URL(current.shareUrl, window.location.origin).toString()
    } catch {
      /* keep relative */
    }
    const title = current.shareTitle || "Publicação SEKE"

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, url, text: title })
        return
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
    }

    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copiado.")
    } catch {
      toast.error("Não foi possível partilhar. Tente novamente.")
    }
  }, [current, toast])

  const value = useMemo<VideoFeedGalleryContextValue>(
    () => ({
      openFromPost,
      close,
      syncFromPosts,
      registerLikeListener,
      isOpen,
    }),
    [openFromPost, close, syncFromPosts, registerLikeListener, isOpen]
  )

  return (
    <VideoFeedGalleryContext.Provider value={value}>
      {children}

      {isOpen && current ? (
        <div
          className="fixed inset-0 z-50 bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Galeria de vídeos do sistema"
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-4 left-4 z-60 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>

          {/* Mobile: vídeo fullscreen. Desktop: coluna 9:16 + acções ao lado */}
          <div className="relative flex h-full w-full items-center justify-center md:gap-[30px] md:px-4 md:pr-20">
            <div
              ref={galleryRef}
              className="h-full w-full overflow-y-auto overscroll-contain snap-y snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:h-[min(100dvh,920px)] md:w-[min(100%,calc(min(100dvh,920px)*9/16))] md:shrink-0 md:rounded-sm"
              onScroll={onGalleryScroll}
            >
              {entries.map((entry, index) => (
                <GallerySlideVideo
                  key={entry.key}
                  src={entry.url}
                  active={activeIndex === index}
                />
              ))}
            </div>

            {/* Acções: overlay no mobile, coluna ao lado no desktop */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-60 bg-gradient-to-t from-black/55 via-black/20 to-transparent px-3 pb-8 pt-16 md:pointer-events-auto md:static md:inset-auto md:bottom-auto md:bg-none md:px-0 md:pb-0 md:pt-0">
              <div className="flex items-end justify-between gap-3 md:block">
                <div className="min-w-0 flex-1 pb-1 md:mb-1 md:max-w-[5.5rem] md:pb-0 md:text-center">
                  <p className="truncate text-sm font-semibold text-white drop-shadow md:text-[11px] md:text-white/90">
                    {current.authorName}
                  </p>
                </div>

                <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-5 md:gap-6">
                  <button
                    type="button"
                    onClick={() => void handleLike()}
                    disabled={liking}
                    className="flex flex-col items-center gap-1 disabled:opacity-50 md:gap-1.5"
                    aria-label={current.liked ? "Retirar gosto" : "Gostar"}
                  >
                    {liking ? (
                      <Loader2 className="size-8 animate-spin text-white" />
                    ) : (
                      <Heart
                        className={cn(
                          "size-8 drop-shadow-md",
                          current.liked
                            ? "fill-[#FE2C55] text-[#FE2C55]"
                            : "text-white"
                        )}
                        strokeWidth={current.liked ? 0 : 2}
                      />
                    )}
                    <span className="text-xs font-semibold tabular-nums text-white drop-shadow">
                      {formatActionCount(current.likesCount)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleShare()}
                    className="flex flex-col items-center gap-1 md:gap-1.5"
                    aria-label="Partilhar"
                  >
                    <Share2
                      className="size-8 text-white drop-shadow-md"
                      strokeWidth={2}
                    />
                    <span className="text-xs font-semibold text-white drop-shadow">
                      Partilhar
                    </span>
                  </button>

                  {loadingMore ? (
                    <Loader2 className="mt-1 size-5 animate-spin text-white/70" />
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Navegação: discreta no mobile, coluna à direita no desktop */}
          <div className="absolute top-1/2 right-2 z-60 flex -translate-y-1/2 flex-col items-center gap-2 md:right-5 md:gap-3">
            <button
              type="button"
              onClick={goToPrev}
              disabled={!canGoPrev}
              className="inline-flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/55 disabled:opacity-30 md:size-11 md:bg-[#3a3b3c] md:hover:bg-[#4e4f50]"
              aria-label="Vídeo anterior"
            >
              <ChevronUp className="size-5 md:size-6" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={goToNext}
              disabled={
                activeIndex === null ||
                (activeIndex >= entries.length - 1 && !hasMore)
              }
              className="inline-flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/55 disabled:opacity-30 md:size-11 md:bg-[#3a3b3c] md:hover:bg-[#4e4f50]"
              aria-label="Vídeo seguinte"
            >
              <ChevronDown className="size-5 md:size-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ) : null}
    </VideoFeedGalleryContext.Provider>
  )
}
