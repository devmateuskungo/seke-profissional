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
      <div className="flex min-h-screen font-sans bg-white">
        <div className="flex w-full items-center justify-center px-4 sm:px-8 py-8">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen font-sans overflow-hidden bg-white">
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
