"use client"

import { type ReactNode } from "react"
import SidebarNavigation from "./SidebarNavigation"
import TopBar from "./TopBar"
import CommandPalette from "./CommandPalette"
import KeyboardShortcutsModal, { useKeyboardShortcuts } from "./KeyboardShortcutsModal"
import { SidebarProvider, useSidebar } from "@/lib/SidebarContext"
import { CommandPaletteProvider } from "@/lib/CommandPaletteContext"
import EmailVerificationBanner from "@/components/ui/EmailVerificationBanner"
import { cn } from "@/lib/utils"

type User = { name?: string | null; email?: string | null; image?: string | null }

function MainContent({
  children,
  user,
  emailVerified,
}: {
  children: ReactNode
  user: User
  emailVerified: boolean
}) {
  const { collapsed } = useSidebar()
  const { shortcutsOpen, setShortcutsOpen } = useKeyboardShortcuts()

  return (
    <>
      <SidebarNavigation user={user} />

      <div
        className={cn(
          "flex flex-col min-h-screen transition-[margin] duration-200 ease-out",
          collapsed ? "md:ml-14" : "md:ml-60"
        )}
      >
        <TopBar user={user} onShortcutsToggle={() => setShortcutsOpen(true)} />

        {!emailVerified && <EmailVerificationBanner />}

        <main className="flex-1 bg-background">
          {children}
        </main>
      </div>

      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  )
}

export default function DashboardShell({
  children,
  user,
  emailVerified = true,
}: {
  children: ReactNode
  user: User
  emailVerified?: boolean
}) {
  return (
    <CommandPaletteProvider>
      <SidebarProvider>
        <div className="min-h-screen bg-background">
          <MainContent user={user} emailVerified={emailVerified}>
            {children}
          </MainContent>
          <CommandPalette />
        </div>
      </SidebarProvider>
    </CommandPaletteProvider>
  )
}
