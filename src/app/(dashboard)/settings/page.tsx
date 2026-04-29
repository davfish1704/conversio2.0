"use client"

import { useState, useEffect, useContext } from "react"
import { useTheme } from "@/lib/ThemeContext"
import { LanguageContext } from "@/lib/LanguageContext"
import { Settings, Palette, Sun, Moon, Globe, User, MessageCircle } from "lucide-react"

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  PAUSED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  ERROR: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

function InputField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        {...props}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general")
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, t } = useContext(LanguageContext)

  const STATUS_LABEL: Record<string, string> = {
    ACTIVE: t("settings.statusActive"),
    PENDING: t("settings.statusPending"),
    PAUSED: t("settings.statusPaused"),
    ERROR: t("settings.statusError"),
  }

  const tabs = [
    { id: "general", label: t("settings.tabGeneral"), icon: Settings },
    { id: "profil", label: t("settings.tabProfile"), icon: User },
    { id: "whatsapp", label: t("settings.tabWhatsApp"), icon: MessageCircle },
    { id: "appearance", label: t("settings.tabAppearance"), icon: Palette },
  ]

  const tabTitles: Record<string, string> = {
    general: t("settings.titleGeneral"),
    profil: t("settings.titleProfile"),
    whatsapp: t("settings.titleWhatsApp"),
    appearance: t("settings.titleAppearance"),
  }

  // Profil state
  const [profileName, setProfileName] = useState("")
  const [profileEmail, setProfileEmail] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState("")
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState("")

  // WhatsApp state
  const [waAccount, setWaAccount] = useState<any>(null)
  const [waLoading, setWaLoading] = useState(false)
  const [waEditing, setWaEditing] = useState(false)
  const [waPhone, setWaPhone] = useState("")
  const [waToken, setWaToken] = useState("")
  const [waSaving, setWaSaving] = useState(false)
  const [waMsg, setWaMsg] = useState("")

  useEffect(() => {
    if (activeTab === "profil") {
      fetch("/api/user").then(r => r.json()).then(data => {
        setProfileName(data.name || "")
        setProfileEmail(data.email || "")
      })
    }
    if (activeTab === "whatsapp") {
      setWaLoading(true)
      fetch("/api/whatsapp/account").then(r => r.json()).then(data => {
        setWaAccount(data || null)
        setWaLoading(false)
      }).catch(() => setWaLoading(false))
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

  const connectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault()
    setWaSaving(true)
    setWaMsg("")
    const res = await fetch("/api/whatsapp/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: waPhone, accessToken: waToken }),
    })
    const data = await res.json()
    setWaSaving(false)
    if (res.ok) {
      const updated = await fetch("/api/whatsapp/account").then(r => r.json())
      setWaAccount(updated)
      setWaPhone(""); setWaToken("")
    } else {
      setWaMsg(data.error || t("settings.waSaveError"))
    }
  }

  const saveWaEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setWaSaving(true)
    setWaMsg("")
    const res = await fetch("/api/whatsapp/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: waPhone, accessToken: waToken || undefined }),
    })
    const data = await res.json()
    setWaSaving(false)
    if (res.ok) { setWaAccount(data); setWaEditing(false); setWaPhone(""); setWaToken("") }
    else setWaMsg(data.error || t("settings.waSaveError"))
  }

  const disconnectWa = async () => {
    await fetch("/api/whatsapp/disconnect", { method: "POST" })
    setWaAccount(null)
  }

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium mb-3 text-gray-900 dark:text-white">{t("settings.language")}</h3>
              <div className="flex gap-3">
                {(["en", "de"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                      language === lang
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                        : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    {lang === "en" ? "English" : "Deutsch"}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {t("settings.autoSaved")}
              </p>
            </div>
          </div>
        )

      case "profil":
        return (
          <div className="space-y-8 max-w-lg">
            <form onSubmit={saveProfile} className="space-y-4">
              <h3 className="text-base font-medium text-gray-900 dark:text-white">{t("settings.accountData")}</h3>
              <InputField label={t("common.name")} type="text" value={profileName} onChange={e => setProfileName(e.target.value)} />
              <InputField label={t("common.email")} type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} />
              {profileMsg && (
                <p className={`text-sm ${profileMsg === t("settings.savedOk") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {profileMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={profileSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {profileSaving ? t("common.saving") : t("settings.saveBtn")}
              </button>
            </form>

            <div className="border-t border-gray-100 dark:border-gray-700" />

            <form onSubmit={savePassword} className="space-y-4">
              <h3 className="text-base font-medium text-gray-900 dark:text-white">{t("settings.changePassword")}</h3>
              <InputField label={t("settings.currentPassword")} type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" />
              <InputField label={t("settings.newPassword")} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" />
              <InputField label={t("settings.confirmNewPassword")} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" />
              {pwMsg && (
                <p className={`text-sm ${pwMsg === t("settings.passwordChanged") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {pwMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {pwSaving ? t("common.saving") : t("settings.changePassword")}
              </button>
            </form>
          </div>
        )

      case "whatsapp":
        if (waLoading) {
          return <div className="text-gray-500 dark:text-gray-400 text-sm">{t("settings.waLoading")}</div>
        }
        return (
          <div className="max-w-lg space-y-6">
            {waAccount ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                {waEditing ? (
                  <form onSubmit={saveWaEdit} className="space-y-4">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">{t("settings.waEditNumber")}</h3>
                    {waMsg && <p className="text-sm text-red-600 dark:text-red-400">{waMsg}</p>}
                    <InputField label="Phone Number ID" type="text" value={waPhone} onChange={e => setWaPhone(e.target.value)} required />
                    <InputField
                      label={t("settings.waAccessTokenHint")}
                      type="password"
                      value={waToken}
                      onChange={e => setWaToken(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button type="submit" disabled={waSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                        {waSaving ? t("settings.waSaving") : t("settings.saveBtn")}
                      </button>
                      <button type="button" onClick={() => { setWaEditing(false); setWaMsg("") }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium">
                        {t("settings.waCancelBtn")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-medium text-gray-900 dark:text-white">{t("settings.waConnectedAccount")}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("settings.waPhonePrefix")} {waAccount.phoneNumber}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_BADGE[waAccount.status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                        {STATUS_LABEL[waAccount.status] ?? waAccount.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setWaPhone(waAccount.phoneNumber); setWaToken(""); setWaMsg(""); setWaEditing(true) }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium"
                      >
                        {t("settings.waEditNumber")}
                      </button>
                      <button
                        onClick={disconnectWa}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                      >
                        {t("settings.waDisconnect")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">{t("settings.waConnectTitle")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("settings.waConnectDesc")}</p>
                {waMsg && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{waMsg}</p>}
                <form onSubmit={connectWhatsApp} className="space-y-4">
                  <InputField label="Phone Number ID" type="text" value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder="123456789" required />
                  <InputField label="Access Token" type="password" value={waToken} onChange={e => setWaToken(e.target.value)} placeholder="EAA..." required />
                  <button type="submit" disabled={waSaving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
                    {waSaving ? t("settings.waConnecting") : t("settings.waConnectBtn")}
                  </button>
                </form>
              </div>
            )}
          </div>
        )

      case "appearance":
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">{t("settings.darkModeTitle")}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("settings.darkModeDesc")}</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    theme === "dark" ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <div className="mt-6 flex gap-4">
                <div className={`flex-1 p-4 rounded-lg border-2 transition ${theme === "light" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700"}`}>
                  <Sun className="w-6 h-6 mb-2 text-amber-500" />
                  <p className="font-medium text-gray-900 dark:text-white">{t("settings.lightTheme")}</p>
                  <p className="text-xs text-gray-500">{t("settings.lightThemeDefault")}</p>
                </div>
                <div className={`flex-1 p-4 rounded-lg border-2 transition ${theme === "dark" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700"}`}>
                  <Moon className="w-6 h-6 mb-2 text-blue-400" />
                  <p className="font-medium text-gray-900 dark:text-white">{t("settings.darkTheme")}</p>
                  <p className="text-xs text-gray-500">{t("settings.darkThemeEasy")}</p>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return <div className="text-center py-12 text-gray-500 dark:text-gray-400">{t("common.comingSoon")}</div>
    }
  }

  return (
    <div className="flex gap-8">
      <div className="w-56 shrink-0">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t("settings.title")}</h1>
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex-1">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">{tabTitles[activeTab] ?? activeTab}</h2>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
