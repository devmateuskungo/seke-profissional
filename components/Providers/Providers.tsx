"use client"

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"
import { Toaster } from "@/components/ui/sonner"
import { VideoFeedGalleryProvider } from "@/components/video-feed-gallery/video-feed-gallery-provider"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <VideoFeedGalleryProvider>
        {children}
      </VideoFeedGalleryProvider>
      <Toaster position="top-right" theme="light" closeButton />
    </SessionProvider>
  )
}
