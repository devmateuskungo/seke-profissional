import type { ReactNode } from "react"
import { MapPin, UserPlus, UserMinus } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { USER_AVATAR_PLACEHOLDER, resolveUserAvatarUrl, userAvatarSrcUnoptimized } from "@/lib/user-avatar"

export interface ItemHeaderviewsProps {
  name: string
  avatar?: string | null
  bio?: string | null
  location?: string | null
  memberSinceLabel?: string | null
  stats?: { posts: number; followers: number; following: number }
  /** Ações extra ao lado do nome (ex.: seguir) */
  actions?: ReactNode
  /** Mostrar botão seguir integrado (alternativa a `actions`) */
  showFollow?: boolean
  isFollowing?: boolean
  followLoading?: boolean
  onFollowClick?: () => void
}

export default function ItemHeaderviews({
  name,
  avatar,
  bio,
  location,
  memberSinceLabel,
  stats,
  actions,
  showFollow,
  isFollowing,
  followLoading,
  onFollowClick,
}: ItemHeaderviewsProps) {
  const avatarSrc = resolveUserAvatarUrl(avatar ?? undefined) || USER_AVATAR_PLACEHOLDER
  const posts = stats?.posts ?? 0
  const followers = stats?.followers ?? 0
  const following = stats?.following ?? 0

  return (
    <div className="w-full rounded-xl border border-border/45 bg-muted/30 p-4 sm:p-6 md:p-8 flex flex-col md:flex-row justify-between items-start gap-6 md:gap-4">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full md:w-auto">
        <div className="relative mx-auto h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-border/35 bg-card sm:mx-0 sm:h-24 sm:w-24 md:h-28 md:w-28">
          <Image
            src={avatarSrc}
            alt={name}
            fill
            sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 112px"
            className="object-cover object-center"
            priority
            unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
          />
        </div>

        <div className="flex w-full flex-col gap-2 text-center sm:text-left sm:gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              {name}
            </h2>
            {actions}
            {showFollow && onFollowClick ? (
              <Button
                type="button"
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                className="shrink-0"
                disabled={followLoading}
                onClick={onFollowClick}
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="size-4" />
                    Deixar de seguir
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" />
                    Seguir
                  </>
                )}
              </Button>
            ) : null}
          </div>

          {bio ? (
            <p className="text-sm text-muted-foreground sm:text-base">{bio}</p>
          ) : null}

          <div className="flex flex-col items-center gap-2 sm:items-start sm:gap-1">
            {location ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <MapPin className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                <span>{location}</span>
              </div>
            ) : null}
            {memberSinceLabel ? (
              <p className="text-xs text-muted-foreground sm:text-sm">
                Membro desde {memberSinceLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid w-full grid-cols-3 gap-3 border-t border-border/40 pt-4 text-center text-xs text-muted-foreground md:w-auto md:border-t-0 md:pt-0 md:text-right">
        <div>
          <p className="text-muted-foreground">Publicações</p>
          <p className="font-semibold text-foreground">{posts}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Seguidores</p>
          <p className="font-semibold text-foreground">{followers}</p>
        </div>
        <div>
          <p className="text-muted-foreground">A seguir</p>
          <p className="font-semibold text-foreground">{following}</p>
        </div>
      </div>
    </div>
  )
}
