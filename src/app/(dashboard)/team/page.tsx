"use client"

import { useEffect, useState, useContext } from "react"
import { LanguageContext } from "@/lib/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

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

const ROLE_LABELS: Record<string, string> = { ADMIN: "Admin", MEMBER: "Mitglied", VIEWER: "Betrachter" }

export default function TeamPage() {
  const { t } = useContext(LanguageContext)
  const { toast } = useToast()
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("MEMBER")
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState("")

  const selectClass = "px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((data) => { setData(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const refresh = () => fetch("/api/team").then(r => r.json()).then(setData)

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
        refresh()
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
      refresh()
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
      refresh()
    } catch {
      toast({ title: "Fehler beim Ändern der Rolle", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!data?.team) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-foreground mb-5">{t("team.title")}</h1>
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Kein Team gefunden. Erstelle zuerst ein Board.</p>
        </div>
      </div>
    )
  }

  const isAdmin = data.myRole === "ADMIN"

  const roleBadgeClass = (role: string) => cn(
    "text-xs px-2 py-0.5 rounded-md font-medium",
    role === "ADMIN" ? "bg-primary/10 text-primary" :
    role === "MEMBER" ? "bg-primary/10 text-primary" :
    "bg-muted text-muted-foreground"
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("team.title")}</h1>
          <p className="text-xs text-muted-foreground mt-1">{data.team.name}</p>
        </div>
        <span className={roleBadgeClass(data.myRole || "MEMBER")}>
          Meine Rolle: {ROLE_LABELS[data.myRole || "MEMBER"] ?? data.myRole}
        </span>
      </div>

      {/* Invite Section */}
      {isAdmin && (
        <div className="bg-card rounded-xl border border-border p-5 mb-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Teammitglied einladen</h2>
          <form onSubmit={handleInvite} className="flex gap-2">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="kollege@firma.de"
              required
              className="flex-1"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className={selectClass}
            >
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Mitglied</option>
              <option value="VIEWER">Betrachter</option>
            </select>
            <Button type="submit" size="sm" disabled={inviting}>
              {inviting ? "…" : "+ Einladen"}
            </Button>
          </form>
          {error && <p className="text-destructive text-xs mt-2">{error}</p>}
          <p className="text-xs text-muted-foreground mt-2">
            Der Nutzer muss bereits ein Konto haben, um eingeladen werden zu können.
          </p>
        </div>
      )}

      {/* Members List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-5">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Mitglieder ({data.members.length})
          </h2>
        </div>

        <div className="divide-y divide-border">
          {data.members.map((member) => (
            <div key={member.id} className="px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium text-sm shrink-0">
                  {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{member.name || "Unbekannt"}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isAdmin && member.userId !== data.members.find(m => m.role === "ADMIN")?.userId ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleChangeRole(member.id, e.target.value)}
                    className="text-xs px-2 py-1 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Mitglied</option>
                    <option value="VIEWER">Betrachter</option>
                  </select>
                ) : (
                  <span className={roleBadgeClass(member.role)}>
                    {ROLE_LABELS[member.role] ?? member.role}
                  </span>
                )}

                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {new Date(member.joinedAt).toLocaleDateString("de-DE")}
                </span>

                {isAdmin && member.userId !== data.members.find(m => m.role === "ADMIN")?.userId && (
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="text-xs text-destructive hover:bg-destructive/10 px-2 py-1 rounded-md transition-colors"
                  >
                    Entfernen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roles explanation */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs font-semibold text-primary mb-1">Admin</h3>
          <p className="text-xs text-muted-foreground">Voller Zugriff. Kann Mitglieder einladen, Rollen ändern und das Team verwalten.</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs font-semibold text-primary mb-1">Mitglied</h3>
          <p className="text-xs text-muted-foreground">Kann Boards erstellen, Leads verwalten und alle Funktionen nutzen.</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-1">Betrachter</h3>
          <p className="text-xs text-muted-foreground">Nur-Lesen-Zugriff. Kann Boards und Reports einsehen, aber nicht bearbeiten.</p>
        </div>
      </div>
    </div>
  )
}
