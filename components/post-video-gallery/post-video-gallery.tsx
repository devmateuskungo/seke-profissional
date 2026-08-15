"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Heart,
  Loader2,
  Play,
  Share2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { dedupeMediaUrls } from "@/lib/posts-client"
import { useToast } from "@/components/ui/toaster"
import { useVideoFeedGalleryOptional } from "@/components/video-feed-gallery/video-feed-gallery-provider"

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

function CarouselVideoSlide({
  src,
  posterUrl,
  active,
  onOpen,
}: {
  src: string
  posterUrl?: string | null
  active: boolean
  onOpen: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (!active) {
      el.pause()
      return
    }
    // Autoplay só é fiável com muted no elemento (sem setState no effect).
    el.muted = true
    void el.play().catch(() => {
      /* autoplay pode falhar */
    })
  }, [active, src])

  return (
    <div className="relative h-full w-full shrink-0 snap-center bg-black">
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-contain"
        playsInline
        muted={muted}
        loop
        preload="metadata"
        poster={posterUrl ?? undefined}
        onClick={onOpen}
      />
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 grid place-items-center bg-black/25 transition-colors hover:bg-black/35"
        aria-label="Abrir galeria de vídeos"
      >
        <span className="inline-flex size-14 items-center justify-center rounded-full border-2 border-white/40 bg-black/50 text-white shadow-lg backdrop-blur-[2px]">
          <Play className="size-7 translate-x-0.5" aria-hidden />
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          const el = videoRef.current
          if (!el) return
          const next = !el.muted
          el.muted = next
          setMuted(next)
        }}
        className="absolute bottom-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-sm backdrop-blur-sm hover:bg-black/55"
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

function SingleInlineVideo({
  src,
  posterUrl,
  onOpen,
}: {
  src: string
  posterUrl?: string | null
  onOpen?: () => void
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
    if (onOpen) {
      onOpen()
      return
    }
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
    syncPlaying()
  }

  return (
    <div className="relative w-full aspect-video max-h-[min(560px,80vh)] min-h-[220px] bg-black">
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
          aria-label={onOpen ? "Abrir vídeo" : "Reproduzir vídeo"}
        >
          <span className="inline-flex size-17 items-center justify-center rounded-full border-2 border-white/40 bg-black/50 text-white shadow-lg backdrop-blur-[2px]">
            <Play className="size-8 translate-x-0.5" aria-hidden />
          </span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          const el = videoRef.current
          if (!el) return
          const next = !el.muted
          el.muted = next
          setMuted(next)
        }}
        className="absolute bottom-2 right-2 z-10 inline-flex size-9 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-sm backdrop-blur-sm hover:bg-black/55"
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

function formatActionCount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".", ",").replace(/,0$/, "")} mi`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(".", ",").replace(/,0$/, "")} mil`
  }
  return String(value)
}

export interface PostVideoGalleryProps {
  urls: string[]
  posterUrl?: string | null
  className?: string
  /** ID do post — com o provider global, abre o feed de todos os vídeos do sistema */
  postId?: string | null
  authorName?: string | null
  authorAvatar?: string | null
  liked?: boolean
  likesCount?: number
  liking?: boolean
  onLike?: () => void
  shareUrl?: string | null
  shareTitle?: string | null
}

/**
 * 1 vídeo → player inline.
 * 2+ vídeos → carrossel; ao clicar abre galeria vertical (formato Reels).
 * Com `VideoFeedGalleryProvider` + `postId`, a galeria percorre vídeos de todos os utilizadores.
 */
export function PostVideoGallery({
  urls,
  posterUrl,
  className,
  postId,
  authorName,
  authorAvatar,
  liked = false,
  likesCount = 0,
  liking = false,
  onLike,
  shareUrl,
  shareTitle,
}: PostVideoGalleryProps) {
  const toast = useToast()
  const videoFeed = useVideoFeedGalleryOptional()
  const videos = dedupeMediaUrls(
    urls.map(normalizeMediaSrc).filter((u): u is string => Boolean(u))
  )

  const [activeIndex, setActiveIndex] = useState(0)
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const galleryRef = useRef<HTMLDivElement | null>(null)
  const isProgrammaticScroll = useRef(false)

  const hasMultiple = videos.length > 1
  const useGlobalFeed = Boolean(videoFeed && postId)
  const galleryOpen = galleryIndex !== null

  const openGallery = useCallback(
    (index: number) => {
      const src = videos[index]
      if (!src) return

      if (videoFeed && postId) {
        videoFeed.openFromPost({
          postId: String(postId),
          url: src,
          fallback: {
            postId: String(postId),
            url: src,
            liked,
            likesCount,
            shareUrl: shareUrl?.trim() || `/posts/${postId}`,
            shareTitle: shareTitle?.trim() || "Publicação SEKE",
            authorName: authorName?.trim() || "Utilizador",
            authorAvatar: authorAvatar ?? null,
          },
        })
        return
      }

      setGalleryIndex(index)
    },
    [
      videos,
      videoFeed,
      postId,
      liked,
      likesCount,
      shareUrl,
      shareTitle,
      authorName,
      authorAvatar,
    ]
  )

  const closeGallery = useCallback(() => {
    setGalleryIndex(null)
  }, [])

  const scrollCarouselTo = useCallback((index: number) => {
    const root = carouselRef.current
    if (!root) return
    const slide = root.children[index] as HTMLElement | undefined
    if (!slide) return
    root.scrollTo({ left: slide.offsetLeft, behavior: "smooth" })
    setActiveIndex(index)
  }, [])

  const onCarouselScroll = useCallback(() => {
    const root = carouselRef.current
    if (!root || root.clientWidth === 0) return
    const next = Math.round(root.scrollLeft / root.clientWidth)
    setActiveIndex(Math.max(0, Math.min(videos.length - 1, next)))
  }, [videos.length])

  const onGalleryScroll = useCallback(() => {
    if (isProgrammaticScroll.current) return
    const root = galleryRef.current
    if (!root || root.clientHeight === 0) return
    const next = Math.round(root.scrollTop / root.clientHeight)
    setGalleryIndex(Math.max(0, Math.min(videos.length - 1, next)))
  }, [videos.length])

  const goToPrevVideo = useCallback(() => {
    setGalleryIndex((current) => {
      if (current === null || current <= 0) return current
      return current - 1
    })
  }, [])

  const goToNextVideo = useCallback(() => {
    setGalleryIndex((current) => {
      if (current === null || current >= videos.length - 1) return current
      return current + 1
    })
  }, [videos.length])

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

  useEffect(() => {
    if (!galleryOpen) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeGallery()
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault()
        goToNextVideo()
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault()
        goToPrevVideo()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [galleryOpen, closeGallery, goToNextVideo, goToPrevVideo])

  useEffect(() => {
    if (galleryIndex === null) return
    scrollGalleryTo(galleryIndex)
  }, [galleryIndex, scrollGalleryTo])

  const currentGalleryIndex = galleryIndex ?? 0
  const canGoPrev = currentGalleryIndex > 0
  const canGoNext = currentGalleryIndex < videos.length - 1

  const resolveShareUrl = useCallback(() => {
    if (typeof window === "undefined") return shareUrl?.trim() || ""
    if (shareUrl?.trim()) {
      try {
        return new URL(shareUrl, window.location.origin).toString()
      } catch {
        return shareUrl.trim()
      }
    }
    return window.location.href
  }, [shareUrl])

  const handleShare = useCallback(async () => {
    const url = resolveShareUrl()
    if (!url) {
      toast.error("Não foi possível partilhar esta publicação.")
      return
    }

    const title = shareTitle?.trim() || "Publicação SEKE"

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
  }, [resolveShareUrl, shareTitle, toast])

  const renderFullscreenGallery = () => (
    <div
      className="fixed inset-0 z-50 bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Galeria de vídeos"
    >
      <button
        type="button"
        onClick={closeGallery}
        className="absolute top-4 left-4 z-60 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Fechar"
      >
        <X className="size-5" />
      </button>

      <div className="relative flex h-full w-full items-center justify-center md:gap-[30px] md:px-4 md:pr-20">
        <div
          ref={galleryRef}
          className="h-full w-full overflow-y-auto overscroll-contain snap-y snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:h-[min(100dvh,920px)] md:w-[min(100%,calc(min(100dvh,920px)*9/16))] md:shrink-0 md:rounded-sm"
          onScroll={onGalleryScroll}
        >
          {videos.map((src, index) => (
            <GallerySlideVideo
              key={`gallery-${src}-${index}`}
              src={src}
              active={galleryIndex === index}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-60 bg-gradient-to-t from-black/55 via-black/20 to-transparent px-3 pb-8 pt-16 md:pointer-events-auto md:static md:inset-auto md:bottom-auto md:bg-none md:px-0 md:pb-0 md:pt-0">
          <div className="flex items-end justify-end gap-3 md:block">
            <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-5 md:gap-6">
              <button
                type="button"
                onClick={() => onLike?.()}
                disabled={liking || !onLike}
                className="flex flex-col items-center gap-1 disabled:opacity-50 md:gap-1.5"
                aria-label={liked ? "Retirar gosto" : "Gostar"}
              >
                {liking ? (
                  <Loader2 className="size-8 animate-spin text-white" />
                ) : (
                  <Heart
                    className={cn(
                      "size-8 drop-shadow-md",
                      liked ? "fill-[#FE2C55] text-[#FE2C55]" : "text-white"
                    )}
                    strokeWidth={liked ? 0 : 2}
                  />
                )}
                <span className="text-xs font-semibold tabular-nums text-white drop-shadow">
                  {formatActionCount(likesCount)}
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
            </div>
          </div>
        </div>
      </div>

      {hasMultiple ? (
        <div className="absolute top-1/2 right-2 z-60 flex -translate-y-1/2 flex-col items-center gap-2 md:right-5 md:gap-3">
          <button
            type="button"
            onClick={goToPrevVideo}
            disabled={!canGoPrev}
            className="inline-flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/55 disabled:opacity-30 md:size-11 md:bg-[#3a3b3c] md:hover:bg-[#4e4f50]"
            aria-label="Vídeo anterior"
          >
            <ChevronUp className="size-5 md:size-6" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={goToNextVideo}
            disabled={!canGoNext}
            className="inline-flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/55 disabled:opacity-30 md:size-11 md:bg-[#3a3b3c] md:hover:bg-[#4e4f50]"
            aria-label="Vídeo seguinte"
          >
            <ChevronDown className="size-5 md:size-6" strokeWidth={2.5} />
          </button>
        </div>
      ) : null}
    </div>
  )

  if (videos.length === 0) return null

  if (!hasMultiple) {
    return (
      <div className={cn("w-full overflow-hidden", className)}>
        <SingleInlineVideo
          src={videos[0]}
          posterUrl={posterUrl}
          onOpen={() => openGallery(0)}
        />
        {galleryOpen && !useGlobalFeed ? renderFullscreenGallery() : null}
      </div>
    )
  }

  return (
    <>
      <div className={cn("relative w-full overflow-hidden bg-black", className)}>
        <div
          ref={carouselRef}
          className="flex aspect-video max-h-[min(560px,80vh)] min-h-[220px] w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={onCarouselScroll}
        >
          {videos.map((src, index) => (
            <div key={`${src}-${index}`} className="h-full w-full shrink-0">
              <CarouselVideoSlide
                src={src}
                posterUrl={index === 0 ? posterUrl : null}
                active={activeIndex === index}
                onOpen={() => openGallery(index)}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollCarouselTo(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
          className="absolute left-2 top-1/2 z-10 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white disabled:opacity-30 hover:bg-black/60"
          aria-label="Vídeo anterior"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() =>
            scrollCarouselTo(Math.min(videos.length - 1, activeIndex + 1))
          }
          disabled={activeIndex >= videos.length - 1}
          className="absolute right-2 top-1/2 z-10 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white disabled:opacity-30 hover:bg-black/60"
          aria-label="Vídeo seguinte"
        >
          <ChevronRight className="size-5" />
        </button>

        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
          {videos.map((_, index) => (
            <span
              key={`dot-${index}`}
              className={cn(
                "size-1.5 rounded-full transition-colors",
                index === activeIndex ? "bg-white" : "bg-white/40"
              )}
            />
          ))}
        </div>
        <span className="absolute top-3 right-3 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white tabular-nums">
          {activeIndex + 1}/{videos.length}
        </span>
      </div>

      {galleryOpen && !useGlobalFeed ? renderFullscreenGallery() : null}
    </>
  )
}
