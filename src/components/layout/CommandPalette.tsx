"use client"

import { useEffect, useState, useCallback, useContext } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  KanbanSquare,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Sun,
  Moon,
  Bot,
  Coins,
  ExternalLink,
} from "lucide-react"
import { signOut } from "next-auth/react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useCommandPalette } from "@/lib/CommandPaletteContext"
import { useTheme } from "@/lib/ThemeContext"
import { LanguageContext } from "@/lib/LanguageContext"

interface Board { id: string; name: string }

export default function CommandPalette() {
  const { open, setOpen } = useCommandPalette()
  const { theme, toggleTheme } = useTheme()
  const { t } = useContext(LanguageContext)
  const router = useRouter()
  const [boards, setBoards] = useState<Board[]>([])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setOpen])

  useEffect(() => {
    if (open && boards.length === 0) {
      fetch("/api/boards")
        .then((r) => r.json())
        .then((d) => setBoards((d.boards || []).filter((b: Board & { isActive: boolean }) => b.isActive)))
        .catch(() => {})
    }
  }, [open, boards.length])

  const run = useCallback((fn: () => void) => {
    setOpen(false)
    fn()
  }, [setOpen])

  const go = useCallback((href: string) => {
    run(() => router.push(href))
  }, [run, router])

  const mainNav = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: t("nav.reports") || "Berichte", href: "/reports", icon: BarChart3 },
    { label: t("nav.team") || "Team", href: "/team", icon: Users },
    { label: "Einstellungen", href: "/settings", icon: Settings },
    { label: "Admin Bot", href: "/admin-bot", icon: Bot },
    { label: "Token-Nutzung", href: "/admin-usage", icon: Coins },
  ]

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Suchen oder navigieren…" />
      <CommandList>
        <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {mainNav.map((item) => (
            <CommandItem key={item.href} onSelect={() => go(item.href)}>
              <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {boards.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Boards">
              {boards.map((board) => (
                <CommandItem key={board.id} onSelect={() => go(`/boards/${board.id}`)}>
                  <KanbanSquare className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  <span>{board.name}</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Aktionen">
          <CommandItem onSelect={() => run(toggleTheme)}>
            {theme === "dark" ? (
              <Sun className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            ) : (
              <Moon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            )}
            <span>{theme === "dark" ? "Helles Design" : "Dunkles Design"}</span>
          </CommandItem>
          <CommandItem
            onSelect={() => run(() => signOut({ callbackUrl: "/login" }))}
            className="text-destructive data-[selected=true]:text-destructive data-[selected=true]:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>Abmelden</span>
            <CommandShortcut>⌘⇧Q</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
