"use client"

import { usePathname } from "next/navigation"

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
      <div className="flex min-h-[100dvh] flex-col bg-background font-sans">
        <main className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 md:items-center md:justify-center">
          <div className="mx-auto w-full max-w-lg md:max-w-2xl">
            {children}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen font-sans overflow-hidden bg-background">
      <div className="flex w-full md:w-1/2 items-center justify-center px-6">
        {children}
      </div>

      <div className="hidden md:flex w-1/2 items-center justify-center p-6">
        <div className="w-full h-full bg-[url('/image-background.png')] bg-cover bg-center bg-no-repeat rounded-2xl overflow-hidden flex items-center justify-center">
          <div className="p-8 text-white max-w-md rounded-xl" />
        </div>
      </div>
    </div>
  )
}
