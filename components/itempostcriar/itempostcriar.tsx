"use client"

import { useCallback, useEffect, useState } from "react"
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
import { createPost, publishPost, uploadMediaToCloudinary } from "@/lib/posts-client"
import type { PostRecord } from "@/types/post"

/** Limites de ficheiro aceites antes do upload para Cloudinary. */
const MAX_FILE_BYTES = 12 * 1024 * 1024
const MAX_VIDEO_BYTES = 80 * 1024 * 1024

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
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [isCompressingImage, setIsCompressingImage] = useState(false)
  const [isLoadingVideo, setIsLoadingVideo] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const clearMedia = useCallback(() => {
    setMediaType(null)
    setImageFile(null)
    setVideoFile(null)
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }
    setImagePreviewUrl(null)
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
    }
    setVideoPreviewUrl(null)
  }, [imagePreviewUrl, videoPreviewUrl])

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }
    }
  }, [imagePreviewUrl, videoPreviewUrl])

  const onVideoFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return

      if (!file.type.startsWith("video/")) {
        toast.error("Selecione um ficheiro de vídeo.")
        return
      }
      if (file.size > MAX_VIDEO_BYTES) {
        toast.error("O vídeo deve ter no máximo 80 MB.")
        return
      }

      setIsLoadingVideo(true)
      try {
        if (videoPreviewUrl) {
          URL.revokeObjectURL(videoPreviewUrl)
        }
        if (imagePreviewUrl) {
          URL.revokeObjectURL(imagePreviewUrl)
        }
        setMediaType("video")
        setImageFile(null)
        setImagePreviewUrl(null)
        setVideoFile(file)
        setVideoPreviewUrl(URL.createObjectURL(file))
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Não foi possível processar o vídeo."
        toast.error(msg)
      } finally {
        setIsLoadingVideo(false)
      }
    },
    [imagePreviewUrl, toast, videoPreviewUrl]
  )

  const onImageFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return

      if (!file.type.startsWith("image/")) {
        toast.error("Selecione um ficheiro de imagem.")
        return
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error("A imagem deve ter no máximo 12 MB.")
        return
      }

      setIsCompressingImage(true)
      try {
        if (videoPreviewUrl) {
          URL.revokeObjectURL(videoPreviewUrl)
        }
        if (imagePreviewUrl) {
          URL.revokeObjectURL(imagePreviewUrl)
        }
        setMediaType("image")
        setVideoFile(null)
        setVideoPreviewUrl(null)
        setImageFile(file)
        setImagePreviewUrl(URL.createObjectURL(file))
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Não foi possível processar a imagem."
        toast.error(msg)
      } finally {
        setIsCompressingImage(false)
      }
    },
    [imagePreviewUrl, toast, videoPreviewUrl]
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
      const firstLine = fullContent.split(/\r?\n/, 1)[0] ?? ""
      const title = firstLine.trim()

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
        let midia: string[] = []
        let image: string | undefined
        const selectedMedia = mediaType === "video" ? videoFile : imageFile

        if (mediaType && selectedMedia) {
          const upload = await uploadMediaToCloudinary(selectedMedia, token)
          if (!upload.success) {
            toast.error(upload.error)
            return
          }
          midia = [mediaType, upload.data.url]
          if (mediaType === "image") {
            image = upload.data.url
          }
        }

        const createPayload = {
          title,
          content: fullContent,
          ...(midia.length > 0 ? { midia } : {}),
          ...(image ? { image } : {}),
        }

        const result = await createPost(createPayload, token)

        if (result.success) {
          const createdPostId =
            typeof result.data.post.id === "string" || typeof result.data.post.id === "number"
              ? String(result.data.post.id)
              : null

          if (createdPostId) {
            const publish = await publishPost(createdPostId, createPayload, token)
            if (!publish.success) {
              toast.error("Publicação criada como rascunho. Publique para ficar visível.")
            } else {
              toast.success("Publicação criada e publicada.")
            }
          } else {
            toast.success("Publicação criada.")
          }

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
    [content, imageFile, mediaType, onSuccess, resetDraft, toast, videoFile]
  )

  if (!isAuthenticated) {
    return null
  }

  const avatarSrc = resolveUserAvatarUrl(user?.image)

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
                  Partilhe texto e anexe imagem ou vídeo do seu computador.
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
                disabled={isLoading || isCompressingImage || isLoadingVideo}
                className="min-h-[120px] resize-none text-base sm:min-h-[140px] sm:text-sm"
              />

              {mediaType === "video" && videoPreviewUrl ? (
                <div className="relative overflow-hidden rounded-xl bg-black ring-1 ring-border/50">
                  <div className="relative aspect-video max-h-52 w-full sm:max-h-80">
                    <video
                      src={videoPreviewUrl}
                      controls
                      className="h-full w-full object-contain"
                      preload="metadata"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-2 size-8 cursor-pointer rounded-full bg-white text-gray-500 shadow-md hover:bg-white/90 hover:text-gray-600 sm:size-9"
                    onClick={clearMedia}
                    disabled={isLoading || isCompressingImage || isLoadingVideo}
                    aria-label="Remover vídeo"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : mediaType === "image" && imagePreviewUrl ? (
                <div className="relative overflow-hidden rounded-xl bg-muted ring-1 ring-border/50">
                  <div className="relative aspect-video max-h-52 w-full sm:max-h-80">
                    <Image
                      src={imagePreviewUrl}
                      alt="Pré-visualização da publicação"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-2 size-8 cursor-pointer rounded-full bg-white text-gray-500 shadow-md hover:bg-white/90 hover:text-gray-600 sm:size-9"
                    onClick={clearMedia}
                    disabled={isLoading || isCompressingImage || isLoadingVideo}
                    aria-label="Remover imagem"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-border/60 bg-muted/20 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground sm:rounded-full sm:border-0 sm:bg-transparent sm:px-2 sm:py-1.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-primary shadow-sm ring-1 ring-border/60 sm:size-9">
                      {isCompressingImage ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <ImagePlus className="size-4" aria-hidden />
                      )}
                    </span>
                    <span className="text-xs sm:text-sm">Imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={onImageFileChange}
                      disabled={isLoading || isCompressingImage || isLoadingVideo}
                    />
                  </label>

                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground sm:rounded-full sm:border-0 sm:bg-transparent sm:px-2 sm:py-1.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-primary shadow-sm ring-1 ring-border/60 sm:size-9">
                      {isLoadingVideo ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Video className="size-4" aria-hidden />
                      )}
                    </span>
                    <span className="text-xs sm:text-sm">Vídeo</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="sr-only"
                      onChange={onVideoFileChange}
                      disabled={isLoading || isCompressingImage || isLoadingVideo}
                    />
                  </label>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading || isCompressingImage || isLoadingVideo}
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
