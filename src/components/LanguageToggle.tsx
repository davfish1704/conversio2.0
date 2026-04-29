"use client"

import { useContext } from "react"
import { LanguageContext } from "@/lib/LanguageContext"

export function LanguageToggle() {
  const { language, setLanguage } = useContext(LanguageContext)

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
      <button
        onClick={() => setLanguage("en")}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
          language === "en"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("de")}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
          language === "de"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        DE
      </button>
    </div>
  )
}
