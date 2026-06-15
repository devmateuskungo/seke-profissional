"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lightTheme } from "@/style";
import {
  resolveUserAvatarUrl,
  userAvatarSrcUnoptimized,
} from "@/lib/user-avatar";

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
  totalReviews?: number;
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
  totalReviews = 0,
}: ItemlistcategoriaProfissionalProps) {
  const router = useRouter();
  const avatarSrc = resolveUserAvatarUrl(image);
  const location = formatLocation(province, municipality);
  const bioText = bio?.trim();

  const goToProfile = () => {
    router.push(
      `/categoria-profissional/${encodeURIComponent(professionalId)}`
    );
  };

  return (
    <article
      className="w-full max-w-[280px] rounded-md border border-gray-200 bg-white p-4  transition-shadow hover:shadow-md"
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="size-20 overflow-hidden rounded-full ring-2 ring-gray-100 bg-muted">
            <Image
              src={avatarSrc}
              alt={name}
              width={80}
              height={80}
              className="size-full object-cover"
              unoptimized={userAvatarSrcUnoptimized(avatarSrc)}
            />
          </div>
          {isAvailable ? (
            <span
              className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-emerald-500"
              title="Disponível"
            />
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 max-w-full">
          <h3 className="font-semibold text-gray-900 text-sm truncate">
            {name}
          </h3>
          {verified ? (
            <BadgeCheck
              className="size-4 shrink-0 text-[#2b81e5]"
              aria-label="Verificado"
            />
          ) : null}
        </div>

        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <Star className="size-3.5 text-amber-400 fill-amber-400 shrink-0" />
          <span className="font-medium text-gray-700">{rating.toFixed(1)}</span>
          {totalReviews > 0 ? (
            <span className="text-gray-400">
              ({totalReviews} {totalReviews === 1 ? "avaliação" : "avaliações"})
            </span>
          ) : (
            <span className="text-gray-400">Sem avaliações</span>
          )}
        </div>

        {bioText ? (
          <p className="mt-2 text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {bioText}
          </p>
        ) : null}

        {location ? (
          <p className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-500 max-w-full">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{location}</span>
          </p>
        ) : null}

        <p className="mt-3 text-sm font-semibold text-gray-900">
          {price > 0
            ? `${price.toLocaleString("pt-PT")} Kz/h`
            : "Preço a combinar"}
        </p>

        <Button
          type="button"
          onClick={goToProfile}
          className="mt-4 h-8 w-full text-sm text-white hover:opacity-90"
          style={{ backgroundColor: lightTheme.colors.primary }}
        >
          Ver perfil
        </Button>
      </div>
    </article>
  );
}
