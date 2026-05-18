"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Kbd } from "@/components/ui/kbd"

interface ShortcutGroup {
  title: string
  items: { keys: string[]; description: string }[]
}

const GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    items: [
      { keys: ["⌘", "K"], description: "Command Palette öffnen" },
      { keys: ["?"], description: "Shortcuts anzeigen (dieses Modal)" },
      { keys: ["⌘", "1"], description: "Zum Dashboard" },
      { keys: ["⌘", "2"], description: "Zu den Boards" },
    ],
  },
  {
    title: "Pipeline (Kanban)",
    items: [
      { keys: ["J"], description: "Nächste Karte" },
      { keys: ["K"], description: "Vorherige Karte" },
      { keys: ["H"], description: "Vorherige Spalte" },
      { keys: ["L"], description: "Nächste Spalte" },
      { keys: ["Enter"], description: "Lead-Detail öffnen" },
    ],
  },
  {
    title: "Allgemein",
    items: [
      { keys: ["⌘", "⇧", "Q"], description: "Abmelden" },
      { keys: ["Escape"], description: "Modal / Drawer schließen" },
    ],
  },
]

export function useKeyboardShortcuts() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
        e.preventDefault()
        setOpen((p) => !p)
      }
      if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open])

  return { shortcutsOpen: open, setShortcutsOpen: setOpen }
}

export default function KeyboardShortcutsModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-bg-elevated border border-border rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-text-primary">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Groups */}
        <div className="overflow-y-auto p-4 space-y-4">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-widest mb-2">{group.title}</p>
              <div className="space-y-1.5">
                {group.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-text-primary">{item.description}</span>
                    <Kbd keys={item.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-border text-[10px] text-text-tertiary text-center shrink-0">
          Drücke <Kbd keys={["?"]} /> um dieses Modal jederzeit zu öffnen
        </div>
      </div>
    </div>
  )
}
