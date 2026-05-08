import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import DashboardShell from "@/components/layout/DashboardShell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const userDetails = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  })
  const emailVerified = !!userDetails?.emailVerified

  return (
    <DashboardShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      emailVerified={emailVerified}
    >
      {children}
    </DashboardShell>
  )
}
