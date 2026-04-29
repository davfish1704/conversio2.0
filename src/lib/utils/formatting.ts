/**
 * Shared formatting utilities to avoid duplication across components
 */

export function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-teal-100 text-teal-700",
  "bg-cyan-100 text-cyan-700",
  "bg-sky-100 text-sky-700",
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-fuchsia-100 text-fuchsia-700",
]

export function getAvatarColor(phone: string): string {
  return AVATAR_COLORS[hashString(phone) % AVATAR_COLORS.length]
}

export function getInitials(name: string | null): string {
  if (!name) return "?"
  return name.slice(0, 2).toUpperCase()
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.startsWith("49") && cleaned.length > 10) {
    return `+49 ${cleaned.slice(2, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8)}`
  }
  return phone
}

export function formatTime(dateStr: string, language: string = "en"): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (diffMin < 1) return language === "de" ? "gerade" : "just now"
  if (diffMin < 60) return `${diffMin}m`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`
  return `${Math.floor(diffMin / 1440)}d`
}

export function formatRelativeTime(dateStr: string, language: string = "en"): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (language === "de") {
    if (diffMin < 1) return "gerade eben"
    if (diffMin < 60) return `vor ${diffMin} Min.`
    if (diffHour < 24) return `vor ${diffHour} Std.`
    if (diffDay === 1) return "vor 1 Tag"
    return `vor ${diffDay} Tagen`
  }

  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay === 1) return "1 day ago"
  return `${diffDay} days ago`
}
