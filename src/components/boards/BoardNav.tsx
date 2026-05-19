"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { setBreadcrumb } from "@/lib/breadcrumb-store"

const tabs = [
  { key: "pipeline", label: "Pipeline", path: "" },
  { key: "brain", label: "BrainLab", path: "/brain" },
  { key: "flow", label: "Flow Builder", path: "/flow" },
  { key: "assets", label: "Assets", path: "/assets" },
  { key: "insights", label: "Insights", path: "/insights" },
  { key: "usage", label: "Usage", path: "/usage" },
  { key: "settings", label: "Settings", path: "/settings" },
]

export default function BoardNav() {
  const { id } = useParams() as { id: string }
  const pathname = usePathname()
  const [boardName, setBoardName] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const name = data.board?.name ?? data.name
        if (name) setBoardName(name)
      })
      .catch(() => {})
  }, [id])

  useEffect(() => { if (boardName) setBreadcrumb(id, boardName) }, [id, boardName])

  return (
    <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
      {tabs.map((tab) => {
        const href = `/boards/${id}${tab.path}`
        const isActive = pathname === href || (tab.path !== "" && pathname.startsWith(href))
        
        return (
          <Link
            key={tab.key}
            href={href}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
