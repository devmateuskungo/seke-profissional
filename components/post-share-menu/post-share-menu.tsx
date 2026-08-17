"use client"

import { useMemo, useState } from "react"
import {
  Copy,
  Facebook,
  Linkedin,
  Loader2,
  MessageCircle,
  Send,
  Share2,
  Twitter,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/toaster"
import { sharePost } from "@/lib/posts-client"
import { cn } from "@/lib/utils"
import type { PostSharePlatform } from "@/types/post"

const SHARE_OPTIONS: {
  platform: PostSharePlatform
  label: string
  icon: typeof Share2
}[] = [
  { platform: "Linkdin", label: "LinkedIn", icon: Linkedin },
  { platform: "Facebook", label: "Facebook", icon: Facebook },
  { platform: "WhatsApp", label: "WhatsApp", icon: MessageCircle },
  { platform: "Twitter", label: "X (Twitter)", icon: Twitter },
  { platform: "Telegram", label: "Telegram", icon: Send },
  { platform: "Copy", label: "Copiar link", icon: Copy },
]

function resolveAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("auth_token")
}

function resolvePostUrl(postId: string): string {
  if (typeof window === "undefined") return `/posts/${postId}`
  return new URL(`/posts/${encodeURIComponent(postId)}`, window.location.origin).toString()
}

function openPlatformShare(
  platform: PostSharePlatform,
  url: string,
  title: string
): void {
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(title)

  const target =
    platform === "Linkdin"
      ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
      : platform === "Facebook"
        ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        : platform === "Twitter"
          ? `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`
          : platform === "WhatsApp"
            ? `https://wa.me/?text=${encodedText}%20${encodedUrl}`
            : platform === "Telegram"
              ? `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
              : null

  if (target) {
    window.open(target, "_blank", "noopener,noreferrer,width=640,height=640")
  }
}

export interface PostShareMenuProps {
  postId: string
  title?: string | null
  className?: string
  variant?: "default" | "overlay"
}

export function PostShareMenu({
  postId,
  title,
  className,
  variant = "default",
}: PostShareMenuProps) {
  const [open, setOpen] = useState(false)
  const [sharing, setSharing] = useState<PostSharePlatform | null>(null)
  const shareTitle = useMemo(
    () => title?.trim() || "Publicação SEKE",
    [title]
  )

  const handleSelect = async (platform: PostSharePlatform) => {
    if (!postId.trim() || sharing) return

    const token = resolveAuthToken()
    const url = resolvePostUrl(postId)

    setSharing(platform)
    try {
      if (token) {
        const result = await sharePost(postId, platform, token)
        if (!result.success) {
          toast.error(result.error)
        }
      }

      if (platform === "Copy") {
        try {
          await navigator.clipboard.writeText(url)
          toast.success("Link copiado.")
        } catch {
          toast.error("Não foi possível copiar o link.")
        }
        setOpen(false)
        return
      }

      openPlatformShare(platform, url, shareTitle)
      setOpen(false)
    } finally {
      setSharing(null)
    }
  }

  const overlay = variant === "overlay"

  return (
    <>
      <button
        type="button"
        disabled={Boolean(sharing) || !postId}
        className={cn(
          overlay
            ? "flex flex-col items-center gap-1 disabled:opacity-60 md:gap-1.5"
            : "flex cursor-pointer items-center gap-1.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60",
          className
        )}
        aria-label="Partilhar publicação"
        onClick={() => setOpen(true)}
      >
        <Share2
          className={cn(
            overlay ? "size-8 text-white drop-shadow-md" : "size-[18px] shrink-0"
          )}
          strokeWidth={2}
          aria-hidden
        />
        {overlay ? (
          <span className="text-xs font-semibold text-white drop-shadow">
            Partilhar
          </span>
        ) : (
          <span className="text-xs font-medium">Partilhar</span>
        )}
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (sharing) return
          setOpen(next)
        }}
      >
        <DialogContent
          className="z-9999 sm:max-w-md"
          overlayClassName="z-9999"
          showCloseButton={!sharing}
        >
          <DialogHeader>
            <DialogTitle>Partilhar publicação</DialogTitle>
            <DialogDescription>
              Escolha a plataforma onde quer partilhar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SHARE_OPTIONS.map(({ platform, label, icon: Icon }) => {
              const isBusy = sharing === platform
              return (
                <button
                  key={platform}
                  type="button"
                  disabled={Boolean(sharing)}
                  onClick={() => void handleSelect(platform)}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? (
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                  ) : (
                    <Icon className="size-5" aria-hidden />
                  )}
                  {label}
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
