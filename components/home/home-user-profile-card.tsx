"use client"

import Link from "next/link"
import Image from "next/image"
import { ChevronRight } from "lucide-react"
import { useAuth } from "@/lib/use-auth"
import {
  resolveUserAvatarUrl,
  userAvatarSrcUnoptimized,
} from "@/lib/user-avatar"
import { cn } from "@/lib/utils"

interface HomeUserProfileCardProps {
  className?: string
  onNavigate?: () => void
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (name.trim().slice(0, 2) || "U").toUpperCase()
}

export function HomeUserProfileCard({
  className,
  onNavigate,
}: HomeUserProfileCardProps) {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading || !isAuthenticated || !user) return null

  const name = user.name?.trim() || "Utilizador"
  const avatarSrc = resolveUserAvatarUrl(user.image)
  const hasPhoto = Boolean(user.image?.trim())

  return (
    <Link
      href="/perfil"
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-5 transition-colors hover:bg-gray-50",
        className
      )}
      aria-label={`Abrir o perfil de ${name}`}
    >
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-medium text-gray-700 ring-1 ring-gray-100">
        {hasPhoto ? (
          <Image
            src={avatarSrc}
            alt=""
            width={48}
            height={48}
            className="size-full object-cover"
            unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
          />
        ) : (
          getInitials(name)
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-gray-900">
          {name}
        </span>
        <span className="mt-0.5 block text-sm text-gray-500">
          Ver o meu perfil
        </span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )
}
