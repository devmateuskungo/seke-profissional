import Link from "next/link"
import { cn } from "@/lib/utils"
import { normalizeHashtagLabel } from "@/lib/posts-client"

/** Padrão de hashtag no texto: #palavra (com grupo de captura para split) */
export const HASHTAG_IN_TEXT_PATTERN = /(#[a-zA-Z0-9_\u00C0-\u024F]+)/g

const HASHTAG_TOKEN_PATTERN = /^#[a-zA-Z0-9_\u00C0-\u024F]+$/i

export interface PostContentWithHashtagsProps {
  text: string
  className?: string
  hashtagClassName?: string
}

/**
 * Renderiza texto de publicação com hashtags (#tag) destacadas em cor primária.
 */
export function PostContentWithHashtags({
  text,
  className,
  hashtagClassName,
}: PostContentWithHashtagsProps) {
  if (!text) return null

  const parts = text.split(HASHTAG_IN_TEXT_PATTERN)

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {parts.map((part, index) => {
        if (!part) return null

        if (HASHTAG_TOKEN_PATTERN.test(part)) {
          const tag = normalizeHashtagLabel(part)
          return (
            <Link
              key={`tag-${index}-${part}`}
              href={tag ? `/pesquisa?hashtag=${encodeURIComponent(tag)}` : "/pesquisa"}
              className={cn(
                "font-semibold text-primary no-underline hover:underline",
                hashtagClassName
              )}
            >
              {part}
            </Link>
          )
        }

        return <span key={`text-${index}`}>{part}</span>
      })}
    </span>
  )
}
