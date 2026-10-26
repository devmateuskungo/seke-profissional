"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { ReactNode } from "react"
import { Toaster } from "@/components/ui/sonner"
import { VideoFeedGalleryProvider } from "@/components/video-feed-gallery/video-feed-gallery-provider"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <VideoFeedGalleryProvider>
          {children}
        </VideoFeedGalleryProvider>
        <Toaster position="top-right" closeButton />
      </SessionProvider>
    </ThemeProvider>
  )
}
