"use client"

import { usePathname } from "next/navigation"
import { AuthBrandHeader } from "@/components/auth/auth-brand-header"
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel"

const ROUTES_WITHOUT_IMAGE = ["/auth/register/tipo-conta"]

function shouldHideAuthImage(pathname: string): boolean {
  return ROUTES_WITHOUT_IMAGE.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const hideImage = shouldHideAuthImage(pathname)

  if (hideImage) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-background text-foreground font-sans">
        <main className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 md:items-center md:justify-center">
          <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-9 md:max-w-2xl">
            <AuthBrandHeader className="md:items-center" />
            <div className="w-full">{children}</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground font-sans md:h-screen md:flex-row md:overflow-hidden">
      <div className="relative flex w-full flex-1 flex-col overflow-y-auto px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 md:w-1/2 md:items-center md:justify-center md:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-9 md:items-stretch md:gap-0">
          <AuthBrandHeader className="md:hidden" />
          <div className="w-full">{children}</div>
        </div>
      </div>

      <AuthBrandPanel />
    </div>
  )
}