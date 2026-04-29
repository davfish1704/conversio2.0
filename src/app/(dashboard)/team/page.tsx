"use client"

import { useEffect, useState, useContext } from "react"
import { LanguageContext } from "@/lib/LanguageContext"
import { useToast } from "@/hooks/use-toast"

interface TeamMember {
  id: string
  userId: string
  name: string | null
  email: string
  image: string | null
  role: string
  joinedAt: string
}

interface TeamData {
  team: { id: string; name: string } | null
  members: TeamMember[]
  myRole: string | null
}

export default function TeamPage() {
  const { t } = useContext(LanguageContext)
  const { toast } = useToast()
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("MEMBER")
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    setError("")

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || "Einladung fehlgeschlagen")
      } else {
        setInviteEmail("")
        setInviteRole("MEMBER")
        // Refresh member list
        fetch("/api/team")
          .then((r) => r.json())
          .then((data) => setData(data))
      }
    } catch {
      setError("Netzwerkfehler")
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!confirm("Teammitglied wirklich entfernen?")) return

    try {
      const res = await fetch(`/api/team/members/${memberId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Mitglied entfernt" })
      fetch("/api/team")
        .then((r) => r.json())
        .then((data) => setData(data))
    } catch {
      toast({ title: "Fehler beim Entfernen", variant: "destructive" })
    }
  }

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) throw new Error("Failed")
      
      // Refresh
      fetch("/api/team")
        .then((r) => r.json())
        .then((data) => setData(data))
    } catch {
      toast({ title: "Fehler beim Ändern der Rolle", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data?.team) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-6">{t("team.title")}</h1>
        <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Kein Team gefunden. Erstelle zuerst ein Board.</p>
        </div>
      </div>
    )
  }

  const isAdmin = data.myRole === "ADMIN"
  const roleColors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700",
    MEMBER: "bg-blue-100 text-blue-700",
    VIEWER: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 dark:text-gray-400",
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{t("team.title")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">{data.team.name}</p>
        </div>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${roleColors[data.myRole || "MEMBER"]}`}>
          Meine Rolle: {{ ADMIN: "Admin", MEMBER: "Mitglied", VIEWER: "Betrachter" }[data.myRole || "MEMBER"] ?? data.myRole}
        </span>
      </div>

      {/* Invite Section (nur für Admin/Member) */}
      {isAdmin && (
        <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white mb-4">Teammitglied einladen</h2>
          <form onSubmit={handleInvite} className="flex gap-3">
            <div className="flex-1">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="kollege@firma.de"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {inviting ? "Einladen..." : "+ Einladen"}
            </button>
          </form>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          <p className="text-xs text-gray-400 mt-2">
            Der Nutzer muss bereits ein Konto haben, um eingeladen werden zu können.
          </p>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
            Mitglieder ({data.members.length})
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.members.map((member) => (
            <div key={member.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-medium">
                  {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white dark:text-white">{member.name || "Unbekannt"}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{member.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {isAdmin && member.userId !== data.members.find(m => m.role === "ADMIN")?.userId ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleChangeRole(member.id, e.target.value)}
                    className={`text-sm px-2 py-1 rounded-full border-0 font-medium ${roleColors[member.role]}`}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                ) : (
                  <span className={`text-sm px-2 py-1 rounded-full font-medium ${roleColors[member.role]}`}>
                    {member.role}
                  </span>
                )}
                
                <span className="text-xs text-gray-400">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </span>
                
                {isAdmin && member.userId !== data.members.find(m => m.role === "ADMIN")?.userId && (
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="text-red-600 hover:text-red-700 text-sm px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    Entfernen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rollen Erklärung */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 dark:border-gray-700 p-4">
          <h3 className="font-medium text-purple-700 mb-1">Admin</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">Voller Zugriff. Kann Mitglieder einladen, Rollen ändern und das Team verwalten.</p>
        </div>
        <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 dark:border-gray-700 p-4">
          <h3 className="font-medium text-blue-700 mb-1">Member</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">Kann Boards erstellen, Leads verwalten und alle Funktionen nutzen.</p>
        </div>
        <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 dark:border-gray-700 p-4">
          <h3 className="font-medium text-gray-600 dark:text-gray-300 dark:text-gray-400 mb-1">Viewer</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">Nur-Lesen-Zugriff. Kann Boards und Reports einsehen, aber nicht bearbeiten.</p>
        </div>
      </div>
    </div>
  )
}
