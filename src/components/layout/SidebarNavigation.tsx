"use client"

import { useState, useEffect, useContext, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  KanbanSquare,
  Bot,
  Users,
  Settings,
  CreditCard,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
} from "lucide-react"
import { LanguageContext } from "@/lib/LanguageContext"
import { FEATURES } from "@/lib/features"
import { useSidebar } from "@/lib/SidebarContext"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Board { id: string; name: string; isActive: boolean }

export default function SidebarNavigation({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null }
}) {
  const { t } = useContext(LanguageContext)
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar()
  const pathname = usePathname()

  const [boards, setBoards] = useState<Board[]>([])

  useEffect(() => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((d) => setBoards((d.boards || []).filter((b: Board) => b.isActive)))
      .catch(() => {})
  }, [])

  const closeMobile = useCallback(() => setMobileOpen(false), [setMobileOpen])

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    if (href === "/boards") return pathname.startsWith("/boards/") || pathname === "/crm"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const navLink = (href: string, active: boolean) =>
    cn(
      "flex items-center gap-2.5 rounded-md text-sm transition-all duration-100",
      collapsed ? "justify-center h-9 w-10 mx-auto" : "h-8 px-2.5 w-full",
      active
        ? "text-foreground font-medium"
        : "text-muted-foreground hover:text-foreground"
    )

  const sectionTitle = (label: string) =>
    !collapsed && (
      <p className="px-2.5 pt-4 pb-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-widest select-none">
        {label}
      </p>
    )

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full flex flex-col",
          "bg-sidebar border-r border-sidebar-border",
          "transition-all duration-200 ease-out",
          collapsed ? "w-14" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-12 shrink-0 border-b border-sidebar-border",
          collapsed ? "justify-center" : "px-3 gap-2.5"
        )}>
          <Link href="/dashboard" onClick={closeMobile} className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold text-foreground tracking-tight truncate">
                Conversio
              </span>
            )}
          </Link>

          <button
            onClick={toggleCollapsed}
            className="hidden md:flex ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-0.5">
          {/* WORKSPACE */}
          {sectionTitle("WORKSPACE")}

          <TooltipProvider delayDuration={collapsed ? 100 : 1000000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard"
                  onClick={closeMobile}
                  className={navLink("/dashboard", isActive("/dashboard"))}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  {!collapsed && <span className="truncate">Dashboard</span>}
                </Link>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Dashboard</TooltipContent>}
            </Tooltip>
          </TooltipProvider>

          <div>
            <TooltipProvider delayDuration={collapsed ? 100 : 1000000}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/boards"
                    onClick={closeMobile}
                    className={cn(navLink("/boards", isActive("/boards")), "relative")}
                  >
                    <KanbanSquare className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">Boards</span>
                        <ChevronRight className={cn(
                          "w-3 h-3 text-muted-foreground transition-transform",
                          isActive("/boards") && "rotate-90"
                        )} />
                      </>
                    )}
                  </Link>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">Boards</TooltipContent>}
              </Tooltip>
            </TooltipProvider>

            {!collapsed && isActive("/boards") && boards.length > 0 && (
              <div className="ml-[22px] mt-0.5 mb-0.5 pl-3 border-l border-border space-y-0.5">
                {boards.map((board) => (
                  <Link
                    key={board.id}
                    href={`/boards/${board.id}`}
                    onClick={() => closeMobile()}
                    className={cn(
                      "flex items-center gap-2 px-2 h-7 rounded-md text-xs transition-colors truncate",
                      pathname === `/boards/${board.id}` || pathname.startsWith(`/boards/${board.id}/`)
                        ? "text-foreground font-medium bg-sidebar-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                    <span className="truncate">{board.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ADMIN */}
          {sectionTitle("ADMIN")}

          <TooltipProvider delayDuration={collapsed ? 100 : 1000000}>
            {[
              { label: "Team", href: "/team", icon: Users },
              { label: "Billing", href: "/settings", icon: CreditCard },
              { label: "Integrations", href: "/admin-bot", icon: Bot },
              { label: "Settings", href: "/settings", icon: Settings },
            ].map((item) => (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={closeMobile}
                    className={navLink(item.href, isActive(item.href))}
                  >
                    <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
              </Tooltip>
            ))}
          </TooltipProvider>
        </nav>

        {/* User Footer */}
        <div className="border-t border-sidebar-border p-2 shrink-0">
          <TooltipProvider delayDuration={collapsed ? 100 : 1000000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  onClick={closeMobile}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md transition-colors",
                    collapsed ? "justify-center h-9 w-10 mx-auto" : "h-8 px-2.5"
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                    {(user.name || user.email || "?").charAt(0).toUpperCase()}
                  </div>
                  {!collapsed && (
                    <span className="text-xs text-muted-foreground truncate">
                      {user.name || user.email || ""}
                    </span>
                  )}
                </Link>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Profile</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </div>
      </aside>
    </>
  )
}
