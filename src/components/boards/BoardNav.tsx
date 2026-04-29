"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

const tabs = [
  { key: "pipeline", label: "Pipeline", path: "" },
  { key: "brain", label: "BrainLab", path: "/brain" },
  { key: "flow", label: "Flow Builder", path: "/flow" },
  { key: "assets", label: "Assets", path: "/assets" },
  { key: "settings", label: "Settings", path: "/settings" },
]

export default function BoardNav() {
  const { id } = useParams() as { id: string }
  const pathname = usePathname()

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
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
