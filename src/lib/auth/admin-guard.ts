import { prisma } from "@/lib/db"

export class AdminAccessError extends Error {
  constructor(message = "Forbidden") {
    super(message)
    this.name = "AdminAccessError"
  }
}

export async function requireAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  })
  if (!user || user.role !== "ADMIN") throw new AdminAccessError("Forbidden")
  return user
}
