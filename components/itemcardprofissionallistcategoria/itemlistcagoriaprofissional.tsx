"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { BadgeCheck, MapPin, Navigation, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  resolveUserAvatarUrl,
  userAvatarSrcUnoptimized,
} from "@/lib/user-avatar";
import { formatDistanceKm } from "@/lib/professional-distance";
import { isProfessionallyOnline } from "@/lib/professional-online";
import { cn } from "@/lib/utils";

interface ItemlistcategoriaProfissionalProps {
  professionalId: string;
  name: string;
  image?: string | null;
  rating: number;
  verified?: boolean;
  price: number;
  bio?: string | null;
  province?: string | null;
  municipality?: string | null;
  isAvailable?: boolean;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  updatedAt?: string | null;
  totalReviews?: number;
  distanceKm?: number | null;
}

function formatLocation(
  province?: string | null,
  municipality?: string | null
): string | null {
  const parts = [municipality?.trim(), province?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export default function ItemlistcategoriaProfissional({
  professionalId,
  name,
  image,
  rating,
  verified = false,
  price,
  bio,
  province,
  municipality,
  isAvailable = true,
  isOnline,
  lastSeenAt,
  updatedAt,
  totalReviews = 0,
  distanceKm,
}: ItemlistcategoriaProfissionalProps) {
  const router = useRouter();
  const avatarSrc = resolveUserAvatarUrl(image);
  const location = formatLocation(province, municipality);
  const bioText = bio?.trim();
  const online = isProfessionallyOnline({
    is_online: isOnline,
    last_seen_at: lastSeenAt,
    updated_at: updatedAt,
  });
  const priceLabel =
    price > 0 ? `${price.toLocaleString("pt-PT")} Kz/h` : "A combinar";

  const goToProfile = () => {
    router.push(
      `/categoria-profissional/${encodeURIComponent(professionalId)}`
    );
  };

  return (
    <article className="flex w-full max-w-none flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md sm:max-w-[300px]">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="relative shrink-0">
          <div className="size-14 overflow-hidden rounded-full bg-muted ring-2 ring-border">
            <Image
              src={avatarSrc}
              alt={name}
              width={56}
              height={56}
              className="size-full object-cover"
              unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
            />
          </div>
          <span
            className={cn(
              "absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white",
              online ? "bg-emerald-500" : "bg-muted-foreground/50"
            )}
            title={online ? "Online" : "Offline"}
          />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start gap-1">
            <h3 className="truncate text-sm font-semibold leading-snug text-foreground">
              {name}
            </h3>
            {verified ? (
              <BadgeCheck
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-label="Verificado"
              />
            ) : null}
          </div>

          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground">
              {rating.toFixed(1)}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span>
              {totalReviews > 0
                ? `${totalReviews} ${totalReviews === 1 ? "avaliação" : "avaliações"}`
                : "Sem avaliações"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            isAvailable
              ? "bg-emerald-50 text-emerald-700"
              : "bg-secondary text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              isAvailable ? "bg-emerald-500" : "bg-muted-foreground/70"
            )}
            aria-hidden
          />
          {isAvailable ? "Disponível" : "Indisponível"}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            online ? "bg-sky-50 text-sky-700" : "bg-secondary text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              online ? "bg-sky-500" : "bg-muted-foreground/70"
            )}
            aria-hidden
          />
          {online ? "Online" : "Offline"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        {bioText ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {bioText}
          </p>
        ) : null}

        {location ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
            <span className="truncate">{location}</span>
          </p>
        ) : null}

        {typeof distanceKm === "number" && !Number.isNaN(distanceKm) ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Navigation className="size-3.5 shrink-0" aria-hidden />
            {formatDistanceKm(distanceKm)}
          </p>
        ) : null}
      </div>

      <div className="mt-auto border-t border-border bg-muted/70 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
              Preço
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {priceLabel}
            </p>
          </div>
          <Button
            type="button"
            size="xs"
            onClick={goToProfile}
            className="h-8 shrink-0 px-3 text-xs bg-primary text-primary-foreground hover:opacity-90"
          >
            Ver perfil
          </Button>
        </div>
      </div>
    </article>
  );
}
