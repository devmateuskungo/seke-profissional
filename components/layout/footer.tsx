"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const EXCLUDED_PREFIXES = ["/auth", "/optionregister"]

const footerLinks = [
  { label: "Privacidade", href: "/politica-de-privacidade" },
  { label: "Termos", href: "/termos-de-uso" },
  { label: "Publicidade", href: "#" },
  { label: "Escolhas para anúncios", href: "#" },
  { label: "Cookies", href: "#" },
  { label: "Mais", href: "#" },
]

export function Footer() {
  const pathname = usePathname()
  const excluded = EXCLUDED_PREFIXES.some((prefix) => pathname?.startsWith(prefix))
  if (excluded) return null

  return (
    <footer className="border-t border-border bg-background py-6">
      <div className="mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 text-xs text-muted-foreground">
        {footerLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
        <span className="ml-2 text-muted-foreground/60">© {new Date().getFullYear()} Seke</span>
      </div>
    </footer>
  )
}
