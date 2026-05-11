"use client"

import { useState, useEffect, useContext, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  KanbanSquare,
  BarChart3,
  Bot,
  Users,
  Settings,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Zap,
  Coins,
  PenTool,
} from "lucide-react"
import { LanguageContext } from "@/lib/LanguageContext"
import { useTheme } from "@/lib/ThemeContext"
import { FEATURES } from "@/lib/features"
import { useSidebar } from "@/lib/SidebarContext"
import { cn } from "@/lib/utils"

interface Board { id: string; name: string; isActive: boolean }

interface NavItemDef {
  label: string
  href: string
  icon: React.ElementType
  isCrm?: boolean
  badge?: number
}

export default function SidebarNavigation({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null }
}) {
  const { t } = useContext(LanguageContext)
  const { theme, toggleTheme } = useTheme()
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar()
  const pathname = usePathname()

  const [crmOpen, setCrmOpen] = useState(false)
  const [boards, setBoards] = useState<Board[]>([])
  const [lastBoardId, setLastBoardId] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("crm_last_board_id")
    setLastBoardId(saved)
  }, [pathname])

  useEffect(() => {
    if (crmOpen && boards.length === 0) {
      fetch("/api/boards")
        .then((r) => r.json())
        .then((d) => setBoards((d.boards || []).filter((b: Board) => b.isActive)))
        .catch(() => {})
    }
  }, [crmOpen, boards.length])

  const closeMobile = useCallback(() => setMobileOpen(false), [setMobileOpen])

  const isCrmActive = pathname.startsWith("/boards/") || pathname === "/crm"

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    if (href === "/crm") return isCrmActive
    return pathname === href || pathname.startsWith(href + "/")
  }

  const mainNav: NavItemDef[] = [
    { label: t("nav.dashboard") || "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: t("nav.crm") || "CRM", href: "/crm", icon: KanbanSquare, isCrm: true },
    { label: t("nav.reports") || "Berichte", href: "/reports", icon: BarChart3 },
    ...(FEATURES.builder ? [{ label: t("sidebar.builder") || "Builder", href: "/builder", icon: PenTool }] : []),
  ]

  const adminNav: NavItemDef[] = [
    { label: t("nav.adminBot") || "Admin Bot", href: "/admin-bot", icon: Bot },
    { label: t("sidebar.tokenUsage"), href: "/admin-usage", icon: Coins },
    { label: t("nav.team") || "Team", href: "/team", icon: Users },
  ]

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center gap-2.5 px-2.5 rounded-md text-sm transition-colors h-8 w-full",
      active
        ? "bg-sidebar-accent text-foreground font-medium"
        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
    )

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
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
        {/* Header */}
        <div className="h-12 flex items-center px-3 border-b border-sidebar-border shrink-0 gap-2">
          <Link
            href="/dashboard"
            onClick={closeMobile}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold text-foreground tracking-tight truncate">
                Conversio
              </span>
            )}
          </Link>

          {!collapsed ? (
            <button
              onClick={toggleCollapsed}
              className="hidden md:flex ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              aria-label={t("sidebar.toggleSidebar")}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={toggleCollapsed}
              className="hidden md:flex ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              aria-label={t("sidebar.toggleSidebar")}
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {/* Main items */}
          {mainNav.map((item) => {
            if (item.isCrm) {
              return (
                <div key={item.href}>
                  <button
                    onClick={() => {
                      setCrmOpen((o) => !o)
                    }}
                    className={linkClass(isCrmActive)}
                  >
                    <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronRight
                          className={cn(
                            "w-3.5 h-3.5 transition-transform duration-150 text-muted-foreground",
                            crmOpen && "rotate-90"
                          )}
                        />
                      </>
                    )}
                  </button>

                  {crmOpen && !collapsed && (
                    <div className="ml-[22px] mt-0.5 mb-0.5 pl-3 border-l border-border space-y-0.5 animate-slide-down">
                      {boards.length === 0 && (
                        <p className="px-2 py-1 text-xs text-muted-foreground">
                          {t("sidebar.noBoard")}
                        </p>
                      )}
                      {boards.map((board) => (
                        <Link
                          key={board.id}
                          href={`/boards/${board.id}`}
                          onClick={() => {
                            localStorage.setItem("crm_last_board_id", board.id)
                            closeMobile()
                          }}
                          className={cn(
                            "flex items-center gap-2 px-2 h-7 rounded-md text-xs transition-colors truncate",
                            pathname === `/boards/${board.id}`
                              ? "text-foreground font-medium bg-sidebar-accent"
                              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          <span className="truncate">{board.name}</span>
                        </Link>
                      ))}
                      {lastBoardId && (
                        <Link
                          href={`/boards/${lastBoardId}/settings`}
                          onClick={closeMobile}
                          className={cn(
                            "flex items-center gap-2 px-2 h-7 rounded-md text-xs transition-colors",
                            pathname.endsWith("/settings") && pathname.includes("/boards/")
                              ? "text-foreground font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          <Settings className="w-3 h-3 shrink-0" />
                          <span>{t("sidebar.settings")}</span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={linkClass(isActive(item.href))}
              >
                <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}

          {/* Admin divider */}
          <div className="py-1.5">
            <div className="border-t border-border" />
          </div>

          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              className={linkClass(isActive(item.href))}
            >
              <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-sidebar-border p-2 space-y-0.5 shrink-0">
          <Link
            href="/settings"
            onClick={closeMobile}
            className={linkClass(isActive("/settings"))}
          >
            <Settings className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            {!collapsed && <span>{t("sidebar.settings")}</span>}
          </Link>

          <button
            onClick={toggleTheme}
            className={linkClass(false)}
            aria-label={t("sidebar.toggleTheme")}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            ) : (
              <Moon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            )}
            {!collapsed && (
              <span>{theme === "dark" ? t("sidebar.lightTheme") : t("sidebar.darkTheme")}</span>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
