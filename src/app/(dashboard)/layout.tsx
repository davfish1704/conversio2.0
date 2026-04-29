import { auth } from "@/auth"
import { redirect } from "next/navigation"
import TopNavigation from "@/components/layout/TopNavigation"
import Footer from "@/components/layout/Footer"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] transition-colors flex flex-col">
      <TopNavigation
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
      />
      <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto dark:text-gray-100 flex-1 w-full">
        {children}
      </main>
      <Footer />
    </div>
  )
}
