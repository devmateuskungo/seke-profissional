"use client"

import Image from "next/image"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { ImagePlus, Loader2, Video, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  collectPostImageUrls,
  dedupeMediaUrls,
  extractHashtagsFromContent,
  fetchPostById,
  updatePost,
} from "@/lib/posts-client"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { cn } from "@/lib/utils"
import { getStoredUserProfile } from "@/lib/viewer-user-id"
import type { PostDetail } from "@/types/post"

const MAX_FILE_BYTES = 12 * 1024 * 1024
const MAX_VIDEO_BYTES = 80 * 1024 * 1024
const MAX_IMAGES = 10
const MAX_VIDEOS = 10

type MediaDraft = {
  id: string
  file: File
  previewUrl: string
}

type ExistingMedia = {
  id: string
  url: string
}

function createMediaDraft(file: File): MediaDraft {
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }
}

function revokeMediaDrafts(drafts: MediaDraft[]) {
  for (const draft of drafts) {
    URL.revokeObjectURL(draft.previewUrl)
  }
}

function imageNeedsUnoptimized(src: string): boolean {
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
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

function collectEditMedia(detail: PostDetail): {
  mediaType: "image" | "video" | null
  urls: string[]
} {
  if (detail.media_type === "video") {
    const urls = dedupeMediaUrls(
      [...(detail.media_urls ?? []), detail.media_url]
        .map((u) => normalizeMediaSrc(u))
        .filter((u): u is string => Boolean(u))
    )
    return { mediaType: urls.length > 0 ? "video" : null, urls }
  }

  const urls = dedupeMediaUrls(
    collectPostImageUrls({
      media_urls: detail.media_urls,
      media_url: detail.media_url,
      image: detail.image,
      media_type: detail.media_type,
    })
      .map((u) => normalizeMediaSrc(u))
      .filter((u): u is string => Boolean(u))
  )

  return {
    mediaType: urls.length > 0 ? "image" : null,
    urls,
  }
}

function toExistingMedia(urls: string[]): ExistingMedia[] {
  return urls.map((url, index) => ({
    id: `existing-${index}-${url.slice(-24)}`,
    url,
  }))
}

export interface PostEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  token: string
  initialContent?: string
  initialImageUrl?: string | null
  onSaved: (detail: PostDetail) => void
  onError?: (message: string) => void
}

export function PostEditModal({
  open,
  onOpenChange,
  postId,
  token,
  initialContent = "",
  initialImageUrl,
  onSaved,
  onError,
}: PostEditModalProps) {
  const formId = useId()
  const [content, setContent] = useState("")
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null)
  const [existingImages, setExistingImages] = useState<ExistingMedia[]>([])
  const [existingVideos, setExistingVideos] = useState<ExistingMedia[]>([])
  const [imageDrafts, setImageDrafts] = useState<MediaDraft[]>([])
  const [videoDrafts, setVideoDrafts] = useState<MediaDraft[]>([])
  const [mediaTouched, setMediaTouched] = useState(false)
  const [loadingPost, setLoadingPost] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [loadingVideo, setLoadingVideo] = useState(false)
  const [saving, setSaving] = useState(false)

  const imageDraftsRef = useRef(imageDrafts)
  const videoDraftsRef = useRef(videoDrafts)
  imageDraftsRef.current = imageDrafts
  videoDraftsRef.current = videoDrafts

  const clearNewDrafts = useCallback(() => {
    setImageDrafts((prev) => {
      revokeMediaDrafts(prev)
      return []
    })
    setVideoDrafts((prev) => {
      revokeMediaDrafts(prev)
      return []
    })
  }, [])

  useEffect(() => {
    return () => {
      revokeMediaDrafts(imageDraftsRef.current)
      revokeMediaDrafts(videoDraftsRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    let cancelled = false

    setContent(initialContent)
    const fallbackUrl = normalizeMediaSrc(initialImageUrl)
    setMediaType(fallbackUrl ? "image" : null)
    setExistingImages(fallbackUrl ? toExistingMedia([fallbackUrl]) : [])
    setExistingVideos([])
    clearNewDrafts()
    setMediaTouched(false)
    setLoadingPost(true)

    void (async () => {
      const result = await fetchPostById(postId, token)
      if (cancelled) return

      if (result.success) {
        const { mediaType: type, urls } = collectEditMedia(result.data)
        setContent(result.data.content)
        setMediaType(type)
        if (type === "video") {
          setExistingVideos(toExistingMedia(urls))
          setExistingImages([])
        } else if (type === "image") {
          setExistingImages(toExistingMedia(urls))
          setExistingVideos([])
        } else {
          setExistingImages([])
          setExistingVideos([])
        }
      } else {
        onError?.(result.error)
      }
      setLoadingPost(false)
    })()

    return () => {
      cancelled = true
    }
  }, [
    open,
    postId,
    token,
    initialContent,
    initialImageUrl,
    onError,
    clearNewDrafts,
  ])

  const removeExistingImage = useCallback((id: string) => {
    setMediaTouched(true)
    setExistingImages((prev) => {
      const next = prev.filter((item) => item.id !== id)
      if (next.length === 0 && imageDraftsRef.current.length === 0) {
        setMediaType(null)
      }
      return next
    })
  }, [])

  const removeExistingVideo = useCallback((id: string) => {
    setMediaTouched(true)
    setExistingVideos((prev) => {
      const next = prev.filter((item) => item.id !== id)
      if (next.length === 0 && videoDraftsRef.current.length === 0) {
        setMediaType(null)
      }
      return next
    })
  }, [])

  const removeImageDraft = useCallback((id: string) => {
    setMediaTouched(true)
    setImageDrafts((prev) => {
      const removed = prev.find((item) => item.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      const next = prev.filter((item) => item.id !== id)
      if (next.length === 0 && existingImages.length === 0) {
        setMediaType(null)
      }
      return next
    })
  }, [existingImages.length])

  const removeVideoDraft = useCallback((id: string) => {
    setMediaTouched(true)
    setVideoDrafts((prev) => {
      const removed = prev.find((item) => item.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      const next = prev.filter((item) => item.id !== id)
      if (next.length === 0 && existingVideos.length === 0) {
        setMediaType(null)
      }
      return next
    })
  }, [existingVideos.length])

  const clearAllMedia = useCallback(() => {
    setMediaTouched(true)
    setMediaType(null)
    setExistingImages([])
    setExistingVideos([])
    clearNewDrafts()
  }, [clearNewDrafts])

  const handleImageFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      e.target.value = ""
      if (files.length === 0) return

      if (mediaType === "video" || existingVideos.length > 0 || videoDrafts.length > 0) {
        onError?.("Não pode misturar imagens e vídeos na mesma publicação.")
        return
      }

      const invalid = files.find((f) => !f.type.startsWith("image/"))
      if (invalid) {
        onError?.("Selecione apenas ficheiros de imagem.")
        return
      }

      const tooLarge = files.find((f) => f.size > MAX_FILE_BYTES)
      if (tooLarge) {
        onError?.("Cada imagem deve ter no máximo 12 MB.")
        return
      }

      setCompressing(true)
      try {
        setMediaTouched(true)
        setMediaType("image")
        setExistingVideos([])
        setVideoDrafts((prev) => {
          revokeMediaDrafts(prev)
          return []
        })

        setImageDrafts((prev) => {
          const currentTotal = existingImages.length + prev.length
          const remaining = MAX_IMAGES - currentTotal
          if (remaining <= 0) {
            onError?.(`Pode anexar no máximo ${MAX_IMAGES} imagens.`)
            return prev
          }
          const accepted = files.slice(0, remaining).map(createMediaDraft)
          if (files.length > remaining) {
            onError?.(
              `Só foram adicionadas ${remaining} imagens (máximo ${MAX_IMAGES}).`
            )
          }
          return [...prev, ...accepted]
        })
      } finally {
        setCompressing(false)
      }
    },
    [
      existingImages.length,
      existingVideos.length,
      mediaType,
      onError,
      videoDrafts.length,
    ]
  )

  const handleVideoFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      e.target.value = ""
      if (files.length === 0) return

      if (mediaType === "image" || existingImages.length > 0 || imageDrafts.length > 0) {
        onError?.("Não pode misturar imagens e vídeos na mesma publicação.")
        return
      }

      const invalid = files.find((f) => !f.type.startsWith("video/"))
      if (invalid) {
        onError?.("Selecione apenas ficheiros de vídeo.")
        return
      }

      const tooLarge = files.find((f) => f.size > MAX_VIDEO_BYTES)
      if (tooLarge) {
        onError?.("Cada vídeo deve ter no máximo 80 MB.")
        return
      }

      setLoadingVideo(true)
      try {
        setMediaTouched(true)
        setMediaType("video")
        setExistingImages([])
        setImageDrafts((prev) => {
          revokeMediaDrafts(prev)
          return []
        })

        setVideoDrafts((prev) => {
          const currentTotal = existingVideos.length + prev.length
          const remaining = MAX_VIDEOS - currentTotal
          if (remaining <= 0) {
            onError?.(`Pode anexar no máximo ${MAX_VIDEOS} vídeos.`)
            return prev
          }
          const accepted = files.slice(0, remaining).map(createMediaDraft)
          if (files.length > remaining) {
            onError?.(
              `Só foram adicionados ${remaining} vídeos (máximo ${MAX_VIDEOS}).`
            )
          }
          return [...prev, ...accepted]
        })
      } finally {
        setLoadingVideo(false)
      }
    },
    [
      existingImages.length,
      existingVideos.length,
      imageDrafts.length,
      mediaType,
      onError,
    ]
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = content.trim()
      if (!trimmed) {
        onError?.("Escreva o texto da publicação.")
        return
      }

      setSaving(true)
      try {
        const keepMediaUrls =
          mediaType === "video"
            ? existingVideos.map((item) => item.url)
            : mediaType === "image"
              ? existingImages.map((item) => item.url)
              : []

        const mediaFiles =
          mediaType === "video"
            ? videoDrafts.map((d) => d.file)
            : mediaType === "image"
              ? imageDrafts.map((d) => d.file)
              : []

        const removeMedia =
          mediaTouched && keepMediaUrls.length === 0 && mediaFiles.length === 0

        const result = await updatePost(
          postId,
          {
            content: trimmed,
            visibility: "public",
            hashtags: extractHashtagsFromContent(trimmed),
            ...(mediaTouched
              ? {
                  keepMediaUrls,
                  removeMedia,
                }
              : {}),
          },
          token,
          mediaTouched ? mediaFiles : []
        )

        if (result.success) {
          onSaved(result.data)
          onOpenChange(false)
        } else {
          onError?.(result.error)
        }
      } finally {
        setSaving(false)
      }
    },
    [
      content,
      existingImages,
      existingVideos,
      imageDrafts,
      mediaTouched,
      mediaType,
      onError,
      onOpenChange,
      onSaved,
      postId,
      token,
      videoDrafts,
    ]
  )

  const sessionProfile = open ? getStoredUserProfile() : null
  const displayName = sessionProfile?.name ?? "Utilizador"
  const avatarSrc = resolveUserAvatarUrl(sessionProfile?.avatar)

  const totalImages = existingImages.length + imageDrafts.length
  const totalVideos = existingVideos.length + videoDrafts.length
  const hasImages = totalImages > 0
  const hasVideos = totalVideos > 0
  const canAddMoreImages = !hasVideos && totalImages < MAX_IMAGES
  const canAddMoreVideos = !hasImages && totalVideos < MAX_VIDEOS
  const mediaBusy = saving || loadingPost || compressing || loadingVideo

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl gap-0 p-0 overflow-hidden max-h-[min(92dvh,820px)] flex flex-col">
        <div className="p-6 pb-0 shrink-0">
          <DialogHeader className="flex flex-row gap-4 items-start text-left space-y-0">
            <div className="size-14 shrink-0 rounded-full overflow-hidden bg-muted ring-2 ring-border/80">
              <Image
                src={avatarSrc}
                alt={displayName}
                width={56}
                height={56}
                className="object-cover w-full h-full"
                unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <DialogTitle className="text-left">Editar publicação</DialogTitle>
              <p className="text-sm font-medium text-foreground pt-0.5">
                {displayName}
              </p>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 pt-4 min-h-0 flex-1 overflow-y-auto">
          {loadingPost ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              A carregar publicação…
            </div>
          ) : (
            <form
              id={formId}
              onSubmit={(ev) => void handleSubmit(ev)}
              className="space-y-4 min-w-0"
            >
              <div className="space-y-2">
                <Label htmlFor={`${formId}-content`}>
                  Texto da publicação
                </Label>
                <Textarea
                  id={`${formId}-content`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[120px] text-sm"
                  disabled={saving}
                  placeholder="Conteúdo da publicação…"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>
                    {hasVideos
                      ? `Vídeos (${totalVideos}/${MAX_VIDEOS})`
                      : hasImages
                        ? `Imagens (${totalImages}/${MAX_IMAGES})`
                        : "Média da publicação"}
                  </Label>
                  {hasImages || hasVideos ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={mediaBusy}
                      onClick={clearAllMedia}
                    >
                      Remover tudo
                    </Button>
                  ) : null}
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                  {hasVideos ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {existingVideos.map((item, index) => (
                        <div
                          key={item.id}
                          className="relative aspect-video overflow-hidden rounded-md bg-black"
                        >
                          <video
                            src={item.url}
                            className="h-full w-full object-contain"
                            controls
                            playsInline
                            preload="metadata"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingVideo(item.id)}
                            disabled={mediaBusy}
                            className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black/80"
                            aria-label={`Remover vídeo ${index + 1}`}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                      {videoDrafts.map((draft, index) => (
                        <div
                          key={draft.id}
                          className="relative aspect-video overflow-hidden rounded-md bg-black"
                        >
                          <video
                            src={draft.previewUrl}
                            className="h-full w-full object-contain"
                            controls
                            playsInline
                            preload="metadata"
                          />
                          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-medium text-white">
                            Novo
                          </span>
                          <button
                            type="button"
                            onClick={() => removeVideoDraft(draft.id)}
                            disabled={mediaBusy}
                            className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black/80"
                            aria-label={`Remover vídeo novo ${index + 1}`}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : hasImages ? (
                    <div
                      className={cn(
                        totalImages === 1
                          ? "relative aspect-video max-h-56 w-full overflow-hidden rounded-md bg-muted"
                          : "grid grid-cols-2 gap-2"
                      )}
                    >
                      {existingImages.map((item, index) => (
                        <div
                          key={item.id}
                          className={cn(
                            "relative overflow-hidden rounded-md bg-muted",
                            totalImages === 1
                              ? "absolute inset-0"
                              : "aspect-square"
                          )}
                        >
                          <Image
                            src={item.url}
                            alt={`Imagem ${index + 1}`}
                            fill
                            className="object-cover"
                            unoptimized={imageNeedsUnoptimized(item.url)}
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(item.id)}
                            disabled={mediaBusy}
                            className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black/80"
                            aria-label={`Remover imagem ${index + 1}`}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                      {imageDrafts.map((draft, index) => (
                        <div
                          key={draft.id}
                          className={cn(
                            "relative overflow-hidden rounded-md bg-muted",
                            totalImages === 1
                              ? "absolute inset-0"
                              : "aspect-square"
                          )}
                        >
                          <Image
                            src={draft.previewUrl}
                            alt={`Nova imagem ${index + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-medium text-white">
                            Nova
                          </span>
                          <button
                            type="button"
                            onClick={() => removeImageDraft(draft.id)}
                            disabled={mediaBusy}
                            className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black/80"
                            aria-label={`Remover imagem nova ${index + 1}`}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Sem média. Adicione imagens ou vídeos.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={mediaBusy || !canAddMoreImages}
                      onClick={() =>
                        document.getElementById(`${formId}-images`)?.click()
                      }
                    >
                      {compressing ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <ImagePlus className="size-4" aria-hidden />
                      )}
                      {hasImages ? "Adicionar imagens" : "Imagens"}
                    </Button>
                    <input
                      id={`${formId}-images`}
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(ev) => void handleImageFiles(ev)}
                      disabled={mediaBusy || !canAddMoreImages}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={mediaBusy || !canAddMoreVideos}
                      onClick={() =>
                        document.getElementById(`${formId}-videos`)?.click()
                      }
                    >
                      {loadingVideo ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Video className="size-4" aria-hidden />
                      )}
                      {hasVideos ? "Adicionar vídeos" : "Vídeos"}
                    </Button>
                    <input
                      id={`${formId}-videos`}
                      type="file"
                      accept="video/*"
                      multiple
                      className="sr-only"
                      onChange={handleVideoFiles}
                      disabled={mediaBusy || !canAddMoreVideos}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Até {MAX_IMAGES} imagens ou {MAX_VIDEOS} vídeos (não misturar).
                    Ao guardar, as alterações de média são enviadas por PUT como
                    no criar publicação.
                  </p>
                </div>
              </div>
            </form>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 border-t border-border/60 bg-muted/20 sm:justify-end shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={mediaBusy || !content.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
                A guardar…
              </>
              ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
