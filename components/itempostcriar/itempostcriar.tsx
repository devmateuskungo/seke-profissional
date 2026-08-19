"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ImagePlus, Loader2, Send, Video, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toaster"
import { useAuth } from "@/lib/use-auth"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { cn } from "@/lib/utils"
import { createPost, extractHashtagsFromContent } from "@/lib/posts-client"
import type { PostRecord } from "@/types/post"

/** Limites de ficheiro aceites antes do upload. */
const MAX_FILE_BYTES = 12 * 1024 * 1024
const MAX_VIDEO_BYTES = 80 * 1024 * 1024
const MAX_IMAGES = 10
const MAX_VIDEOS = 10

type MediaDraft = {
  id: string
  file: File
  previewUrl: string
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

export interface ItemPostCriarProps {
  /** Chamado após criar com sucesso (recebe o objeto `post` da API) */
  onSuccess?: (post: PostRecord) => void
  className?: string
}

export function ItemPostCriar({ onSuccess, className }: ItemPostCriarProps) {
  const toast = useToast()
  const { user, isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null)
  const [videoDrafts, setVideoDrafts] = useState<MediaDraft[]>([])
  const [imageDrafts, setImageDrafts] = useState<MediaDraft[]>([])
  const [isCompressingImage, setIsCompressingImage] = useState(false)
  const [isLoadingVideo, setIsLoadingVideo] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const imageDraftsRef = useRef(imageDrafts)
  const videoDraftsRef = useRef(videoDrafts)

  imageDraftsRef.current = imageDrafts
  videoDraftsRef.current = videoDrafts

  const clearMedia = useCallback(() => {
    setMediaType(null)
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

  const removeImage = useCallback((id: string) => {
    setImageDrafts((prev) => {
      const removed = prev.find((item) => item.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      const next = prev.filter((item) => item.id !== id)
      if (next.length === 0) setMediaType(null)
      return next
    })
  }, [])

  const removeVideo = useCallback((id: string) => {
    setVideoDrafts((prev) => {
      const removed = prev.find((item) => item.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      const next = prev.filter((item) => item.id !== id)
      if (next.length === 0) setMediaType(null)
      return next
    })
  }, [])

  const onVideoFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      e.target.value = ""
      if (files.length === 0) return

      const invalid = files.find((file) => !file.type.startsWith("video/"))
      if (invalid) {
        toast.error("Selecione apenas ficheiros de vídeo.")
        return
      }

      const tooLarge = files.find((file) => file.size > MAX_VIDEO_BYTES)
      if (tooLarge) {
        toast.error("Cada vídeo deve ter no máximo 80 MB.")
        return
      }

      setIsLoadingVideo(true)
      try {
        setImageDrafts((prev) => {
          revokeMediaDrafts(prev)
          return []
        })
        setMediaType("video")

        setVideoDrafts((prev) => {
          const remaining = MAX_VIDEOS - prev.length
          if (remaining <= 0) {
            toast.error(`Pode anexar no máximo ${MAX_VIDEOS} vídeos.`)
            return prev
          }

          const toAdd = files.slice(0, remaining).map(createMediaDraft)
          if (files.length > remaining) {
            toast.error(
              `Só foram adicionados ${remaining} vídeos (máximo ${MAX_VIDEOS}).`
            )
          }

          return [...prev, ...toAdd]
        })
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Não foi possível processar o vídeo."
        toast.error(msg)
      } finally {
        setIsLoadingVideo(false)
      }
    },
    [toast]
  )

  const onImageFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      e.target.value = ""
      if (files.length === 0) return

      const invalid = files.find((file) => !file.type.startsWith("image/"))
      if (invalid) {
        toast.error("Selecione apenas ficheiros de imagem.")
        return
      }

      const tooLarge = files.find((file) => file.size > MAX_FILE_BYTES)
      if (tooLarge) {
        toast.error("Cada imagem deve ter no máximo 12 MB.")
        return
      }

      setIsCompressingImage(true)
      try {
        setVideoDrafts((prev) => {
          revokeMediaDrafts(prev)
          return []
        })
        setMediaType("image")

        setImageDrafts((prev) => {
          const remaining = MAX_IMAGES - prev.length
          if (remaining <= 0) {
            toast.error(`Pode anexar no máximo ${MAX_IMAGES} imagens.`)
            return prev
          }

          const toAdd = files.slice(0, remaining).map(createMediaDraft)
          if (files.length > remaining) {
            toast.error(
              `Só foram adicionadas ${remaining} imagens (máximo ${MAX_IMAGES}).`
            )
          }

          return [...prev, ...toAdd]
        })
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Não foi possível processar a imagem."
        toast.error(msg)
      } finally {
        setIsCompressingImage(false)
      }
    },
    [toast]
  )

  const resetDraft = useCallback(() => {
    setContent("")
    clearMedia()
  }, [clearMedia])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      const fullContent = content
      const trimmed = fullContent.trim()
      if (!trimmed) {
        toast.error("Escreva algo sobre o seu trabalho.")
        return
      }

      const token =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("auth_token")
          : null

      if (!token) {
        toast.error("Inicie sessão para publicar.")
        return
      }

      setIsLoading(true)
      try {
        const mediaFiles: File[] =
          mediaType === "video"
            ? videoDrafts.map((draft) => draft.file)
            : mediaType === "image"
              ? imageDrafts.map((draft) => draft.file)
              : []

        const createPayload = {
          content: fullContent,
          visibility: "public" as const,
          hashtags: extractHashtagsFromContent(fullContent),
        }

        const result = await createPost(createPayload, token, mediaFiles)

        if (result.success) {
          toast.success("Publicação criada com sucesso.")
          resetDraft()
          setOpen(false)
          onSuccess?.(result.data.post)
          return
        }

        toast.error(result.error)
      } catch {
        toast.error("Erro de ligação. Tente novamente.")
      } finally {
        setIsLoading(false)
      }
    },
    [content, imageDrafts, mediaType, onSuccess, resetDraft, toast, videoDrafts]
  )

  if (!isAuthenticated) {
    return null
  }

  const avatarSrc = resolveUserAvatarUrl(user?.image)
  const hasVideo = mediaType === "video" && videoDrafts.length > 0
  const hasImages = mediaType === "image" && imageDrafts.length > 0
  const canAddMoreImages = !hasVideo && imageDrafts.length < MAX_IMAGES
  const canAddMoreVideos = !hasImages && videoDrafts.length < MAX_VIDEOS
  const mediaBusy = isLoading || isCompressingImage || isLoadingVideo

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground ",
        className
      )}
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/60 sm:size-11">
            <Image
              src={avatarSrc}
              alt=""
              width={44}
              height={44}
              className="size-full object-cover"
              unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
            />
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-10 w-full cursor-pointer rounded-full border border-border/70 bg-muted/30 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50 sm:h-11 sm:px-4"
          >
            Em que está a trabalhar?
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "fixed inset-0 top-0 left-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0",
            "sm:inset-auto sm:top-[50%] sm:left-[50%] sm:h-auto sm:max-h-[min(90dvh,720px)] sm:max-w-2xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border"
          )}
        >
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="flex shrink-0 flex-row items-start gap-3 border-b border-border/60 px-4 py-3 pr-12 text-left sm:pr-4">
              <div className="size-10 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/60 sm:size-11">
                <Image
                  src={avatarSrc}
                  alt=""
                  width={44}
                  height={44}
                  className="size-full object-cover"
                  unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <DialogTitle className="text-base sm:text-lg">
                  Criar publicação
                </DialogTitle>
                <DialogDescription className="text-xs leading-snug sm:text-sm">
                  Partilhe texto e anexe até {MAX_IMAGES} imagens ou {MAX_VIDEOS}{" "}
                  vídeos.
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <Textarea
                id="post-content-modal"
                placeholder="Escreva a sua publicação..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                disabled={mediaBusy}
                className="min-h-[120px] resize-none text-base sm:min-h-[140px] sm:text-sm"
              />

              {hasVideo ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {videoDrafts.length} / {MAX_VIDEOS} vídeos
                    </p>
                    {videoDrafts.length > 1 ? (
                      <button
                        type="button"
                        onClick={clearMedia}
                        disabled={mediaBusy}
                        className="text-xs font-medium text-destructive hover:underline disabled:opacity-60"
                      >
                        Remover todos
                      </button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {videoDrafts.map((draft) => (
                      <div
                        key={draft.id}
                        className="relative overflow-hidden rounded-xl bg-black ring-1 ring-border/50"
                      >
                        <div className="relative aspect-video max-h-52 w-full">
                          <video
                            src={draft.previewUrl}
                            controls
                            className="h-full w-full object-contain"
                            preload="metadata"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute right-1.5 top-1.5 size-7 cursor-pointer rounded-full bg-card/95 text-muted-foreground shadow-sm hover:bg-card hover:text-foreground"
                          onClick={() => removeVideo(draft.id)}
                          disabled={mediaBusy}
                          aria-label="Remover vídeo"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : hasImages ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {imageDrafts.length} / {MAX_IMAGES} imagens
                    </p>
                    {imageDrafts.length > 1 ? (
                      <button
                        type="button"
                        onClick={clearMedia}
                        disabled={mediaBusy}
                        className="text-xs font-medium text-destructive hover:underline disabled:opacity-60"
                      >
                        Remover todas
                      </button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {imageDrafts.map((draft) => (
                      <div
                        key={draft.id}
                        className="relative aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-border/50"
                      >
                        <Image
                          src={draft.previewUrl}
                          alt="Pré-visualização da publicação"
                          fill
                          className="object-cover object-center"
                          unoptimized
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute right-1.5 top-1.5 size-7 cursor-pointer rounded-full bg-card/95 text-muted-foreground shadow-sm hover:bg-card hover:text-foreground"
                          onClick={() => removeImage(draft.id)}
                          disabled={mediaBusy}
                          aria-label="Remover imagem"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-border/60 bg-muted/20 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                  <label
                    className={cn(
                      "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground sm:rounded-full sm:border-0 sm:bg-transparent sm:px-2 sm:py-1.5",
                      !canAddMoreImages && "pointer-events-none opacity-50"
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-primary shadow-sm ring-1 ring-border/60 sm:size-9">
                      {isCompressingImage ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <ImagePlus className="size-4" aria-hidden />
                      )}
                    </span>
                    <span className="text-xs sm:text-sm">
                      {hasImages ? "Adicionar" : "Imagens"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={onImageFileChange}
                      disabled={mediaBusy || !canAddMoreImages}
                    />
                  </label>

                  <label
                    className={cn(
                      "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground sm:rounded-full sm:border-0 sm:bg-transparent sm:px-2 sm:py-1.5",
                      !canAddMoreVideos && "pointer-events-none opacity-40"
                    )}
                    title={
                      hasImages
                        ? "Remova as imagens para anexar vídeos"
                        : "Anexar vídeos"
                    }
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-primary shadow-sm ring-1 ring-border/60 sm:size-9">
                      {isLoadingVideo ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Video className="size-4" aria-hidden />
                      )}
                    </span>
                    <span className="text-xs sm:text-sm">
                      {hasVideo ? "Adicionar" : "Vídeos"}
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      multiple
                      className="sr-only"
                      onChange={onVideoFileChange}
                      disabled={mediaBusy || !canAddMoreVideos}
                    />
                  </label>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={mediaBusy}
                  className="h-11 w-full cursor-pointer gap-2 rounded-full px-5 shadow-none sm:h-9 sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      A publicar...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Publicar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ItemPostCriar
