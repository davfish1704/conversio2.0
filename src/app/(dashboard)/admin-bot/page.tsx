import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AdminBotContent from "./AdminBotContent"

export default async function AdminBotPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return <AdminBotContent />
}
