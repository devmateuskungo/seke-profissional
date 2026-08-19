"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { cn } from "@/lib/utils"
import {
  getAppNavItems,
  isNavItemActive,
  type AppNavItem,
} from "@/components/itemnavbar/nav-config"
import type { AccountRole } from "@/lib/account-role"

type MobileBottomNavProps = {
  isAuthenticated: boolean
  role: AccountRole | null
  exploreOpen: boolean
  onExplore: () => void
}

function NavButton({
  item,
  active,
  onExplore,
}: {
  item: AppNavItem
  active: boolean
  onExplore: () => void
}) {
  const Icon = item.icon
  const className = cn(
    "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold leading-tight transition-colors",
    active ? "text-primary" : "text-muted-foreground",
  )

  const content = (
    <>
      <Icon
        size={22}
        className="shrink-0"
        strokeWidth={active ? 2.4 : 2}
        aria-hidden
      />
      <span className="max-w-full truncate">{item.shortLabel}</span>
    </>
  )

  if (item.action === "explore") {
    return (
      <button
        type="button"
        className={className}
        aria-label={item.label}
        aria-pressed={active}
        onClick={onExplore}
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      href={item.href ?? "/"}
      className={className}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
    >
      {content}
    </Link>
  )
}

function MobileBottomNavBar({
  isAuthenticated,
  role,
  exploreOpen,
  onExplore,
}: MobileBottomNavProps) {
  const pathname = usePathname() ?? "/"
  const searchParams = useSearchParams()
  const search = searchParams.toString()
  const items = getAppNavItems({
    isAuthenticated,
    role,
    includeProfile: isAuthenticated,
  })

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_4px_rgba(20,22,26,0.08)] backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden [&_a]:no-underline [&_a:hover]:no-underline [&_a:focus]:no-underline"
    >
      <div className="flex items-stretch justify-around px-1 pt-1">
        {items.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={isNavItemActive(item, pathname, search, exploreOpen)}
            onExplore={onExplore}
          />
        ))}
      </div>
    </nav>
  )
}

export function MobileBottomNav(props: MobileBottomNavProps) {
  return (
    <Suspense fallback={null}>
      <MobileBottomNavBar {...props} />
    </Suspense>
  )
}
