"use client"

import { useCallback, useState } from "react"
import Image from "next/image"
import { ImagePlus, Loader2, Send, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toaster"
import { compressImageToJpegDataUrl } from "@/lib/compress-image-client"
import { useAuth } from "@/lib/use-auth"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { cn } from "@/lib/utils"
import { createPost } from "@/lib/posts-client"
import type { PostRecord } from "@/types/post"

/** Ficheiro original até 12 MB; o envio usa JPEG comprimido (muito menor que PNG em base64). */
const MAX_FILE_BYTES = 12 * 1024 * 1024

export interface ItemPostCriarProps {
  /** Chamado após criar com sucesso (recebe o objeto `post` da API) */
  onSuccess?: (post: PostRecord) => void
  className?: string
}

export function ItemPostCriar({ onSuccess, className }: ItemPostCriarProps) {
  const toast = useToast()
  const { user, isAuthenticated } = useAuth()
  const [content, setContent] = useState("")
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [isCompressingImage, setIsCompressingImage] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const clearImage = useCallback(() => {
    setImageDataUrl(null)
  }, [])

  const onFileChange = useCallback(
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
        const dataUrl = await compressImageToJpegDataUrl(file)
        setImageDataUrl(dataUrl)
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

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      const trimmed = content.trim()
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
        const result = await createPost(
          {
            content: trimmed,
            ...(imageDataUrl ? { image: imageDataUrl } : {}),
          },
          token
        )

        if (result.success) {
          toast.success("Publicação criada.")
          setContent("")
          setImageDataUrl(null)
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
    [content, imageDataUrl, onSuccess, toast]
  )

  if (!isAuthenticated) {
    return null
  }

  const displayName = user?.name?.trim() || "Utilizador"
  const avatarSrc = resolveUserAvatarUrl(user?.image)

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground ",
        className
      )}
    >
      <form onSubmit={handleSubmit}>
        <div className="p-4 pb-3">
          <div className="flex gap-3">
            <div className="size-11 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/60">
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
              <p className="truncate text-sm font-semibold leading-none text-foreground">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground">
                Visível no seu feed e no perfil
              </p>
              <Textarea
                id="post-content"
                placeholder="Em que está a trabalhar? Partilhe o projeto, dica ou atualização…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                disabled={isLoading || isCompressingImage}
                className="mt-2 min-h-[100px] resize-none border-0 bg-muted/40 p-3 text-[15px] leading-relaxed shadow-none transition-colors placeholder:text-muted-foreground/80 focus-visible:bg-muted/60 focus-visible:ring-0 md:min-h-[88px]"
              />
            </div>
          </div>

          {imageDataUrl ? (
            <div className="relative mt-4 overflow-hidden rounded-xl bg-muted ring-1 ring-border/50">
              <div className="relative aspect-16/10 max-h-72 w-full">
                <Image
                  src={imageDataUrl}
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
                className="absolute right-2 top-2 size-9 rounded-full shadow-md"
                onClick={clearImage}
                disabled={isLoading || isCompressingImage}
                aria-label="Remover imagem"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-3 py-2.5 sm:px-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground">
            <span className="flex size-9 items-center justify-center rounded-full bg-background text-primary shadow-sm ring-1 ring-border/60">
              {isCompressingImage ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="size-4" aria-hidden />
              )}
            </span>
            <span className="hidden sm:inline">
              {isCompressingImage ? "A processar…" : "Foto"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onFileChange}
              disabled={isLoading || isCompressingImage}
            />
          </label>

          <Button
            type="submit"
            size="sm"
            disabled={isLoading || isCompressingImage}
            className="gap-2 rounded-full px-5 shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                A publicar…
              </>
            ) : (
              <>
                <Send className="size-4" />
                Publicar
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ItemPostCriar
