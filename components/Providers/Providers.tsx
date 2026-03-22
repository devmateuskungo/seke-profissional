"use client"

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"
import { ToasterProvider } from "@/components/ui/toaster"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToasterProvider>
        {children}
      </ToasterProvider>
    </SessionProvider>
  )
}