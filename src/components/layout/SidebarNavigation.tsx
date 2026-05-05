"use client"

import { useState, useRef, useEffect, useContext, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  KanbanSquare,
  BarChart3,
  Bot,
  Users,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  PenTool,
  Sun,
  Moon,
  LogOut,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { LanguageContext } from "@/lib/LanguageContext"
import { useTheme } from "@/lib/ThemeContext"
import { FEATURES } from "@/lib/features"
import { useSidebar } from "@/lib/SidebarContext"

interface SidebarNavigationProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

interface Board {
  id: string
  name: string
  isActive: boolean
}

export default function SidebarNavigation({ user }: SidebarNavigationProps) {
  const { t } = useContext(LanguageContext)
  const { theme, toggleTheme } = useTheme()
  const { collapsed, toggleCollapsed } = useSidebar()
  const pathname = usePathname()
  const [crmOpen, setCrmOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [boards, setBoards] = useState<Board[]>([])
  const [lastBoardId, setLastBoardId] = useState<string | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const crmRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (crmRef.current && !crmRef.current.contains(e.target as Node)) {
        setCrmOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem("crm_last_board_id")
    setLastBoardId(saved)
  }, [pathname])

  useEffect(() => {
    if (crmOpen) {
      fetch("/api/boards")
        .then((r) => r.json())
        .then((data) => setBoards(data.boards || []))
        .catch(() => {})
    }
  }, [crmOpen])

  const navItems = [
    { label: t("nav.dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { label: t("nav.crm"), href: "/crm", icon: KanbanSquare, isCrm: true },
    { label: t("nav.reports"), href: "/reports", icon: BarChart3 },
    ...(FEATURES.builder ? [{ label: "Builder", href: "/builder", icon: PenTool }] : []),
    { label: t("nav.adminBot"), href: "/admin-bot", icon: Bot },
    { label: t("nav.team"), href: "/team", icon: Users },
    { label: t("nav.settings"), href: "/settings", icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    if (href === "/crm") return pathname.startsWith("/boards/") || pathname === "/crm"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Mobile Toggle */}
      <button
        className="fixed top-3 left-3 z-50 md:hidden p-2 rounded-lg bg-white dark:bg-gray-900 shadow border border-gray-200 dark:border-gray-700"
        onClick={() => setMobileOpen(true)}
      >
        <KanbanSquare className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
          ${collapsed ? "w-16" : "w-60"}
        `}
      >
        {/* Logo + Collapse Toggle */}
        <div className="flex items-center h-14 px-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0" onClick={closeMobile}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                Conversio
              </span>
            )}
          </Link>

          {/* Collapse Toggle - Desktop */}
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex ml-auto p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition text-gray-500"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            if (item.isCrm) {
              return (
                <div key={item.label} className="relative" ref={crmRef}>
                  <button
                    onClick={() => { setCrmOpen(!crmOpen); closeMobile() }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition ${
                      isActive("/crm")
                        ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${crmOpen ? "rotate-180" : ""}`}
                        />
                      </>
                    )}
                  </button>

                  {crmOpen && !collapsed && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 dark:border-gray-700 pl-3">
                      {lastBoardId ? (
                        <Link
                          href={`/boards/${lastBoardId}`}
                          onClick={closeMobile}
                          className={`block px-3 py-2 text-xs rounded-lg transition ${
                            pathname === `/boards/${lastBoardId}`
                              ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 font-medium"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          Pipeline
                        </Link>
                      ) : (
                        <p className="px-3 py-2 text-xs text-gray-400">Kein Board ausgewählt</p>
                      )}
                      {boards.filter(b => b.isActive).slice(0, 5).map((board) => (
                        <Link
                          key={board.id}
                          href={`/boards/${board.id}`}
                          onClick={() => {
                            localStorage.setItem("crm_last_board_id", board.id)
                            closeMobile()
                          }}
                          className={`block px-3 py-2 text-xs rounded-lg transition ${
                            pathname === `/boards/${board.id}`
                              ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 font-medium"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          {board.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeMobile}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition ${
                  isActive(item.href)
                    ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Section: Theme Toggle + User */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-2 shrink-0 space-y-1">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
            {!collapsed && <span>{theme === "dark" ? "Light" : "Dark"}</span>}
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition"
            >
              {user.image ? (
                <img src={user.image} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              )}
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-2 right-2 mb-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg py-2 z-50">
                <Link
                  href="/settings"
                  onClick={() => { setUserMenuOpen(false); closeMobile() }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <Settings className="w-4 h-4" />
                  {!collapsed ? t("nav.settings") : ""}
                </Link>
                <button
                  onClick={() => { signOut({ callbackUrl: "/login" }); closeMobile() }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <LogOut className="w-4 h-4" />
                  {!collapsed ? t("nav.signOut") || "Abmelden" : ""}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
