"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { signOut } from "next-auth/react"
import {
  Menu,
  Bell,
  Search,
  Settings,
  LogOut,
  User,
  Sun,
  Moon,
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
import { useTheme } from "@/lib/ThemeContext"
import { cn } from "@/lib/utils"

function buildBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length <= 1) return [{ label: "Dashboard" }]

  const labels: Record<string, string> = {
    dashboard: "Dashboard",
    boards: "Boards",
    crm: "CRM",
    flow: "Flow Builder",
    brain: "BrainLab",
    assets: "Assets",
    insights: "Insights",
    settings: "Einstellungen",
    usage: "Nutzung",
    team: "Team",
    reports: "Berichte",
    "admin-bot": "Admin Bot",
    "admin-notifications": "Benachrichtigungen",
    "admin-usage": "Token-Nutzung",
  }

  const crumbs: { label: string; href?: string }[] = []

  // Build path progressively
  let acc = ""
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    acc += "/" + part
    const label = labels[part] || part.charAt(0).toUpperCase() + part.slice(1)
    if (i < parts.length - 1) {
      crumbs.push({ label, href: acc })
    } else {
      crumbs.push({ label })
    }
  }

  return crumbs
}

export default function TopBar({
  user,
  onShortcutsToggle,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null }
  onShortcutsToggle?: () => void
}) {
  const { toggleMobile } = useSidebar()
  const { setOpen: openPalette } = useCommandPalette()
  const { theme, toggleTheme } = useTheme()
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

  const crumbs = buildBreadcrumbs(pathname)

  return (
    <header className="sticky top-0 z-20 h-10 flex items-center gap-3 px-4 bg-background border-b border-border shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={toggleMobile}
        className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Navigation öffnen"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm min-w-0">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-text-tertiary mx-0.5 select-none text-xs">/</span>
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-text-tertiary hover:text-text-primary transition-colors truncate max-w-[120px]"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-text-primary font-medium truncate max-w-[200px]">
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

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
        <span className="hidden md:inline">Suchen</span>
        <kbd className="ml-1 px-1 py-0.5 rounded text-[10px] font-mono bg-background border border-border leading-none">
          ⌘K
        </kbd>
      </button>

      {/* Shortcuts */}
      {onShortcutsToggle && (
        <button
          onClick={onShortcutsToggle}
          className="h-7 w-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-muted transition-colors text-xs font-mono"
          aria-label="Keyboard shortcuts"
          title="Keyboard Shortcuts"
        >
          ?
        </button>
      )}

      {/* Notifications */}
      <Link
        href="/admin-notifications"
        className={cn(
          "relative h-7 w-7 flex items-center justify-center rounded-md",
          "text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        )}
        aria-label="Benachrichtigungen"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-destructive rounded-full" />
        )}
      </Link>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="h-7 w-7 rounded-full overflow-hidden ring-0 hover:ring-2 hover:ring-border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Benutzerprofil"
          >
            {user.image ? (
              <img
                src={user.image}
                alt={user.name ?? ""}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
                {(user.name || user.email || "?").charAt(0).toUpperCase()}
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
          <DropdownMenuItem onClick={toggleTheme} className="flex items-center gap-2 cursor-pointer">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Helles Design" : "Dunkles Design"}
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
