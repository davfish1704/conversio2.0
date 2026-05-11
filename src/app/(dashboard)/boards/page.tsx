"use client"

import { useEffect, useContext } from "react"
import { useRouter } from "next/navigation"
import { LanguageContext } from "@/lib/LanguageContext"

export default function BoardsRedirectPage() {
  const { t } = useContext(LanguageContext)
  const router = useRouter()
  useEffect(() => {
    router.replace("/crm")
  }, [router])
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground text-sm">{t("common.redirecting")}</div>
    </div>
  )
}
