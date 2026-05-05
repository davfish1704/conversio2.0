"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useContext, useEffect } from "react"
import { LanguageContext } from "@/lib/LanguageContext"

interface Board {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

interface BoardTabsProps {
  board: Board
}

export default function BoardTabs({ board }: BoardTabsProps) {
  const { t } = useContext(LanguageContext)
  const pathname = usePathname()
  const { id } = board

  useEffect(() => {
    localStorage.setItem("crm_last_board_id", id)
  }, [id])

  const tabs = [
    { key: "pipeline", label: t("nav.pipeline") || "Pipeline", href: `/boards/${id}` },
    { key: "brain", label: "BrainLab", href: `/boards/${id}/brain` },
    { key: "flow", label: t("nav.flowBuilder") || "Flow Builder", href: `/boards/${id}/flow` },
    { key: "assets", label: t("assets.title") || "Assets", href: `/boards/${id}/assets` },
    { key: "settings", label: t("nav.settings") || "Settings", href: `/boards/${id}/settings` },
  ]

  const isActive = (href: string) => {
    if (href === `/boards/${id}`) {
      return pathname === href
    }
    return pathname === href
  }

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div className="px-4 sm:px-6">
        {/* Board Name + Status + Tabs in one compact row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 py-3">
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">{board.name}</h1>
            <span
              className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                board.isActive
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {board.isActive ? t("common.active") || "Active" : t("common.inactive") || "Inactive"}
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-0.5">
            {tabs.map((tab) => {
              const active = isActive(tab.href)
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
