"use client"

import { useEffect, useState, useContext } from "react"
import { useParams } from "next/navigation"
import BoardSkeleton from "@/components/boards/BoardSkeleton"
import BoardTabs from "@/components/boards/BoardTabs"
import { LanguageContext } from "@/lib/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Shield, UserPlus, Search, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface BoardMember {
  id: string
  role: string
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface Board {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

interface SearchUser {
  id: string
  name: string | null
  email: string
}

const ROLE_BADGES: Record<string, { label: string; className: string }> = {
  ADMIN: { label: "Admin", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  AGENT: { label: "Agent", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  VIEWER: { label: "Viewer", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
}

export default function BoardAccessPage() {
  const { id } = useParams() as { id: string }
  const { t } = useContext(LanguageContext)
  const { toast } = useToast()

  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<BoardMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null)
  const [newRole, setNewRole] = useState("AGENT")
  const [adding, setAdding] = useState(false)

  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const b = data.board || data
        setBoard(b)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    loadMembers()
  }, [id])

  const loadMembers = () => {
    setLoadingMembers(true)
    fetch(`/api/boards/${id}/members`)
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members || [])
        setLoadingMembers(false)
      })
      .catch(() => setLoadingMembers(false))
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setSearchResults(data.users || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleAddMember = async () => {
    if (!selectedUser) return
    setAdding(true)
    try {
      const res = await fetch(`/api/boards/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast({ title: data.error || "Failed to add member", variant: "destructive" })
        return
      }
      toast({ title: "Member added" })
      setShowAdd(false)
      setSelectedUser(null)
      setSearchQuery("")
      setSearchResults([])
      loadMembers()
    } catch {
      toast({ title: "Failed to add member", variant: "destructive" })
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    setRemoving(true)
    try {
      const res = await fetch(`/api/boards/${id}/members/${memberId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        toast({ title: data.error || "Failed to remove member", variant: "destructive" })
        return
      }
      toast({ title: "Member removed" })
      setConfirmRemove(null)
      loadMembers()
    } catch {
      toast({ title: "Failed to remove member", variant: "destructive" })
    } finally {
      setRemoving(false)
    }
  }

  if (loading) return <BoardSkeleton />

  return (
    <div>
      <BoardTabs board={board!} />

      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Access Management
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage who has access to this board
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add Member
          </Button>
        </div>

        {loadingMembers ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <Shield className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-foreground mb-1">No members yet</h3>
            <p className="text-xs text-muted-foreground mb-4">Invite the first member to this board</p>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <UserPlus className="w-4 h-4 mr-1.5" />
              Invite first member
            </Button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Added</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const badge = ROLE_BADGES[member.role] || ROLE_BADGES.VIEWER
                  return (
                    <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-foreground shrink-0 overflow-hidden">
                            {member.user.image ? (
                              <img src={member.user.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (member.user.name || member.user.email)[0].toUpperCase()
                            )}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {member.user.name || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{member.user.email}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", badge.className)}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setConfirmRemove(member.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Add Member</h3>
              <button
                onClick={() => { setShowAdd(false); setSelectedUser(null); setSearchQuery(""); setSearchResults([]) }}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search users by name or email..."
                className="pl-9"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => { setSelectedUser(user); setSearchQuery(user.name || user.email); setSearchResults([]) }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors text-sm",
                      selectedUser?.id === user.id ? "bg-muted" : ""
                    )}
                  >
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium shrink-0">
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{user.name || "Unknown"}</div>
                      <div className="text-[10px] text-muted-foreground">{user.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                  {(selectedUser.name || selectedUser.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{selectedUser.name || "Unknown"}</div>
                  <div className="text-[10px] text-muted-foreground">{selectedUser.email}</div>
                </div>
                <button
                  onClick={() => { setSelectedUser(null); setSearchQuery("") }}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>

            <Button
              className="w-full"
              size="sm"
              onClick={handleAddMember}
              disabled={!selectedUser || adding}
            >
              {adding ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Remove Member</h3>
              <button
                onClick={() => setConfirmRemove(null)}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove this member from <strong className="text-foreground">{board?.name}</strong>?
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmRemove(null)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleRemoveMember(confirmRemove)} disabled={removing} className="flex-1">
                {removing ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
