"use client"

import { type ReactNode } from "react"
import SidebarNavigation from "./SidebarNavigation"
import { SidebarProvider, useSidebar } from "@/lib/SidebarContext"
import Footer from "@/components/layout/Footer"
import EmailVerificationBanner from "@/components/ui/EmailVerificationBanner"

type User = { name?: string | null; email?: string | null; image?: string | null }

function MainContent({ children, user, emailVerified }: { children: ReactNode; user: User; emailVerified: boolean }) {
  const { collapsed } = useSidebar()

  return (
    <>
      <SidebarNavigation user={user} />
      <main
        className={`dark:text-gray-100 min-h-screen flex flex-col transition-[margin] duration-300 ${
          collapsed ? "md:ml-16" : "md:ml-60"
        }`}
      >
        {!emailVerified && <EmailVerificationBanner />}
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </main>
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
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] transition-colors">
        <MainContent user={user} emailVerified={emailVerified}>{children}</MainContent>
      </div>
    </SidebarProvider>
  )
}
