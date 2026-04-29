"use client"

import { createContext, useState, useEffect, useCallback } from "react"
import { translations } from "./translations"

type Language = "en" | "de"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

export const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  // Lade Sprache aus DB oder localStorage
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        // Versuche aus DB zu laden
        const res = await fetch("/api/user")
        if (res.ok) {
          const user = await res.json()
          if (user.language && (user.language === "en" || user.language === "de")) {
            setLanguageState(user.language)
            localStorage.setItem("preferred-language", user.language)
            return
          }
        }
      } catch {
        // Fallback zu localStorage
      }
      
      // Fallback: localStorage
      const saved = localStorage.getItem("preferred-language") as Language | null
      if (saved && (saved === "en" || saved === "de")) {
        setLanguageState(saved)
      }
    }
    
    loadLanguage()
  }, [])

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("preferred-language", lang)
    
    // Speichere in DB
    try {
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      })
    } catch {
      // Silent fail - localStorage hat es schon
    }
  }, [])

  const t = useCallback(
    (key: string) => {
      const keys = key.split(".")
      let value: any = translations[language]
      for (const k of keys) {
        value = value?.[k]
      }
      return value || key
    },
    [language]
  )

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}
