"use client"

import Image from "next/image"
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { dedupeMediaUrls } from "@/lib/posts-client"

/** Placeholder em `public/` quando a URL do storage falha (404 / NoSuchKey). */
export const POST_IMAGE_NOT_FOUND = "/seke_imagem_not_found.png"

/** Separador suave entre células (em vez de linha preta dura). */
const GRID_GAP =
  "gap-[2px] bg-neutral-200/80 dark:bg-neutral-700/60"

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

function FeedSafeImage({
  src,
  alt,
  className,
  sizes,
  priority,
  objectFit = "cover",
}: {
  src: string
  alt: string
  className?: string
  sizes?: string
  priority?: boolean
  objectFit?: "cover" | "contain"
}) {
  const [currentSrc, setCurrentSrc] = useState(src)

  useEffect(() => {
    setCurrentSrc(src)
  }, [src])

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn(
        objectFit === "contain"
          ? "object-contain object-center"
          : "object-cover object-center",
        className
      )}
      unoptimized={imageNeedsUnoptimized(currentSrc)}
      onError={() => {
        if (currentSrc !== POST_IMAGE_NOT_FOUND) {
          setCurrentSrc(POST_IMAGE_NOT_FOUND)
        }
      }}
    />
  )
}

/** Imagem única no feed — proporção natural, sem distorção. */
function FeedSingleImage({
  src,
  alt,
  onOpen,
}: {
  src: string
  alt: string
  onOpen: () => void
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const currentSrc = failed ? POST_IMAGE_NOT_FOUND : src

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex w-full min-h-[160px] items-center justify-center overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-neutral-900/40 sm:min-h-[200px]"
      aria-label={`Ver imagem: ${alt}`}
    >
      {!loaded ? (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      ) : null}
      <Image
        src={currentSrc}
        alt={alt}
        width={0}
        height={0}
        sizes="(max-width: 768px) 100vw, 680px"
        priority
        className={cn(
          "mx-auto block h-auto max-h-[min(560px,70vh)] w-auto max-w-full object-contain object-center transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0"
        )}
        style={{ width: "auto", height: "auto", maxWidth: "100%" }}
        unoptimized={imageNeedsUnoptimized(currentSrc)}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!failed) setFailed(true)
        }}
      />
    </button>
  )
}

/** Alturas responsivas das grelhas multi-imagem. */
const GRID_HEIGHT_TWO =
  "h-[min(260px,42vh)] min-h-[160px] sm:h-[min(420px,55vh)] sm:min-h-[200px]"
const GRID_HEIGHT_THREE =
  "h-[min(280px,45vh)] min-h-[180px] sm:h-[min(420px,55vh)] sm:min-h-[220px]"
const GRID_HEIGHT_FOUR =
  "h-[min(300px,48vh)] min-h-[200px] sm:h-[min(460px,60vh)] sm:min-h-[240px]"

export interface PostMediaGalleryProps {
  urls: string[]
  alt?: string
  className?: string
}

/**
 * Grelha de imagens estilo Facebook:
 * 1 → full; 2 → lado a lado; 3 → 1 grande + 2 empilhadas;
 * 4 → 2×2; 5+ → 2×2 com "+N" na última.
 */
export function PostMediaGallery({
  urls,
  alt = "Imagem da publicação",
  className,
}: PostMediaGalleryProps) {
  const images = dedupeMediaUrls(
    urls
      .map(normalizeMediaSrc)
      .filter((u): u is string => Boolean(u))
  )

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  const goPrev = useCallback(() => {
    setLightboxIndex((i) =>
      i === null || images.length < 2
        ? i
        : (i - 1 + images.length) % images.length
    )
  }, [images.length])

  const goNext = useCallback(() => {
    setLightboxIndex((i) =>
      i === null || images.length < 2 ? i : (i + 1) % images.length
    )
  }, [images.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "ArrowLeft") goPrev()
    }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [lightboxIndex, closeLightbox, goNext, goPrev])

  if (images.length === 0) return null

  const count = images.length
  const visibleCount = count > 4 ? 4 : count
  const overflow = count > 4 ? count - 4 : 0
  const hasMultiple = images.length > 1

  const openAt = (index: number) => setLightboxIndex(index)

  const cell = (
    src: string,
    index: number,
    cellClass: string,
    showOverflow = false
  ) => (
    <button
      key={`${src}-${index}`}
      type="button"
      onClick={() => openAt(index)}
      className={cn(
        "relative overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0",
        cellClass
      )}
      aria-label={
        showOverflow && overflow > 0
          ? `Ver mais ${overflow} imagens`
          : `Ver imagem ${index + 1}`
      }
    >
      <FeedSafeImage
        src={src}
        alt={alt}
        sizes="(max-width: 768px) 100vw, 680px"
      />
      {showOverflow && overflow > 0 ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white text-3xl font-semibold tabular-nums">
          +{overflow}
        </span>
      ) : null}
    </button>
  )

  let grid: ReactNode

  if (count === 1) {
    grid = (
      <FeedSingleImage
        src={images[0]}
        alt={alt}
        onOpen={() => openAt(0)}
      />
    )
  } else if (count === 2) {
    grid = (
      <div className={cn("grid grid-cols-2", GRID_HEIGHT_TWO, GRID_GAP)}>
        {cell(images[0], 0, "h-full w-full")}
        {cell(images[1], 1, "h-full w-full")}
      </div>
    )
  } else if (count === 3) {
    grid = (
      <div className={cn("grid grid-cols-2", GRID_HEIGHT_THREE, GRID_GAP)}>
        {cell(images[0], 0, "row-span-2 h-full w-full")}
        <div className={cn("grid grid-rows-2 h-full min-h-0", GRID_GAP)}>
          {cell(images[1], 1, "h-full w-full min-h-0")}
          {cell(images[2], 2, "h-full w-full min-h-0")}
        </div>
      </div>
    )
  } else {
    grid = (
      <div
        className={cn(
          "grid grid-cols-2 grid-rows-2",
          GRID_HEIGHT_FOUR,
          GRID_GAP
        )}
      >
        {Array.from({ length: visibleCount }, (_, i) =>
          cell(images[i], i, "h-full w-full", i === 3 && overflow > 0)
        )}
      </div>
    )
  }

  return (
    <>
      <div className={cn("w-full overflow-hidden", className)}>{grid}</div>

      {lightboxIndex !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Galeria de imagens"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-20 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>

          {hasMultiple ? (
            <span className="absolute top-5 left-1/2 z-20 -translate-x-1/2 text-sm text-white/80 tabular-nums">
              {lightboxIndex + 1} / {images.length}
            </span>
          ) : null}

          {hasMultiple ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goPrev()
              }}
              className="absolute left-2 sm:left-4 z-20 inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-white/25"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="size-6" />
            </button>
          ) : null}

          {hasMultiple ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goNext()
              }}
              className="absolute right-2 sm:right-4 z-20 inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-white/25"
              aria-label="Imagem seguinte"
            >
              <ChevronRight className="size-6" />
            </button>
          ) : null}

          <div
            className="relative h-[min(85vh,900px)] w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <FeedSafeImage
              src={images[lightboxIndex]}
              alt={alt}
              sizes="100vw"
              objectFit="contain"
              priority
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
