"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useContext, useEffect } from "react"
import { LanguageContext } from "@/lib/LanguageContext"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Board {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

export default function BoardTabs({ board }: { board: Board }) {
  const { t } = useContext(LanguageContext)
  const pathname = usePathname()
  const { id } = board

  useEffect(() => {
    localStorage.setItem("crm_last_board_id", id)
  }, [id])

  const tabs = [
    { key: "pipeline", label: t("boardTabs.pipeline"), href: `/boards/${id}` },
    { key: "brain",    label: t("boardTabs.brainLab"),  href: `/boards/${id}/brain` },
    { key: "flow",     label: t("boardTabs.flowBuilder"), href: `/boards/${id}/flow` },
    { key: "assets",   label: t("boardTabs.assets"), href: `/boards/${id}/assets` },
    { key: "usage",    label: t("boardTabs.tokenUsage"), href: `/boards/${id}/usage` },
    { key: "settings", label: t("boardTabs.settings"), href: `/boards/${id}/settings` },
    { key: "access",   label: t("boardTabs.access"), href: `/boards/${id}/settings/access` },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <div className="bg-background border-b border-border shrink-0">
      <div className="px-4 sm:px-6 flex items-center gap-4">
        {/* Board name + status */}
        <div className="flex items-center gap-2 py-3 shrink-0">
          <span className="text-sm font-semibold text-foreground">{board.name}</span>
          <Badge variant={board.isActive ? "success" : "muted"}>
            {board.isActive ? t("boardStatus.active") : t("boardStatus.inactive")}
          </Badge>
        </div>

        {/* Tab nav */}
        <nav className="flex items-center overflow-x-auto scrollbar-none flex-1">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={cn(
                "px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors",
                isActive(tab.href)
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
