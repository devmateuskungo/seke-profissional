"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { PostContentWithHashtags } from "@/components/post-content-with-hashtags/post-content-with-hashtags"

export interface PostExpandableContentProps {
  text: string
  className?: string
  /** Número de linhas visíveis antes de truncar */
  collapsedLines?: 2 | 3 | 4 | 5 | 6
}

const LINE_CLAMP_CLASS: Record<NonNullable<PostExpandableContentProps["collapsedLines"]>, string> = {
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
  6: "line-clamp-6",
}

export function PostExpandableContent({
  text,
  className,
  collapsedLines = 4,
}: PostExpandableContentProps) {
  const [expanded, setExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const contentRef = useRef<HTMLParagraphElement>(null)

  const checkTruncation = useCallback(() => {
    const el = contentRef.current
    if (!el || expanded) return
    setIsTruncated(el.scrollHeight > el.clientHeight + 1)
  }, [expanded])

  useEffect(() => {
    setExpanded(false)
  }, [text])

  useEffect(() => {
    checkTruncation()
  }, [text, checkTruncation])

  useEffect(() => {
    window.addEventListener("resize", checkTruncation)
    return () => window.removeEventListener("resize", checkTruncation)
  }, [checkTruncation])

  if (!text) return null

  const showToggle = isTruncated || expanded

  return (
    <div>
      <p
        ref={contentRef}
        className={cn(
          "text-sm text-foreground/90 leading-relaxed",
          !expanded && LINE_CLAMP_CLASS[collapsedLines],
          className
        )}
      >
        <PostContentWithHashtags text={text} />
      </p>
      {showToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={expanded}
        >
          {expanded ? "ver menos" : "ver mais"}
        </button>
      ) : null}
    </div>
  )
}
