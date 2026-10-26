import Image from "next/image";
import { cn } from "@/lib/utils";

export interface OverlappingAvatarItem {
  src: string;
  alt?: string;
}

const DEFAULT_AVATARS: OverlappingAvatarItem[] = [
  { src: "https://randomuser.me/api/portraits/women/44.jpg", alt: "Retrato de profissional" },
  { src: "https://randomuser.me/api/portraits/men/32.jpg", alt: "Retrato de profissional" },
  { src: "https://randomuser.me/api/portraits/women/68.jpg", alt: "Retrato de profissional" },
  { src: "https://randomuser.me/api/portraits/men/22.jpg", alt: "Retrato de profissional" },
];

const SIZES = {
  sm: {
    avatar: "h-9 w-9",
    ring: "ring-2",
    overlap: "-space-x-2.5",
    count: "h-9 min-w-9 px-1 text-[10px]",
  },
  md: {
    avatar: "h-12 w-12",
    ring: "ring-2",
    overlap: "-space-x-3.5",
    count: "h-12 min-w-12 px-1.5 text-xs",
  },
  lg: {
    avatar: "h-14 w-14",
    ring: "ring-[3px]",
    overlap: "-space-x-4",
    count: "h-14 min-w-14 px-2 text-sm",
  },
} as const;

export function OverlappingAvatars({
  avatars = DEFAULT_AVATARS,
  size = "md",
  count,
  className,
}: {
  avatars?: OverlappingAvatarItem[];
  size?: keyof typeof SIZES;
  count?: string;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div className={cn("flex shrink-0 items-center", s.overlap, className)}>
      {avatars.map((avatar) => (
        <div
          key={avatar.src}
          className={cn(
            "relative overflow-hidden rounded-full bg-white/20 shadow-md",
            s.avatar,
            s.ring,
            "ring-white/95"
          )}
        >
          <Image
            src={avatar.src}
            alt={avatar.alt ?? "Retrato de profissional"}
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
      ))}
      {count ? (
        <div
          className={cn(
            "relative z-10 flex shrink-0 items-center justify-center rounded-full bg-white font-bold text-[#0468e6] shadow-md ring-2 ring-white/95",
            s.avatar,
            s.count
          )}
        >
          {count}
        </div>
      ) : null}
    </div>
  );
}