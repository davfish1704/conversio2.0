import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = "info@trsales.net"
  const password = "admin123" // ÄNDERN! Sicheres Passwort wählen

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: "ADMIN",
    },
    create: {
      email,
      name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  })

  console.log("Admin erstellt/aktualisiert:", user.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
