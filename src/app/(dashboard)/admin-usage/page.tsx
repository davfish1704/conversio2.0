import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AdminUsageContent from "./AdminUsageContent"

export default async function AdminUsagePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  return <AdminUsageContent />
}
