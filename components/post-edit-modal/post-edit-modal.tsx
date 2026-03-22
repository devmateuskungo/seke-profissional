"use client"

import Image from "next/image"
import { useCallback, useEffect, useId, useState } from "react"
import { ImagePlus, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { compressImageToJpegDataUrl } from "@/lib/compress-image-client"
import { updatePost } from "@/lib/posts-client"
import { resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"
import { getStoredUserProfile } from "@/lib/viewer-user-id"
import type { PostDetail, UpdatePostRequest } from "@/types/post"

const MAX_FILE_BYTES = 12 * 1024 * 1024

function imageNeedsUnoptimized(src: string): boolean {
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("//")
  )
}

export interface PostEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  token: string
  initialContent: string
  /** URL da imagem atual (remota ou data URL) */
  initialImageUrl?: string | null
  onSaved: (detail: PostDetail) => void
  onError?: (message: string) => void
}

export function PostEditModal({
  open,
  onOpenChange,
  postId,
  token,
  initialContent,
  initialImageUrl,
  onSaved,
  onError,
}: PostEditModalProps) {
  const formId = useId()
  const [content, setContent] = useState("")
  /** Pré-visualização: URL remota ou nova data URL */
  const [previewUrl, setPreviewUrl] = useState("")
  /** Se o utilizador alterou a imagem (nova ficheiro ou remover) */
  const [imageTouched, setImageTouched] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setContent(initialContent)
    setPreviewUrl((initialImageUrl ?? "").trim())
    setImageTouched(false)
  }, [open, initialContent, initialImageUrl])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return
      if (!file.type.startsWith("image/")) {
        onError?.("Selecione um ficheiro de imagem.")
        return
      }
      if (file.size > MAX_FILE_BYTES) {
        onError?.("A imagem deve ter no máximo 12 MB.")
        return
      }
      setCompressing(true)
      try {
        const dataUrl = await compressImageToJpegDataUrl(file)
        setPreviewUrl(dataUrl)
        setImageTouched(true)
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Não foi possível processar a imagem."
        onError?.(msg)
      } finally {
        setCompressing(false)
      }
    },
    [onError]
  )

  const clearImage = useCallback(() => {
    setPreviewUrl("")
    setImageTouched(true)
  }, [])

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
        const payload: UpdatePostRequest = { content: trimmed }
        if (imageTouched) {
          if (!previewUrl) {
            payload.image = null
          } else if (previewUrl.startsWith("data:")) {
            payload.image = previewUrl
          }
        }

        const result = await updatePost(postId, payload, token)
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
      imageTouched,
      onError,
      onOpenChange,
      onSaved,
      postId,
      previewUrl,
      token,
    ]
  )

  const sessionProfile = open ? getStoredUserProfile() : null
  const displayName = sessionProfile?.name ?? "Utilizador"
  const avatarSrc = resolveUserAvatarUrl(sessionProfile?.avatar)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl gap-0 p-0 overflow-hidden">
        <div className="p-6 pb-0">
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

        <div className="p-6 pt-4">
          <form
            id={formId}
            onSubmit={(ev) => void handleSubmit(ev)}
            className="space-y-4 min-w-0"
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground pt-0.5" htmlFor={`${formId}-content`}>
              Altere o texto e, se quiser, a imagem da publicação. Guarde para
              aplicar as alterações.{" "}
              </Label>
              <Textarea
                id={`${formId}-content`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[140px] text-sm"
                disabled={saving}
                placeholder="Conteúdo da publicação…"
              />
            </div>

            <div className="space-y-2">
              <Label>Imagem da publicação</Label>
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                {previewUrl ? (
                  <div className="relative w-full aspect-video max-h-48 rounded-md overflow-hidden bg-muted">
                    <Image
                      src={previewUrl}
                      alt="Pré-visualização"
                      fill
                      className="object-cover"
                      unoptimized={imageNeedsUnoptimized(previewUrl)}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Sem imagem nesta publicação.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={saving || compressing}
                    onClick={() =>
                      document.getElementById(`${formId}-file`)?.click()
                    }
                  >
                    {compressing ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <ImagePlus className="size-4" aria-hidden />
                    )}
                    {previewUrl ? "Substituir imagem" : "Adicionar imagem"}
                  </Button>
                  <input
                    id={`${formId}-file`}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={saving || compressing}
                  />
                  {previewUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving || compressing}
                      onClick={clearImage}
                    >
                      Remover imagem
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 border-t border-border/60 bg-muted/20 sm:justify-end">
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
            disabled={saving || !content.trim() || compressing}
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
