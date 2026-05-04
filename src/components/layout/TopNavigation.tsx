"use client"

import { useState, useRef, useEffect, useContext } from "react"
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
  Zap,
  Menu,
  X,
  PenTool,
  Sun,
  Moon,
} from "lucide-react"
import UserMenu from "./UserMenu"
import { LanguageContext } from "@/lib/LanguageContext"
import { useTheme } from "@/lib/ThemeContext"
import { FEATURES } from "@/lib/features"

interface TopNavigationProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

const ICONS: Record<string, React.ReactNode> = {
  Dashboard: <LayoutDashboard className="w-4 h-4" />,
  CRM: <KanbanSquare className="w-4 h-4" />,
  Reports: <BarChart3 className="w-4 h-4" />,
  "Admin Bot": <Bot className="w-4 h-4" />,
  Team: <Users className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
  Builder: <PenTool className="w-4 h-4" />,
}

export default function TopNavigation({ user }: TopNavigationProps) {
  const { t } = useContext(LanguageContext)
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const [crmOpen, setCrmOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const crmRef = useRef<HTMLDivElement>(null)
  const [lastBoardId, setLastBoardId] = useState<string | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (crmRef.current && !crmRef.current.contains(e.target as Node)) {
        setCrmOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem("crm_last_board_id")
    setLastBoardId(saved)
  }, [pathname])

  const getBoardSubLink = (subPath: string) => {
    if (lastBoardId) return `/boards/${lastBoardId}${subPath}`
    return "/dashboard"
  }

  const navItems = [
    { label: t("nav.dashboard") || "Dashboard", href: "/dashboard", icon: "Dashboard" },
    {
      label: t("nav.crm") || "CRM",
      href: "/crm",
      icon: "CRM",
      children: [
        { label: t("nav.pipeline") || "Pipeline", href: getBoardSubLink("") },
        { label: t("nav.flowBuilder") || "Flow Builder", href: getBoardSubLink("/flow") },
        { label: t("nav.boardSettings") || "Board Settings", href: getBoardSubLink("/settings") },
      ],
    },
    { label: t("nav.reports") || "Reports", href: "/reports", icon: "Reports" },
    ...(FEATURES.builder ? [{ label: "Builder", href: "/builder", icon: "Builder" }] : []),
    { label: t("nav.adminBot") || "Admin Bot", href: "/admin-bot", icon: "Admin Bot" },
    { label: t("nav.team") || "Team", href: "/team", icon: "Team" },
    { label: t("nav.settings") || "Settings", href: "/settings", icon: "Settings" },
  ]

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    if (href === "/crm") return pathname.startsWith("/boards/") || pathname === "/crm"
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block tracking-tight">
              Conversio
            </span>
          </Link>

          {/* Main Nav - Desktop */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              if (item.children) {
                return (
                  <div key={item.label} className="relative" ref={crmRef}>
                    <button
                      onClick={() => setCrmOpen(!crmOpen)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition ${
                        isActive(item.href)
                          ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {ICONS[item.icon || ""]}
                      {item.label}
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${crmOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {crmOpen && (
                      <div className="absolute left-0 top-11 w-52 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg py-1.5 z-50">
                        {item.children.map((child) => (
                          <Link
                            key={child.label}
                            href={child.href}
                            onClick={() => setCrmOpen(false)}
                            className={`block px-4 py-2.5 text-sm transition ${
                              pathname === child.href || pathname.startsWith(child.href)
                                ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 font-medium"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            }`}
                          >
                            {child.label}
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
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition ${
                    isActive(item.href)
                      ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {ICONS[item.icon || ""]}
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* User Menu */}
            <div className="hidden md:block">
              <UserMenu user={user} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-black transition-colors">
          <nav className="flex flex-col px-4 py-2 gap-0.5">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition ${
                  isActive(item.href)
                    ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {ICONS[item.icon || ""]}
                {item.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-1">
              <UserMenu user={user} />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
