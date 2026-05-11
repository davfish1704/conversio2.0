"use client"

import { useState, useEffect, useContext } from "react"
import { useTheme } from "@/lib/ThemeContext"
import { LanguageContext } from "@/lib/LanguageContext"
import { Settings, Palette, Sun, Moon, Globe, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general")
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, t } = useContext(LanguageContext)

  const tabs = [
    { id: "general", label: t("settings.tabGeneral"), icon: Settings },
    { id: "profil", label: t("settings.tabProfile"), icon: User },
    { id: "appearance", label: t("settings.tabAppearance"), icon: Palette },
  ]

  const tabTitles: Record<string, string> = {
    general: t("settings.titleGeneral"),
    profil: t("settings.titleProfile"),
    appearance: t("settings.titleAppearance"),
  }

  const [profileName, setProfileName] = useState("")
  const [profileEmail, setProfileEmail] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState("")
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState("")

  useEffect(() => {
    if (activeTab === "profil") {
      fetch("/api/user").then(r => r.json()).then(data => {
        setProfileName(data.name || "")
        setProfileEmail(data.email || "")
      })
    }
  }, [activeTab])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg("")
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: profileName, email: profileEmail }),
    })
    setProfileSaving(false)
    setProfileMsg(res.ok ? t("settings.savedOk") : t("settings.saveError"))
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPw !== confirmPw) { setPwMsg(t("settings.passwordMismatch")); return }
    setPwSaving(true)
    setPwMsg("")
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    })
    const data = await res.json()
    setPwSaving(false)
    if (res.ok) { setPwMsg(t("settings.passwordChanged")); setCurrentPw(""); setNewPw(""); setConfirmPw("") }
    else setPwMsg(data.error || t("settings.saveError"))
  }

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-3 text-foreground">{t("settings.language")}</h3>
              <div className="flex gap-2">
                {(["en", "de"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                      language === lang
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-muted"
                    )}
                  >
                    <Globe className="w-4 h-4" />
                    {lang === "en" ? "English" : "Deutsch"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t("settings.autoSaved")}
              </p>
            </div>
          </div>
        )

      case "profil":
        return (
          <div className="space-y-8 max-w-lg">
            <form onSubmit={saveProfile} className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">{t("settings.accountData")}</h3>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t("common.name")}</label>
                <Input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t("common.email")}</label>
                <Input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} />
              </div>
              {profileMsg && (
                <p className={cn(
                  "text-xs",
                  profileMsg === t("settings.savedOk") ? "text-success" : "text-destructive"
                )}>
                  {profileMsg}
                </p>
              )}
              <Button type="submit" size="sm" disabled={profileSaving}>
                {profileSaving ? t("common.saving") : t("settings.saveBtn")}
              </Button>
            </form>

            <div className="border-t border-border" />

            <form onSubmit={savePassword} className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">{t("settings.changePassword")}</h3>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t("settings.currentPassword")}</label>
                <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t("settings.newPassword")}</label>
                <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t("settings.confirmNewPassword")}</label>
                <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" />
              </div>
              {pwMsg && (
                <p className={cn(
                  "text-xs",
                  pwMsg === t("settings.passwordChanged") ? "text-success" : "text-destructive"
                )}>
                  {pwMsg}
                </p>
              )}
              <Button type="submit" size="sm" disabled={pwSaving || !currentPw || !newPw || !confirmPw}>
                {pwSaving ? t("common.saving") : t("settings.changePassword")}
              </Button>
            </form>
          </div>
        )

      case "appearance":
        return (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">{t("settings.darkModeTitle")}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t("settings.darkModeDesc")}</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    theme === "dark" ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    theme === "dark" ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>
              <div className="mt-5 flex gap-3">
                <div className={cn(
                  "flex-1 p-4 rounded-lg border-2 transition-colors cursor-pointer",
                  theme === "light" ? "border-primary bg-primary/5" : "border-border"
                )}
                  onClick={() => theme === "dark" && toggleTheme()}
                >
                  <Sun className="w-5 h-5 mb-2 text-amber-500" />
                  <p className="text-sm font-medium text-foreground">{t("settings.lightTheme")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("settings.lightThemeDefault")}</p>
                </div>
                <div className={cn(
                  "flex-1 p-4 rounded-lg border-2 transition-colors cursor-pointer",
                  theme === "dark" ? "border-primary bg-primary/5" : "border-border"
                )}
                  onClick={() => theme === "light" && toggleTheme()}
                >
                  <Moon className="w-5 h-5 mb-2 text-primary" />
                  <p className="text-sm font-medium text-foreground">{t("settings.darkTheme")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("settings.darkThemeEasy")}</p>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return <div className="text-center py-12 text-muted-foreground">{t("common.comingSoon")}</div>
    }
  }

  return (
    <div className="flex gap-8">
      <div className="w-52 shrink-0">
        <h1 className="text-lg font-semibold mb-5 text-foreground">{t("settings.title")}</h1>
        <nav className="space-y-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex-1">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-base font-semibold mb-5 text-foreground">{tabTitles[activeTab] ?? activeTab}</h2>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
