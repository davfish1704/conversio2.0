import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const EMAIL = process.env.TEST_USER_EMAIL ?? "e2e@test.local"
const PASSWORD = process.env.TEST_USER_PASSWORD ?? "TestPass123!"
const TEAM_SLUG = "e2e-test-team"

async function main() {
  const pw = await bcrypt.hash(PASSWORD, 10)

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { password: pw },
    create: {
      email: EMAIL,
      name: "E2E Test User",
      password: pw,
      emailVerified: new Date(),
    },
  })
  console.log("E2E User:", user.id, user.email)

  const team = await prisma.team.upsert({
    where: { slug: TEAM_SLUG },
    update: {},
    create: {
      name: "E2E Test Team",
      slug: TEAM_SLUG,
      ownerId: user.id,
    },
  })
  console.log("E2E Team:", team.id)

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user.id } },
    update: {},
    create: {
      teamId: team.id,
      userId: user.id,
      role: "ADMIN",
    },
  })

  console.log("\nE2E-Seed abgeschlossen.")
  console.log(`Login: ${EMAIL} / ${PASSWORD}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
