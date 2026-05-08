import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AdminNotificationsContent from "./AdminNotificationsContent"

export default async function AdminNotificationsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  return <AdminNotificationsContent />
}
