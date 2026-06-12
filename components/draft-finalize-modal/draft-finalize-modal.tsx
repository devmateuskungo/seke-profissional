"use client"

import Image from "next/image"
import { useCallback, useEffect, useId, useState } from "react"
import { ImagePlus, Loader2, Video, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  publishPost,
  updatePost,
  uploadMediaToCloudinary,
} from "@/lib/posts-client"
import type { MyPostSummary } from "@/types/post"

const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_VIDEO_BYTES = 80 * 1024 * 1024

type MediaKind = "image" | "video"

function imageNeedsUnoptimized(src: string): boolean {
  return (
    /^https?:\/\//i.test(src) ||
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    src.startsWith("//")
  )
}

function parseInitialMedia(post: MyPostSummary | null): {
  kind: MediaKind | null
  url: string | null
} {
  if (!post?.midia || post.midia.length < 2)
    return { kind: null, url: null }
  const kind = post.midia[0]?.toLowerCase()
  const url = typeof post.midia[1] === "string" ? post.midia[1] : ""
  if (
    (kind === "image" || kind === "video") &&
    /^https?:\/\//i.test(url)
  ) {
    return { kind: kind as MediaKind, url }
  }
  return { kind: null, url: null }
}

export interface DraftFinalizeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: MyPostSummary | null
  token: string | null
  onRefreshPosts: () => Promise<void>
  onSuccessMessage: (message: string) => void
  onErrorMessage: (message: string) => void
}

export function DraftFinalizeModal({
  open,
  onOpenChange,
  post,
  token,
  onRefreshPosts,
  onSuccessMessage,
  onErrorMessage,
}: DraftFinalizeModalProps) {
  const formId = useId()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  /** Estado original do rascunho (vindo da API) */
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [originalKind, setOriginalKind] = useState<MediaKind | null>(null)

  /** Pré-visualização efetiva (url remota | blob:) e tipo atual selecionado */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mediaKind, setMediaKind] = useState<MediaKind | null>(null)
  const [newFile, setNewFile] = useState<File | null>(null)
  const [mediaTouched, setMediaTouched] = useState(false)

  const [savingDraft, setSavingDraft] = useState(false)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (!open || !post) return
    setTitle((post.title ?? "").trim())
    setContent(post.content ?? "")
    const init = parseInitialMedia(post)
    setOriginalUrl(init.url)
    setOriginalKind(init.kind)
    setPreviewUrl(init.url)
    setMediaKind(init.kind)
    setNewFile(null)
    setMediaTouched(false)
  }, [open, post])

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const onImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return
      if (!file.type.startsWith("image/")) {
        onErrorMessage("Selecione um ficheiro de imagem.")
        return
      }
      if (file.size > MAX_IMAGE_BYTES) {
        onErrorMessage("A imagem deve ter no máximo 12 MB.")
        return
      }
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
      setMediaKind("image")
      setNewFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setMediaTouched(true)
    },
    [onErrorMessage, previewUrl]
  )

  const onVideoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return
      if (!file.type.startsWith("video/")) {
        onErrorMessage("Selecione um ficheiro de vídeo.")
        return
      }
      if (file.size > MAX_VIDEO_BYTES) {
        onErrorMessage("O vídeo deve ter no máximo 80 MB.")
        return
      }
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
      setMediaKind("video")
      setNewFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setMediaTouched(true)
    },
    [onErrorMessage, previewUrl]
  )

  const clearMedia = useCallback(() => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setMediaKind(null)
    setNewFile(null)
    setMediaTouched(true)
  }, [previewUrl])

  /**
   * Quando publicamos, resolvemos a mídia final:
   * - mantida → reaproveita `originalKind/originalUrl`
   * - nova → faz upload e devolve `[kind, url]`
   * - removida → devolve `null`
   * - erro de upload → devolve `false`
   */
  const resolveFinalMedia = useCallback(async (): Promise<
    string[] | null | false
  > => {
    if (!mediaTouched) {
      if (originalKind && originalUrl) return [originalKind, originalUrl]
      return null
    }
    if (!mediaKind || !previewUrl) return null
    if (newFile) {
      if (!token) {
        onErrorMessage("Sessão inválida. Inicie sessão novamente.")
        return false
      }
      const upload = await uploadMediaToCloudinary(newFile, token)
      if (!upload.success) {
        onErrorMessage(upload.error)
        return false
      }
      return [mediaKind, upload.data.url]
    }
    return [mediaKind, previewUrl]
  }, [
    mediaTouched,
    originalKind,
    originalUrl,
    mediaKind,
    previewUrl,
    newFile,
    token,
    onErrorMessage,
  ])

  const handleSaveDraft = useCallback(async () => {
    if (!post || !token) {
      onErrorMessage("Sessão inválida. Inicie sessão novamente.")
      return
    }
    const trimmed = content.trim()
    if (!trimmed) {
      onErrorMessage("O conteúdo não pode ficar vazio.")
      return
    }

    setSavingDraft(true)
    try {
      // PUT /api/posts/:id só aceita `image` (campo legado).
      let imagePayload: string | null | undefined

      if (mediaTouched) {
        if (newFile && mediaKind === "video") {
          onErrorMessage(
            "Para alterar o vídeo, use 'Finalizar publicação'. A API de rascunhos não aceita vídeo."
          )
          return
        }
        if (newFile && mediaKind === "image") {
          const upload = await uploadMediaToCloudinary(newFile, token)
          if (!upload.success) {
            onErrorMessage(upload.error)
            return
          }
          imagePayload = upload.data.url
        } else if (!previewUrl) {
          imagePayload = null
        }
      }

      const result = await updatePost(
        String(post.id),
        imagePayload !== undefined
          ? { content: trimmed, image: imagePayload }
          : { content: trimmed },
        token
      )
      if (result.success) {
        onSuccessMessage("Rascunho guardado.")
        await onRefreshPosts()
        onOpenChange(false)
      } else {
        onErrorMessage(result.error)
      }
    } finally {
      setSavingDraft(false)
    }
  }, [
    post,
    token,
    content,
    mediaTouched,
    newFile,
    mediaKind,
    previewUrl,
    onErrorMessage,
    onOpenChange,
    onRefreshPosts,
    onSuccessMessage,
  ])

  const handlePublish = useCallback(async () => {
    if (!post || !token) {
      onErrorMessage("Sessão inválida. Inicie sessão novamente.")
      return
    }
    const trimmed = content.trim()
    if (!trimmed) {
      onErrorMessage("O conteúdo não pode ficar vazio.")
      return
    }

    setPublishing(true)
    try {
      const finalMedia = await resolveFinalMedia()
      if (finalMedia === false) return

      const result = await publishPost(
        String(post.id),
        {
          title: title.trim(),
          content: trimmed,
          midia: finalMedia ?? undefined,
        },
        token
      )
      if (result.success) {
        onSuccessMessage("Publicação finalizada.")
        await onRefreshPosts()
        onOpenChange(false)
      } else {
        onErrorMessage(result.error)
      }
    } finally {
      setPublishing(false)
    }
  }, [
    post,
    token,
    title,
    content,
    resolveFinalMedia,
    onErrorMessage,
    onOpenChange,
    onRefreshPosts,
    onSuccessMessage,
  ])

  const busy = savingDraft || publishing

  return (
    <Dialog open={open && post != null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden border-border/45 p-0 shadow-none sm:max-w-2xl">
        <DialogHeader className="gap-1 border-b border-border/40 px-5 pb-3 pt-5">
          <DialogTitle className="text-base font-semibold">
            Rascunho — rever e publicar
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pode alterar o título, o texto e a mídia antes de guardar o
            rascunho ou de publicar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-title`} className="text-xs">
              Título
            </Label>
            <Input
              id={`${formId}-title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
              placeholder="Título da publicação"
              className="h-9 text-sm"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-content`} className="text-xs">
              Conteúdo
            </Label>
            <Textarea
              id={`${formId}-content`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={busy}
              placeholder="Texto da publicação…"
              className="min-h-[120px] resize-none text-sm"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Mídia</Label>
            <div className="rounded-lg border border-border bg-muted/30 p-2">
              {previewUrl && mediaKind === "image" ? (
                <div className="relative w-full overflow-hidden rounded-md bg-muted">
                  <Image
                    src={previewUrl}
                    alt="Pré-visualização"
                    width={800}
                    height={450}
                    className="h-44 w-full object-cover"
                    unoptimized={imageNeedsUnoptimized(previewUrl)}
                  />
                </div>
              ) : previewUrl && mediaKind === "video" ? (
                <video
                  src={previewUrl}
                  className="h-44 w-full rounded-md bg-muted object-cover"
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Sem mídia no rascunho.
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={busy}
                  onClick={() =>
                    document.getElementById(`${formId}-image`)?.click()
                  }
                >
                  <ImagePlus className="size-3" aria-hidden />
                  {mediaKind === "image"
                    ? "Substituir imagem"
                    : "Adicionar imagem"}
                </Button>
                <input
                  id={`${formId}-image`}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={onImageChange}
                  disabled={busy}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={busy}
                  onClick={() =>
                    document.getElementById(`${formId}-video`)?.click()
                  }
                >
                  <Video className="size-3" aria-hidden />
                  {mediaKind === "video"
                    ? "Substituir vídeo"
                    : "Adicionar vídeo"}
                </Button>
                <input
                  id={`${formId}-video`}
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={onVideoChange}
                  disabled={busy}
                />

                {previewUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={busy}
                    onClick={clearMedia}
                  >
                    <X className="size-3" aria-hidden />
                    Remover
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-1.5 border-t border-border/50 bg-muted/15 px-5 py-2.5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            className="border border-border/60"
            onClick={() => void handleSaveDraft()}
            disabled={busy || !content.trim()}
          >
            {savingDraft ? (
              <>
                <Loader2 className="size-3 animate-spin" aria-hidden />
                A guardar…
              </>
            ) : (
              "Guardar rascunho"
            )}
          </Button>
          <Button
            type="button"
            variant="buy"
            size="xs"
            onClick={() => void handlePublish()}
            disabled={busy || !content.trim()}
          >
            {publishing ? (
              <>
                <Loader2 className="size-3 animate-spin" aria-hidden />
                A publicar…
              </>
            ) : (
              "Finalizar publicação"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
