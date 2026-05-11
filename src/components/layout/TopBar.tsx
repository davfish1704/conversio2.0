"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { signOut } from "next-auth/react"
import {
  Menu,
  Bell,
  Search,
  ChevronRight,
  Settings,
  LogOut,
  User,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/lib/SidebarContext"
import { useCommandPalette } from "@/lib/CommandPaletteContext"
import { cn } from "@/lib/utils"

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard":           "Dashboard",
  "/crm":                 "CRM",
  "/reports":             "Berichte",
  "/team":                "Team",
  "/settings":            "Einstellungen",
  "/admin-bot":           "Admin Bot",
  "/admin-usage":         "Token-Nutzung",
  "/admin-notifications": "Benachrichtigungen",
  "/builder":             "Builder",
}

function resolvePageLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  if (pathname.startsWith("/boards/")) {
    if (pathname.endsWith("/settings")) return "Board-Einstellungen"
    if (pathname.endsWith("/brain"))    return "KI-Konfiguration"
    if (pathname.endsWith("/flow"))     return "Flow Builder"
    if (pathname.endsWith("/assets"))   return "Assets"
    if (pathname.endsWith("/usage"))    return "Token-Nutzung"
    return "Pipeline"
  }
  return ""
}

export default function TopBar({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null }
}) {
  const { toggleMobile } = useSidebar()
  const { setOpen: openPalette } = useCommandPalette()
  const pathname = usePathname()
  const router = useRouter()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const res = await fetch("/api/admin/notifications?unread=true")
        if (res.ok && !cancelled) {
          const data = await res.json()
          setUnread(data.notifications?.length ?? 0)
        }
      } catch {}
    }
    poll()
    const iv = setInterval(poll, 60_000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [])

  const pageLabel = resolvePageLabel(pathname)
  const initial = (user.name || user.email || "?").charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-20 h-12 flex items-center gap-3 px-4 bg-background border-b border-border shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={toggleMobile}
        className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Navigation öffnen"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Breadcrumb */}
      {pageLabel && (
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-muted-foreground hidden sm:block">Conversio</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 hidden sm:block shrink-0" />
          <span className="font-medium text-foreground truncate">{pageLabel}</span>
        </nav>
      )}

      <div className="flex-1" />

      {/* Search */}
      <button
        onClick={() => openPalette(true)}
        className={cn(
          "hidden sm:flex items-center gap-2 h-7 px-3 rounded-md border border-border",
          "text-xs text-muted-foreground bg-muted/50",
          "hover:bg-muted hover:border-border/80 transition-colors"
        )}
        aria-label="Suchen"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span>Suchen</span>
        <kbd className="ml-2 px-1 py-0.5 rounded text-[10px] font-mono bg-background border border-border leading-none">
          ⌘K
        </kbd>
      </button>

      {/* Notifications */}
      <Link
        href="/admin-notifications"
        className={cn(
          "relative h-8 w-8 flex items-center justify-center rounded-md",
          "text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        )}
        aria-label="Benachrichtigungen"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />
        )}
      </Link>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="h-8 w-8 rounded-full overflow-hidden ring-0 hover:ring-2 hover:ring-border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Benutzerprofil"
          >
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? ""}
                width={32}
                height={32}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                {initial}
              </div>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-2">
            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
              <Settings className="w-4 h-4" />
              Einstellungen
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/team" className="flex items-center gap-2 cursor-pointer">
              <User className="w-4 h-4" />
              Team
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive focus:bg-destructive/10 flex items-center gap-2 cursor-pointer"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-4 h-4" />
            Abmelden
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
